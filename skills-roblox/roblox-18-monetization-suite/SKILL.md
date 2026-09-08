---
name: roblox-18-monetization-suite
description: "Rige la monetización comercial, economía de Robux y cumplimiento normativo (skills 341-355): MarketplaceService con ProcessReceipt idempotente, verificación de GamePass con caché en sesión, prompts de productos y suscripciones recurrentes, tienda en juego con precios dinámicos, retención de PurchaseId para auditoría y validación de PolicyService para menores y cajas de botín. Úsala al implementar pases, monedas de pago, compras dentro del juego y suscripciones en Roblox."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Monetization Suite & Commerce Compliance"
  range: "341-355"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-18-monetization-suite — Monetización, Tienda y Cumplimiento Comercial (Skills 341 - 355)

Este módulo rige la integración de compras en Roblox (`MarketplaceService`), procesamiento transaccional seguro con idempotencia, auditoría de recibos y cumplimiento estricto de las directrices de comercio y protección al consumidor en Roblox bajo Luau estricto.

## Principio Fundamental: Idempotencia y Cero Pérdida Transaccional
Una transacción de Robux nunca debe perderse ni duplicarse bajo ninguna circunstancia. El callback `ProcessReceipt` debe garantizar que una compra solo se entregue una vez mediante verificación persistente del `PurchaseId` en DataStores. Si un guardado falla, el sistema debe retornar `NotProcessedYet` para permitir que Roblox reintente el proceso.

---

## Catálogo de Habilidades Técnicas

### 341. `monetization-gamepass-owns-check-cache`
- **Regla:** Verificar la propiedad de GamePasses usando `MarketplaceService:UserOwnsGamePassAsync()` con almacenamiento en caché por sesión de jugador para evitar agotar cuotas HTTP.
- **Estándar:**
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local userPassCache: { [number]: { [number]: boolean } } = {}

local function userOwnsPassCached(userId: number, passId: number): boolean
    local playerCache = userPassCache[userId]
    if not playerCache then
        playerCache = {}
        userPassCache[userId] = playerCache
    end

    if playerCache[passId] ~= nil then
        return playerCache[passId]
    end

    local success, owns = pcall(function()
        return MarketplaceService:UserOwnsGamePassAsync(userId, passId)
    end)

    local result = if success then owns else false
    playerCache[passId] = result
    return result
end
```

### 342. `monetization-gamepass-prompt-purchase`
- **Regla:** Disparar la ventana nativa de compra de GamePass exclusivamente desde el cliente o mediante petición validada en el servidor con `MarketplaceService:PromptGamePassPurchase()`.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local function promptGamePass(player: Player, passId: number)
    MarketplaceService:PromptGamePassPurchase(player, passId)
end
```

### 343. `monetization-gamepass-finished-listener`
- **Regla:** Escuchar `MarketplaceService.PromptGamePassPurchaseFinished` en el servidor para otorgar los beneficios del pase de inmediato si la compra fue confirmada dentro del servidor en curso.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local function listenGamePassPurchase(onPassGranted: (player: Player, passId: number) -> ())
    MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player: Player, passId: number, wasPurchased: boolean)
        if wasPurchased then
            onPassGranted(player, passId)
        end
    end)
end
```

### 344. `monetization-developer-product-prompt`
- **Regla:** Abrir la compra de productos consumibles (monedas, pociones, llaves) utilizando `MarketplaceService:PromptProductPurchase()`.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local function promptDeveloperProduct(player: Player, productId: number)
    MarketplaceService:PromptProductPurchase(player, productId)
end
```

### 345. `monetization-process-receipt-idempotency`
- **Regla:** Implementar el callback canónico de `ProcessReceipt`, validando de forma persistente que el `receiptInfo.PurchaseId` no haya sido procesado previamente.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")
local DataStoreService = game:GetService("DataStoreService")
local purchaseHistoryStore = DataStoreService:GetDataStore("PurchaseHistoryV1")

export type ReceiptInfo = {
    PlayerId: number,
    PlaceIdWherePurchased: number,
    PurchaseId: string,
    ProductId: number,
    CurrencyType: Enum.CurrencyType,
    CurrencySpent: number,
}

