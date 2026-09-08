---
name: roblox-20-moderation-compliance
description: "Rige la moderación, privacidad y cumplimiento legal normativo (skills 371-385): Cuestionario de Madurez de Contenido (Content Maturity Rating), divulgación obligatoria de probabilidades en cajas de botín (Lootbox Odds Disclosure), cumplimiento GDPR y Derecho al Olvido (Right-to-Erasure) con purga de DataStore y MemoryStore en menos de 30 días, moderación de texto generado por usuarios y protección de menores. Úsala al auditar cumplimiento normativo, implementar políticas de privacidad o preparar experiencias para publicación comercial en Roblox."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Moderation, Privacy & Compliance"
  range: "371-385"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-20-moderation-compliance — Moderación, Privacidad y Cumplimiento Normativo (Skills 371 - 385)

Este módulo rige la conformidad legal, protección de menores (COPPA/GDPR/CCPA), moderación autoritativa de contenido y directrices de transparencia comercial requeridas para operar comercialmente en el ecosistema de Roblox en 2026.

## Principio Fundamental: Privacidad por Diseño y Cumplimiento Proactivo
La privacidad y la seguridad de los usuarios son requisitos no negociables. Los desarrolladores tienen la obligación legal y técnica de purgar datos de usuarios ante solicitudes de Derecho al Olvido (*Right to Erasure*) en menos de 30 días, divulgar probabilidades exactas en mecánicas aleatorias de pago y someter todo contenido generado por el usuario a las APIs de moderación oficiales.

---

## Catálogo de Habilidades Técnicas

### 371. `compliance-content-maturity-rating-alignment`
- **Regla:** Alinear las mecánicas de la experiencia con las categorías declaradas en el Cuestionario de Madurez de Contenido de Roblox (Todas las edades, 9+, 13+, 17+), asegurando que la intensidad de violencia, sangre o crudeza no sobrepase la categoría asignada.
- **Estándar:**
```luau
--!strict
export type MaturityConfig = {
    Rating: "All" | "9+" | "13+" | "17+",
    AllowBloodVFX: boolean,
    AllowFearElements: boolean,
}

local currentMaturity: MaturityConfig = {
    Rating = "13+",
    AllowBloodVFX = false, -- Desactivar sangre explícita para mantener clasificación amplia
    AllowFearElements = true,
}

local function canRenderBlood(): boolean
    return currentMaturity.AllowBloodVFX
end
```

### 372. `compliance-lootbox-odds-disclosure-ui`
- **Regla:** Toda mecánica aleatoria que involucre gasto de Robux o divisas adquiribles debe mostrar de manera prominente y accesible el porcentaje exacto de probabilidad de cada recompensa antes del intento.
```luau
--!strict
export type LootboxReward = {
    ItemId: string,
    DisplayName: string,
    ProbabilityPercentage: number,
}

local MysteryChestOdds: { LootboxReward } = {
    { ItemId = "iron_sword", DisplayName = "Espada de Hierro", ProbabilityPercentage = 70.0 },
    { ItemId = "shadow_dagger", DisplayName = "Daga Sombría", ProbabilityPercentage = 25.0 },
    { ItemId = "celestial_bow", DisplayName = "Arco Celestial", ProbabilityPercentage = 5.0 },
}

local function formatOddsForDisplay(rewards: { LootboxReward }): string
    local lines = {}
    for _, reward in ipairs(rewards) do
        table.insert(lines, `{reward.DisplayName}: {reward.ProbabilityPercentage}%`)
    end
    return table.concat(lines, "\n")
end
```

### 373. `compliance-gdpr-erasure-open-cloud-architecture`
- **Regla:** Implementar la arquitectura de procesamiento para solicitudes de Derecho al Olvido (*Right-to-Erasure*) emitidas por Roblox Open Cloud o mensajes de soporte de la plataforma.
```luau
--!strict
export type ErasureRequest = {
    UserId: number,
    RequestTimestamp: number,
}

local function logErasureRequest(request: ErasureRequest)
    print(`[Cumplimiento GDPR] Solicitud de purga recibida para UserId: {request.UserId}`)
end
```

