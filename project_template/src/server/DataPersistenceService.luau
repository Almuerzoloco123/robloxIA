--!strict
--[[
    DataPersistenceService.luau
    Transactional DataStore management with robust Session Locking, JobId tracking,
    exponential backoff retries, and clean BindToClose safety.
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
local SESSION_LOCK_TIMEOUT_SEC = 900 -- 15 minutes lease
local CURRENT_JOB_ID = game.JobId ~= "" and game.JobId or "Studio_Instance"

local DEFAULT_DATA: Types.PlayerData = {
	coins = 0,
	gems = 0,
	jumpMultiplier = 1.0,
	speedMultiplier = 1.0,
	inventory = {},
	unlockedIslands = { "SpawnIsland" },
	schemaVersion = 2,
	sessionLockTimestamp = nil,
	sessionLockJobId = nil,
}

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
	local lockAcquired = false

	local success, result = retryAsync(function()
		return PlayerDataStore:UpdateAsync(key, function(saved: any)
			local data: Types.PlayerData = saved or cloneTable(DEFAULT_DATA)

			-- Verify Session Lock ownership
			if data.sessionLockTimestamp and (now - data.sessionLockTimestamp) < SESSION_LOCK_TIMEOUT_SEC then
				-- If locked by another server, refuse acquisition
				if data.sessionLockJobId and data.sessionLockJobId ~= CURRENT_JOB_ID then
					lockAcquired = false
					return nil -- Abort update
				end
			end

			-- Acquire or refresh Lock for current server
			lockAcquired = true
			data.sessionLockTimestamp = now
			data.sessionLockJobId = CURRENT_JOB_ID
			return data
		end)
	end)

	if not success or not lockAcquired or result == nil then
		warn(string.format("[DATASTORE] Session lock denied for %s (%d). Active in another server.", player.Name, player.UserId))
		player:Kick("Tu perfil de datos está activo en otro servidor. Por favor reintenta en unos instantes.")
		return nil
	end

	local loadedData = result :: Types.PlayerData
	activeSessions[player.UserId] = loadedData
	print(string.format("[DATASTORE] Loaded profile for %s (%d) with JobId %s", player.Name, player.UserId, CURRENT_JOB_ID))
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
			local target = current or cloneTable(DEFAULT_DATA)
			-- Merge session changes into persistent state
			target.coins = data.coins
			target.gems = data.gems
			target.jumpMultiplier = data.jumpMultiplier
			target.speedMultiplier = data.speedMultiplier
			target.inventory = cloneTable(data.inventory)
			target.unlockedIslands = cloneTable(data.unlockedIslands)
			target.schemaVersion = data.schemaVersion

			if isReleasingSession then
				target.sessionLockTimestamp = nil
				target.sessionLockJobId = nil
			else
				target.sessionLockTimestamp = os.time()
				target.sessionLockJobId = CURRENT_JOB_ID
			end
			return target
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
	local players = Players:GetPlayers()
	if #players == 0 then
		return
	end

	local completed = 0
	for _, player in players do
		task.spawn(function()
			pcall(DataPersistenceService.saveData, player, true)
			completed += 1
		end)
	end

	-- Wait until saves complete or max 6 seconds to respect engine limits
	local start = os.clock()
	while completed < #players and (os.clock() - start) < 6 do
		task.wait(0.1)
	end
end)

return DataPersistenceService
