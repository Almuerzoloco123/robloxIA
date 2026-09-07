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

-- In-memory session deduplication tracker to prevent duplicate reward grants if DataStore write retries
local inSessionFulfilledReceipts: { [string]: boolean } = {}

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
	local purchaseId = receiptInfo.PurchaseId
	local playerId = receiptInfo.PlayerId
	local productId = receiptInfo.ProductId

	local recordKey = "Receipt_" .. tostring(purchaseId)

	-- 1. Check if purchase was already granted and recorded in DataStore previously
	local checkSuccess, isAlreadyGranted = pcall(function()
		local record = PurchaseHistoryStore:GetAsync(recordKey)
		return record ~= nil and record.granted == true
	end)

	if checkSuccess and isAlreadyGranted then
		print(string.format("[RECEIPT] Purchase %s was already granted and recorded. Confirming.", tostring(purchaseId)))
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	-- 2. Locate active player to grant product
	local player = Players:GetPlayerByUserId(playerId)
	if not player then
		-- Player left before fulfillment; engine will retry upon reconnect
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- 3. Execute product reward handler with session deduplication guard
	local alreadyFulfilled = inSessionFulfilledReceipts[purchaseId] == true
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

		inSessionFulfilledReceipts[purchaseId] = true
	end

	-- 4. Atomic Record in PurchaseHistoryStore AFTER reward execution
	local updateSuccess, _ = pcall(function()
		return PurchaseHistoryStore:UpdateAsync(recordKey, function(saved: any)
			return {
				purchaseId = purchaseId,
				playerId = playerId,
				productId = productId,
				timestamp = os.time(),
				granted = true,
			}
		end)
	end)

	if not updateSuccess then
		warn(string.format("[RECEIPT ERROR] DataStore record write failed for purchase %s. Requesting retry.", tostring(purchaseId)))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	print(string.format("[RECEIPT SUCCESS] Successfully processed purchase %s for player %s", tostring(purchaseId), player.Name))
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

function MonetizationService.init()
	MarketplaceService.ProcessReceipt = processReceipt
	print("[RAASE 2.0] MonetizationService initialized with idempotent transactional ProcessReceipt.")
end

MonetizationService.init()

return MonetizationService
