--!strict
--[[
    NetworkSecurityService.luau
    Zero-Trust Server-Authoritative Networking & Anti-Exploit Guardrails
--]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Types = require(ReplicatedStorage:WaitForChild("RAASE_Shared"):WaitForChild("Types") :: any)

local NetworkSecurityService = {}
NetworkSecurityService.__index = NetworkSecurityService

local tokenBuckets: { [number]: { [string]: Types.TokenBucket } } = {}

-- Ensure Remotes folder exists
local remotesFolder = ReplicatedStorage:FindFirstChild("Remotes") :: Folder
if not remotesFolder then
	remotesFolder = Instance.new("Folder")
	remotesFolder.Name = "Remotes"
	remotesFolder.Parent = ReplicatedStorage
end

-- Honeypot remote that immediately kicks unauthorized callers
local honeypotRemote = Instance.new("RemoteEvent")
honeypotRemote.Name = "AdminGiveCoins"
honeypotRemote.Parent = remotesFolder
honeypotRemote.OnServerEvent:Connect(function(player)
	warn(string.format("[SECURITY ALERT] Honeypot triggered by Player: %s (%d)", player.Name, player.UserId))
	player:Kick("Violación de integridad de red: Llamada no autorizada detectada.")
end)

-- Token Bucket Initialization
function NetworkSecurityService.initPlayer(player: Player)
	tokenBuckets[player.UserId] = {}
end

function NetworkSecurityService.cleanupPlayer(player: Player)
	tokenBuckets[player.UserId] = nil
end

-- Validate rate limit using Token Bucket algorithm
function NetworkSecurityService.checkRateLimit(player: Player, remoteName: string, cost: number?, maxTokens: number?, refillRate: number?): boolean
	local userBuckets = tokenBuckets[player.UserId]
	if not userBuckets then
		NetworkSecurityService.initPlayer(player)
		userBuckets = tokenBuckets[player.UserId]
	end

	local max = maxTokens or 20
	local refill = refillRate or 5
	local tokenCost = cost or 1
	local now = os.clock()

	local bucket = userBuckets[remoteName]
	if not bucket then
		bucket = {
			tokens = max,
			lastRefill = now,
			maxTokens = max,
			refillRatePerSec = refill,
		}
		userBuckets[remoteName] = bucket
	else
		-- Refill tokens based on elapsed time
		local elapsed = now - bucket.lastRefill
		bucket.tokens = math.min(bucket.maxTokens, bucket.tokens + (elapsed * bucket.refillRatePerSec))
		bucket.lastRefill = now
	end

	if bucket.tokens >= tokenCost then
		bucket.tokens -= tokenCost
		return true
	end

	warn(string.format("[RATE LIMIT] Player %s (%d) exceeded rate limit on %s", player.Name, player.UserId, remoteName))
	return false
end

-- Spatial Distance Validation (Euclidean magnitude check with runtime type safety & NaN rejection)
function NetworkSecurityService.validateProximity(player: Player, targetPosition: Vector3, maxDistance: number?): boolean
	if typeof(targetPosition) ~= "Vector3" then
		return false
	end

	-- Reject NaN and Infinite coordinate exploits
	if targetPosition.X ~= targetPosition.X or targetPosition.Y ~= targetPosition.Y or targetPosition.Z ~= targetPosition.Z then
		return false
	end
	if math.abs(targetPosition.X) == math.huge or math.abs(targetPosition.Y) == math.huge or math.abs(targetPosition.Z) == math.huge then
		return false
	end

	local maxDist = maxDistance or 15
	if typeof(maxDist) ~= "number" or maxDist ~= maxDist or maxDist < 0 or maxDist == math.huge then
		return false
	end

	local char = player.Character
	if not char then
		return false
	end

	local root = char:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return false
	end

	local distance = (root.Position - targetPosition).Magnitude
	return distance <= maxDist
end

-- Safe RemoteEvent Creator with built-in Token Bucket enforcement
function NetworkSecurityService.createGuardedRemote(remoteName: string): RemoteEvent
	local existing = remotesFolder:FindFirstChild(remoteName) :: RemoteEvent?
	if existing then
		return existing
	end

	local remote = Instance.new("RemoteEvent")
	remote.Name = remoteName
	remote.Parent = remotesFolder
	return remote
end

-- Attach guarded listener with Token Bucket enforcement
function NetworkSecurityService.listenGuarded(remote: RemoteEvent, callback: (player: Player, ...any) -> (), cost: number?)
	local tokenCost = cost or 1
	remote.OnServerEvent:Connect(function(player: Player, ...: any)
		if NetworkSecurityService.checkRateLimit(player, remote.Name, tokenCost) then
			callback(player, ...)
		end
	end)
end

Players.PlayerAdded:Connect(NetworkSecurityService.initPlayer)
Players.PlayerRemoving:Connect(NetworkSecurityService.cleanupPlayer)

return NetworkSecurityService