local function isPurchaseRecorded(purchaseId: string): boolean
    local success, val = pcall(function()
        return purchaseHistoryStore:GetAsync(purchaseId)
    end)
    return success and val ~= nil
end

local function recordPurchase(purchaseId: string, userId: number): boolean
    local success = pcall(function()
        purchaseHistoryStore:SetAsync(purchaseId, {
            UserId = userId,
            Timestamp = os.time(),
        })
    end)
    return success
end
```

### 346. `monetization-process-receipt-return-enums`
- **Regla:** Retornar `Enum.ProductPurchaseDecision.PurchaseGranted` únicamente cuando los datos del jugador hayan sido guardados con éxito. En cualquier error, retornar `NotProcessedYet`.
```luau
--!strict
local function createReceiptHandler(grantReward: (player: Player, productId: number) -> boolean)
    MarketplaceService.ProcessReceipt = function(receiptInfo: ReceiptInfo): Enum.ProductPurchaseDecision
        local player = game:GetService("Players"):GetPlayerByUserId(receiptInfo.PlayerId)
        if not player then
            -- El jugador salió del servidor; reintentar cuando regrese
            return Enum.ProductPurchaseDecision.NotProcessedYet
        end

        if isPurchaseRecorded(receiptInfo.PurchaseId) then
            return Enum.ProductPurchaseDecision.PurchaseGranted
        end

        local rewardSuccess = grantReward(player, receiptInfo.ProductId)
        if not rewardSuccess then
            return Enum.ProductPurchaseDecision.NotProcessedYet
        end

        local recorded = recordPurchase(receiptInfo.PurchaseId, receiptInfo.PlayerId)
        if not recorded then
            return Enum.ProductPurchaseDecision.NotProcessedYet
        end

        return Enum.ProductPurchaseDecision.PurchaseGranted
    end
end
```

### 347. `monetization-subscription-prompt-purchase`
- **Regla:** Iniciar compras de suscripciones recurrentes con `MarketplaceService:PromptSubscriptionPurchase()`.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local function promptSubscription(player: Player, subscriptionId: string)
    pcall(function()
        MarketplaceService:PromptSubscriptionPurchase(player, subscriptionId)
    end)
end
```

### 348. `monetization-subscription-status-query`
- **Regla:** Consultar el estado de membresía o renovación activa de una suscripción mediante `MarketplaceService:GetUserSubscriptionStatusAsync(player, subscriptionId)`.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local function isSubscriptionActive(player: Player, subscriptionId: string): boolean
    local success, status = pcall(function()
        return MarketplaceService:GetUserSubscriptionStatusAsync(player, subscriptionId)
    end)

    if success and status then
        return status.IsSubscribed == true
    end

    return false
end
```

### 349. `monetization-in-game-shop-dynamic-pricing`
- **Regla:** Obtener los metadatos oficiales del catálogo (nombre, descripción, precio en Robux) dinámicamente con `MarketplaceService:GetProductInfoAsync()` (evitando el método síncrono obsoleto `GetProductInfo`) para evitar discordancias entre la UI y el precio real.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local function fetchProductDetails(assetId: number, infoType: Enum.InfoType): { [string]: any }?
    local success, info = pcall(function()
        return MarketplaceService:GetProductInfoAsync(assetId, infoType)
    end)

    return if success and typeof(info) == "table" then info else nil
end
```

### 350. `monetization-purchase-history-audit-log`
- **Regla:** Mantener un registro estructurado y fechado de cada transacción completada en el perfil del jugador para soporte al cliente y auditoría de economía.
```luau
--!strict
export type PurchaseAuditEntry = {
    PurchaseId: string,
    ProductId: number,
    RobuxSpent: number,
    Timestamp: number,
}

local function logAuditRecord(auditTrail: { PurchaseAuditEntry }, entry: PurchaseAuditEntry)
    table.insert(auditTrail, entry)
    if #auditTrail > 50 then
        table.remove(auditTrail, 1) -- Mantener tamaño acotado en perfil
    end
end
```