### 374. `compliance-datastore-user-data-purge`
- **Regla:** Purgar completamente todos los registros persistentes (`DataStore:RemoveAsync()`) de un `userId` en todos los almacenes de datos del juego en un plazo improrrogable inferior a 30 días tras la notificación.
```luau
--!strict
local DataStoreService = game:GetService("DataStoreService")

local storesToPurge = {
    "PlayerData_V1",
    "PlayerInventory_V1",
    "PlayerSettings_V1",
}

local function purgeUserDataFromStores(userId: number): boolean
    local allSuccess = true
    local userKey = "User_" .. tostring(userId)

    for _, storeName in ipairs(storesToPurge) do
        local store = DataStoreService:GetDataStore(storeName)
        local success, err = pcall(function()
            store:RemoveAsync(userKey)
        end)

        if not success then
            warn(`[GDPR] Fallo al purgar {userKey} de {storeName}: {tostring(err)}`)
            allSuccess = false
        end
    end

    return allSuccess
end
```

### 375. `compliance-memorystore-cache-eviction`
- **Regla:** Eliminar de inmediato cualquier clave asociada al usuario en tablas hash y colas de `MemoryStoreService` durante la ejecución de una purga de datos.
```luau
--!strict
local MemoryStoreService = game:GetService("MemoryStoreService")

local function evictUserFromMemoryStore(userId: number)
    local sessionMap = MemoryStoreService:GetHashMap("ActiveSessions")
    pcall(function()
        sessionMap:RemoveAsync(tostring(userId))
    end)
end
```

### 376. `compliance-policy-service-social-link-restrictions`
- **Regla:** Consultar `PolicyService` y bloquear enlaces externos o menciones a redes sociales para jugadores menores de 13 años o en jurisdicciones con prohibición expresa.
```luau
--!strict
local PolicyService = game:GetService("PolicyService")

local function areExternalLinksAllowed(player: Player): boolean
    local success, policy = pcall(function()
        return PolicyService:GetPolicyInfoForPlayerAsync(player)
    end)

    if success and policy then
        local links = policy.AllowedExternalLinkReferences
        return links ~= nil and #links > 0
    end

    return false
end
```

### 377. `compliance-policy-service-trading-restrictions`
- **Regla:** Respetar las directrices de comercio verificando las restricciones de intercambio de objetos con valor percibido según la configuración jurisdiccional devuelta por `PolicyService`.
```luau
--!strict
local PolicyService = game:GetService("PolicyService")

local function canPlayerTradePaidItems(player: Player): boolean
    local success, policy = pcall(function()
        return PolicyService:GetPolicyInfoForPlayerAsync(player)
    end)

    if success and policy then
        return policy.ArePaidRandomItemsRestricted == false
    end

    return false
end
```

### 378. `moderation-user-generated-text-validation`
- **Regla:** Todo texto escrito por usuarios destinado a almacenamiento persistente o visualización compartida (ej. nombres de mascotas, letreros de casas) debe ser filtrado en el servidor con `TextService:FilterStringAsync()`.
```luau
--!strict
local TextService = game:GetService("TextService")

local function filterCustomEntityName(rawName: string, creatorUserId: number): string?
    local success, filterResult = pcall(function()
        return TextService:FilterStringAsync(rawName, creatorUserId)
    end)

    if success and filterResult then
        local broadcastSuccess, cleanText = pcall(function()
            return filterResult:GetNonChatStringForBroadcastAsync()
        end)
        if broadcastSuccess then
            return cleanText
        end
    end

    return nil
end
```

### 379. `moderation-image-asset-moderation-check`
- **Regla:** Verificar la carga segura de imágenes subidas por usuarios con `ContentProvider:PreloadAsync()`, asegurando que no se muestren assets rechazados por los filtros de Roblox.
```luau
--!strict
local ContentProvider = game:GetService("ContentProvider")

local function verifyImageAsset(assetId: string): boolean
    local success = pcall(function()
        ContentProvider:PreloadAsync({ assetId })
    end)
    return success
end
```

