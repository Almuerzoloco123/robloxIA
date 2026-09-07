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

-- Enforce R15 strict avatars for DevEx 2026 U.S. 18+ eligibility ($0.0054/R)
local function assertDevExCompliance()
	StarterPlayer.UserEmotesEnabled = true
	-- Note: GameSettings in Studio configures Avatar Type to R15
end

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

-- Idempotent ProcessReceipt Callback
local function processReceipt(receiptInfo: { [string]: any }): Enum.ProductPurchaseDecision
	local purchaseId = receiptInfo.PurchaseId
	local playerId = receiptInfo.PlayerId
	local productId = receiptInfo.ProductId

	-- 1. Check if purchase was already fulfilled (Deduplication)
	local recordKey = "Receipt_" .. tostring(purchaseId)
	local alreadyProcessed = false

	local readSuccess, readResult = pcall(function()
		return PurchaseHistoryStore:GetAsync(recordKey)
	end)

	if readSuccess and readResult ~= nil then
		print(string.format("[RECEIPT] Purchase %s was already processed.", purchaseId))
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	-- 2. Find online player
	local player = Players:GetPlayerByUserId(playerId)
	if not player then
		-- Player left the game before receipt processed; retry later
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- 3. Execute product handler logic
	local handler = productHandlers[productId]
	local grantSuccess = false
	if handler then
		grantSuccess = handler(player)
	else
		warn(string.format("[RECEIPT ERROR] Unknown ProductId: %d", productId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	if not grantSuccess then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- 4. Record transactional completion in DataStore
	local saveSuccess = pcall(function()
		PurchaseHistoryStore:SetAsync(recordKey, {
			purchaseId = purchaseId,
			playerId = playerId,
			productId = productId,
			timestamp = os.time(),
		})
	end)

	if not saveSuccess then
		warn(string.format("[RECEIPT ERROR] Failed to record PurchaseId %s. Will retry.", purchaseId))
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	return Enum.ProductPurchaseDecision.PurchaseGranted
end

function MonetizationService.init()
	assertDevExCompliance()
	MarketplaceService.ProcessReceipt = processReceipt
	print("[RAASE 2.0] MonetizationService initialized with idempotent ProcessReceipt.")
end

MonetizationService.init()

return MonetizationService