### 351. `monetization-policy-service-compliance`
- **Regla:** Consultar `PolicyService:GetPolicyInfoForPlayerAsync()` y ocultar de inmediato compras aleatorias (lootboxes de pago) si `ArePaidRandomItemsRestricted` es verdadero según la jurisdicción del usuario.
```luau
--!strict
local PolicyService = game:GetService("PolicyService")

local function arePaidLootboxesAllowed(player: Player): boolean
    local success, policy = pcall(function()
        return PolicyService:GetPolicyInfoForPlayerAsync(player)
    end)

    if success and policy then
        return policy.ArePaidRandomItemsRestricted == false
    end

    return false -- Fail-closed por seguridad de cumplimiento
end
```

### 352. `monetization-gifting-system-validation`
- **Regla:** En sistemas de regalos entre jugadores, verificar la presencia en el servidor y la validez del destinatario antes de solicitar el pago al emisor.
```luau
--!strict
local Players = game:GetService("Players")

local function validateGiftRecipient(targetUserId: number): boolean
    local targetPlayer = Players:GetPlayerByUserId(targetUserId)
    return targetPlayer ~= nil and targetPlayer.Parent ~= nil
end
```

### 353. `monetization-vip-premium-benefits`
- **Regla:** Detectar jugadores con membresía activa (`player.MembershipType == Enum.MembershipType.Premium`) y aplicar bonificaciones pasivas (ej. multiplicador de experiencia o monedas).
```luau
--!strict
local function applyPremiumBonuses(player: Player): number
    if player.MembershipType == Enum.MembershipType.Premium then
        return 1.25 -- 25% de bonificación
    end
    return 1.0
end
```

### 354. `monetization-anti-fraud-duplicate-guard`
- **Regla:** Deshabilitar el botón de compra en la interfaz del cliente inmediatamente tras la pulsación para prevenir compras accidentales o dobles por spam de clics.
```luau
--!strict
local function setupBuyButtonDebounce(buyButton: TextButton, onTrigger: () -> ())
    local isProcessing = false
    buyButton.Activated:Connect(function()
        if isProcessing then return end
        isProcessing = true
        buyButton.AutoButtonColor = false
        onTrigger()
        task.delay(2.5, function()
            isProcessing = false
            buyButton.AutoButtonColor = true
        end)
    end)
end
```

### 355. `monetization-purchase-failed-feedback`
- **Regla:** Escuchar el cierre o fallo de compra en el cliente para restablecer la interfaz y mostrar mensajes claros de estado sin congelar la navegación.
```luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")

local function listenPurchasePromptClosed(onClosed: () -> ())
    MarketplaceService.PromptPurchaseFinished:Connect(function(player, assetId, isPurchased)
        onClosed()
    end)
end
```

---

## Reglas Inviolables

1. **Callback Único de ProcessReceipt:** `MarketplaceService.ProcessReceipt` debe declararse y vincularse EXACTAMENTE UNA VEZ en toda la base de código. Si múltiples scripts lo declaran, el motor sobrescribirá el callback causando pérdida crítica de transacciones.
2. **Idempotencia Estricta:** Todo recibo procesado debe almacenar su `PurchaseId` en DataStore. Si un recibo con el mismo `PurchaseId` llega por segunda vez, debe responder `PurchaseGranted` de inmediato sin volver a otorgar los ítems.
3. **Respuesta Fail-Closed con `NotProcessedYet`:** Jamás retornar `PurchaseGranted` si falló la persistencia de datos o la entrega de recompensa. La única respuesta segura ante fallos es `Enum.ProductPurchaseDecision.NotProcessedYet`.
4. **Cumplimiento de Políticas Jurisdiccionales:** Es obligatorio consultar `PolicyService.ArePaidRandomItemsRestricted` antes de mostrar cualquier venta con probabilidad aleatoria.
5. **Entrega de Ítems Exclusivamente en Servidor:** El cliente jamás debe tener la capacidad de invocar directamente la entrega de una compra sin validación autoritativa en el servidor.


---

## 💳 Anexo: Comercio Directo en Creator Store y Pagos USD
Roblox habilita la venta directa en moneda fiduciaria (USD) en Creator Store:
- **Modelos y Plugins de Pago:** Distribución de activos profesionales en Creator Store con fijación de precios en USD y liquidación directa sin conversión previa a Robux.
- **Licenciamiento y Verificación:** Validación de derechos de uso y asignación segura de permisos mediante APIs oficiales de Creator Services.