### 380. `compliance-prohibited-content-guardrails`
- **Regla:** Prohibir de forma terminante en la experiencia mecánicas de apuestas con dinero real, discriminación, apología de autolesiones o sustancias ilegales conforme a los Estándares de la Comunidad.
```luau
--!strict
-- Validación de términos prohibidos conocidos para feedback inmediato previo a la API oficial
local function isProhibitedContentLocalCheck(input: string): boolean
    local normalized = string.lower(input)
    -- Los filtros de Roblox son la autoridad final; los checks locales solo son informativos
    return string.find(normalized, "casino_real_money") ~= nil
end
```

### 381. `compliance-child-safety-chat-protections`
- **Regla:** Prohibir cualquier solicitud o almacenamiento de Información de Identificación Personal (PII: correos electrónicos, números telefónicos, domicilios reales, edades o redes sociales privadas).
```luau
--!strict
local function rejectPIIAttempts(input: string): boolean
    -- Comprobación heurística de patrones de números telefónicos o emails
    local hasEmailPattern = string.find(input, "[%w._%+-]+@[%w.-]+%.%w+") ~= nil
    return hasEmailPattern
end
```

### 382. `compliance-audio-copyright-compliance`
- **Regla:** Utilizar exclusivamente sonidos provistos por el catálogo oficial de Roblox o pistas compuestas con derechos comerciales verificados.
```luau
--!strict
local function isSoundAssetLicensed(soundAssetId: string): boolean
    -- Los IDs de catálogo oficial o creados bajo la organización autorizada son válidos
    return string.sub(soundAssetId, 1, 13) == "rbxassetid://"
end
```

### 383. `compliance-virtual-economy-real-world-trading-ban`
- **Regla:** Prohibir y sancionar cualquier sistema de intercambio dentro del juego que promueva pagos con dinero real fuera de las pasarelas oficiales de Roblox (DevEx).
```luau
--!strict
local function sanitizeTradeTransaction(priceInRobux: number): boolean
    return priceInRobux >= 0 -- Solo divisas internas o Robux oficiales permitidos
end
```

### 384. `compliance-audit-log-retention-limit`
- **Regla:** Limitar la retención de registros de auditoría y telemetría que contengan identificadores de usuario a un máximo estricto de 90 días, purgando datos antiguos periódicamente.
```luau
--!strict
local MAX_LOG_RETENTION_SECONDS = 90 * 24 * 60 * 60

local function isLogEntryExpired(entryTimestamp: number): boolean
    return (os.time() - entryTimestamp) > MAX_LOG_RETENTION_SECONDS
end
```

### 385. `compliance-automated-safety-incident-reporting`
- **Regla:** Proveer un mecanismo en el juego para que los jugadores reporten comportamientos tóxicos o exploiters directamente a los administradores del juego, facilitando la moderación manual.
```luau
--!strict
export type SafetyReport = {
    ReporterUserId: number,
    ReportedUserId: number,
    Reason: string,
    Timestamp: number,
}

local function submitSafetyReport(report: SafetyReport)
    print(`[Seguridad] Reporte registrado contra {report.ReportedUserId} por motivo: {report.Reason}`)
end
```

---

## Reglas Inviolables

1. **Purga Mandatoria en Menos de 30 Días (GDPR / CCPA):** Las notificaciones de Derecho al Olvido recibidas a través de Roblox Open Cloud o soporte deben eliminar permanentemente todos los registros del `userId` en DataStores y MemoryStores.
2. **Divulgación de Probabilidades de Cajas de Botín:** Es obligatorio mostrar el porcentaje exacto de probabilidad de cada recompensa antes de que el jugador realice una compra que involucre azar.
3. **Prohibición Total de PII:** Está terminantemente prohibido almacenar, solicitar o procesar nombres reales, correos electrónicos, números telefónicos o cualquier dato de identificación personal.
4. **Respeto a las Políticas Jurisdiccionales de PolicyService:** Toda experiencia que incluya mecánicas de pago aleatorio o enlaces sociales debe consultar `PolicyService` y bloquear el acceso a usuarios restringidos.
5. **Filtrado Universal de Contenido de Usuario:** Ningún texto generado por un usuario puede mostrarse a otros jugadores sin haber sido filtrado en el servidor con `TextService`.
