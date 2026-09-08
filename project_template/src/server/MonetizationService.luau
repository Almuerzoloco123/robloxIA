--!strict
--[[
    MonetizationService.luau
    DevEx 2026 Compliant Developer Product Handler & Idempotent Receipt Processing.
--]]

local MarketplaceService = game:GetService("MarketplaceService")
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterPlayer = game:GetService("StarterPlayer")

local DataPersistenceService = require(script.Parent:WaitForChild("DataPersistenceService") :: any)

local PurchaseHistoryStore = DataStoreService:GetDataStore("RAASE_PurchaseHistory_v2")

local MonetizationService = {}
MonetizationService.__index = MonetizationService

-- In-memory session deduplication tracker with timestamp for cache expiration
local inSessionFulfilledReceipts: { [string]: number } = {}
local DEDUPE_CACHE_TTL = 3600 -- 1 hour TTL for in-memory dedupe entries

local function cleanDedupeCache()
	local now = os.time()
	for pId, timestamp in pairs(inSessionFulfilledReceipts) do
		if now - timestamp > DEDUPE_CACHE_TTL then
			inSessionFulfilledReceipts[pId] = nil
		end
	end
end

-- Product Handlers Map mutating real player session state
local productHandlers: { [number]: (player: Player) -> boolean } = {
	[1001] = function(player: Player)
		local data = DataPersistenceService.getData(player)
		if data then
			data.coins += 1000
			print(string.format("[PURCHASE] Granted 1000 Coins to %s (Balance: %d)", player.Name, data.coins))
			return true
		end
		return false
	end,
	[1002] = function(player: Player)
		local data = DataPersistenceService.getData(player)
		if data then
			data.jumpMultiplier = math.min(data.jumpMultiplier + 0.5, 3.0)
			print(string.format("[PURCHASE] Granted Mega Jump Boost to %s (Multiplier: %.1f)", player.Name, data.jumpMultiplier))
			return true
		end
		return false
	end,
}

-- Idempotent ProcessReceipt Callback with Atomic Transactional Order & Retry Protection
local function processReceipt(receiptInfo: { [string]: any }): Enum.ProductPurchaseDecision
	local purchaseId = tostring(receiptInfo.PurchaseId)
	local playerId = receiptInfo.PlayerId
	local productId = receiptInfo.ProductId

	local recordKey = "Receipt_" .. purchaseId

	-- Clean expired in-memory dedupe entries
	cleanDedupeCache()

	-- 1. Check if purchase was already granted and recorded in DataStore previously
	local checkSuccess, record = pcall(function()
		return PurchaseHistoryStore:GetAsync(recordKey)
	end)

	if checkSuccess and record and record.granted == true then
		print(string.format("[RECEIPT] Purchase %s was already granted and recorded. Confirming.", purchaseId))
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	-- 2. Locate active player to grant product
	local player = Players:GetPlayerByUserId(playerId)
	if not player then
		-- Player left before fulfillment; engine will retry upon reconnect
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- 3. Persist PurchaseId record in DataStore BEFORE granting reward (prevents unrecorded grants on crash)
	local persistSuccess, _ = pcall(function()
		return PurchaseHistoryStore:UpdateAsync(recordKey, function(current: any)
			if current and current.granted == true then
				return current
			end
			return {
				purchaseId = purchaseId,
				playerId = playerId,
				productId = productId,
				timestamp = os.time(),
				granted = false, -- marked pending
			}
		end)
	end)

	if not persistSuccess then
		warn(string.format("[RECEIPT ERROR] Failed to persist initial purchase record for %s. Requesting retry.", purchaseId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- 4. Execute product reward handler with session deduplication guard
	local alreadyFulfilled = inSessionFulfilledReceipts[purchaseId] ~= nil
	if not alreadyFulfilled then
		local handler = productHandlers[productId]
		if not handler then
			warn(string.format("[RECEIPT ERROR] Unknown ProductId: %s", tostring(productId)))
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end

		local grantSuccess, grantOk = pcall(handler, player)
		if not grantSuccess or not grantOk then
			warn(string.format("[RECEIPT ERROR] Handler failed to grant product %s to %s", tostring(productId), player.Name))
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end

		inSessionFulfilledReceipts[purchaseId] = os.time()
	end

	-- 5. Atomic mark granted = true in PurchaseHistoryStore AFTER reward execution
	local updateSuccess, _ = pcall(function()
		return PurchaseHistoryStore:UpdateAsync(recordKey, function(saved: any)
			local data = saved or {
				purchaseId = purchaseId,
				playerId = playerId,
				productId = productId,
				timestamp = os.time(),
			}
			data.granted = true
			return data
		end)
	end)

	if not updateSuccess then
		warn(string.format("[RECEIPT WARN] DataStore record write failed for purchase %s. Requesting retry.", purchaseId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	print(string.format("[RECEIPT SUCCESS] Successfully processed purchase %s for player %s", purchaseId, player.Name))
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

function MonetizationService.init()
	MarketplaceService.ProcessReceipt = processReceipt
	print("[RAASE 2.0] MonetizationService initialized with idempotent transactional ProcessReceipt.")
end

MonetizationService.init()

return MonetizationService
