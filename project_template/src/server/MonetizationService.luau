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

local PurchaseHistoryStore = DataStoreService:GetDataStore("RAASE_PurchaseHistory_v2")

local MonetizationService = {}
MonetizationService.__index = MonetizationService

-- Product Handlers Map
local productHandlers: { [number]: (player: Player) -> boolean } = {
	[1001] = function(player: Player)
		print(string.format("[PURCHASE] Granting Double Coins to %s", player.Name))
		return true
	end,
	[1002] = function(player: Player)
		print(string.format("[PURCHASE] Granting Mega Jump Boost to %s", player.Name))
		return true
	end,
}

-- Idempotent ProcessReceipt Callback with Atomic Transactional Order
local function processReceipt(receiptInfo: { [string]: any }): Enum.ProductPurchaseDecision
	local purchaseId = receiptInfo.PurchaseId
	local playerId = receiptInfo.PlayerId
	local productId = receiptInfo.ProductId

	local recordKey = "Receipt_" .. tostring(purchaseId)
	local isNewPurchase = false

	-- 1. Atomic Deduplication check via UpdateAsync BEFORE granting rewards
	local updateSuccess, updateResult = pcall(function()
		return PurchaseHistoryStore:UpdateAsync(recordKey, function(saved: any)
			if saved and saved.granted == true then
				isNewPurchase = false
				return nil -- Already fulfilled, abort write
			end

			isNewPurchase = true
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
		warn(string.format("[RECEIPT] DataStore update failed for purchase %s. Requesting retry.", purchaseId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- If it was already processed previously, confirm purchase immediately
	if not isNewPurchase then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	-- 2. Locate active player to grant product
	local player = Players:GetPlayerByUserId(playerId)
	if not player then
		-- Player left before fulfillment; engine will retry upon reconnect
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- 3. Execute product reward handler
	local handler = productHandlers[productId]
	if not handler then
		warn(string.format("[RECEIPT ERROR] Unknown ProductId: %d", productId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local grantSuccess = handler(player)
	if not grantSuccess then
		warn(string.format("[RECEIPT ERROR] Handler failed to grant product %d to %s", productId, player.Name))
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
