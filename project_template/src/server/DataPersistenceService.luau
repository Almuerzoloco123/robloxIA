--!strict
--[[
    DataPersistenceService.luau
    Transactional DataStore management with Session Locking and BindToClose safety.
--]]

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Types = require(ReplicatedStorage:WaitForChild("RAASE_Shared"):WaitForChild("Types") :: any)

local PlayerDataStore = DataStoreService:GetDataStore("RAASE_PlayerData_v2")

local DataPersistenceService = {}
DataPersistenceService.__index = DataPersistenceService

local activeSessions: { [number]: Types.PlayerData } = {}
local SESSION_LOCK_TIMEOUT_SEC = 1800 -- 30 minutes

local DEFAULT_DATA: Types.PlayerData = {
	coins = 0,
	gems = 0,
	jumpMultiplier = 1.0,
	speedMultiplier = 1.0,
	inventory = {},
	unlockedIslands = { "SpawnIsland" },
	schemaVersion = 2,
	sessionLockTimestamp = nil,
}

-- Deep copy table
local function cloneTable<T>(tbl: T): T
	local result = {}
	for k, v in pairs(tbl :: any) do
		if typeof(v) == "table" then
			result[k] = cloneTable(v)
		else
			result[k] = v
		end
	end
	return (result :: any) :: T
end

-- Exponential Backoff Retry Wrapper
local function retryAsync<T>(fn: () -> T, maxRetries: number?): (boolean, T | string)
	local retries = maxRetries or 3
	local delaySec = 1

	for attempt = 1, retries do
		local success, result = pcall(fn)
		if success then
			return true, result
		end
		if attempt < retries then
			task.wait(delaySec)
			delaySec *= 2
		else
			return false, tostring(result)
		end
	end
	return false, "Max retries exceeded"
end

function DataPersistenceService.loadData(player: Player): Types.PlayerData?
	local key = "Player_" .. tostring(player.UserId)
	local now = os.time()

	local success, result = retryAsync(function()
		return PlayerDataStore:UpdateAsync(key, function(saved: any)
			local data: Types.PlayerData = saved or cloneTable(DEFAULT_DATA)

			-- Verify Session Lock
			if data.sessionLockTimestamp and (now - data.sessionLockTimestamp) < SESSION_LOCK_TIMEOUT_SEC then
				-- Session is locked by another server
				return nil
			end

			-- Acquire Lock
			data.sessionLockTimestamp = now
			return data
		end)
	end)

	if not success or result == nil then
		warn(string.format("[DATASTORE] Failed to acquire session lock for %s (%d)", player.Name, player.UserId))
		player:Kick("Tu perfil de datos está activo en otro servidor. Reintenta en unos instantes.")
		return nil
	end

	local loadedData = result :: Types.PlayerData
	activeSessions[player.UserId] = loadedData
	return loadedData
end

function DataPersistenceService.saveData(player: Player, isReleasingSession: boolean)
	local data = activeSessions[player.UserId]
	if not data then
		return
	end

	local key = "Player_" .. tostring(player.UserId)

	retryAsync(function()
		return PlayerDataStore:UpdateAsync(key, function(current: any)
			local toSave = cloneTable(data)
			if isReleasingSession then
				toSave.sessionLockTimestamp = nil
			else
				toSave.sessionLockTimestamp = os.time()
			end
			return toSave
		end)
	end)

	if isReleasingSession then
		activeSessions[player.UserId] = nil
	end
end

function DataPersistenceService.getData(player: Player): Types.PlayerData?
	return activeSessions[player.UserId]
end

-- Lifecycle Connections
Players.PlayerAdded:Connect(function(player)
	DataPersistenceService.loadData(player)
end)

Players.PlayerRemoving:Connect(function(player)
	DataPersistenceService.saveData(player, true)
end)

game:BindToClose(function()
	if RunService:IsStudio() then
		task.wait(1)
	end

	for _, player in Players:GetPlayers() do
		task.spawn(function()
			DataPersistenceService.saveData(player, true)
		end)
	end
	task.wait(3)
end)

return DataPersistenceService
