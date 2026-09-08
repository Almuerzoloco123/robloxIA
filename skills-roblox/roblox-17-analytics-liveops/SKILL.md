---
name: roblox-17-analytics-liveops
description: "Rige la telemetría, analítica de eventos y operaciones en vivo LiveOps (skills 326-340): AnalyticsService para funnels de onboarding, economías sink/source y muertes en combate, BadgeService con verificación UserHasBadgeAsync y rate-limiting, feature flags remotas con MemoryStoreService, monitoreo de FPS/frametime, muestreo de RTT/ping de red y graceful server shutdown. Úsala al medir retención, balancear economías, diagnosticar rendimiento y operar eventos en vivo en Roblox."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Analytics & LiveOps Telemetry"
  range: "326-340"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-17-analytics-liveops — Analítica, Telemetría y LiveOps (Skills 326 - 340)

Este módulo rige la recolección estandarizada de métricas de juego, embudos de conversión, telemetría de estabilidad y control dinámico de operaciones en vivo (*LiveOps*) en experiencias de Roblox bajo Luau estricto.

## Principio Fundamental: Observabilidad sin Sobrecarga
La telemetría debe proporcionar visibilidad operativa completa de la economía, rendimiento y comportamiento del usuario sin degradar la tasa de cuadros por segundo (*framerate*) ni saturar el ancho de banda del servidor o cuotas de servicios en la nube.

---

## Catálogo de Habilidades Técnicas

### 326. `analytics-onboarding-funnel-progression`
- **Regla:** Registrar el flujo secuencial del tutorial mediante `AnalyticsService:LogProgressionEvent()` para medir el punto exacto de abandono de los nuevos jugadores.
- **Estándar:**
```luau
--!strict
local AnalyticsService = game:GetService("AnalyticsService")

local function logTutorialStep(player: Player, stepName: string, stepNumber: number)
    pcall(function()
        AnalyticsService:LogProgressionEvent(
            player,
            "TutorialCategory",
            Enum.AnalyticsProgressionStatus.Complete,
            stepName,
            stepNumber
        )
    end)
end
```

### 327. `analytics-custom-events-logging`
- **Regla:** Registrar eventos personalizados estructurados utilizando `AnalyticsService:LogCustomEvent()` con parámetros normalizados y tipos consistentes.
```luau
--!strict
local AnalyticsService = game:GetService("AnalyticsService")

local function logDungeonClear(player: Player, dungeonId: string, durationSeconds: number)
    pcall(function()
        AnalyticsService:LogCustomEvent(
            player,
            "DungeonCompleted",
            1, -- Valor numérico principal
            {
                DungeonId = dungeonId,
                TimeTaken = tostring(math.floor(durationSeconds)),
            }
        )
    end)
end
```

### 328. `analytics-economy-sink-source-tracking`
- **Regla:** Rastrear el flujo de divisas virtuales (*Coins*, *Gems*) mediante `AnalyticsService:LogEconomyEvent()` diferenciando fuentes (*Source*) de sumideros (*Sink*).
```luau
--!strict
local AnalyticsService = game:GetService("AnalyticsService")

local function logCurrencyTransaction(
    player: Player,
    flowType: Enum.AnalyticsEconomyFlowType,
    currencyName: string,
    amount: number,
    currentBalance: number,
    transactionType: string,
    skuId: string
)
    pcall(function()
        AnalyticsService:LogEconomyEvent(
            player,
            flowType,
            currencyName,
            amount,
            currentBalance,
            transactionType,
            skuId
        )
    end)
end
```

### 329. `analytics-combat-death-telemetry`
- **Regla:** Registrar causas y zonas de muerte de los jugadores para identificar desbalances en jefes o áreas con dificultad desproporcionada.
```luau
--!strict
local AnalyticsService = game:GetService("AnalyticsService")

local function logPlayerDefeat(player: Player, killerId: string, zoneName: string)
    pcall(function()
        AnalyticsService:LogCustomEvent(
            player,
            "PlayerDefeat",
            1,
            {
                Killer = killerId,
                Zone = zoneName,
            }
        )
    end)
end
```

### 330. `badge-service-user-has-badge-check`
- **Regla:** Consultar obligatoriamente `BadgeService:UserHasBadgeAsync(userId, badgeId)` antes de invocar el otorgamiento de la medalla para prevenir excepciones y consumo innecesario de cuota.
```luau
--!strict
local BadgeService = game:GetService("BadgeService")

local function playerHasBadge(userId: number, badgeId: number): boolean
    local success, hasBadge = pcall(function()
        return BadgeService:UserHasBadgeAsync(userId, badgeId)
    end)

    return success and hasBadge == true
end
```

### 331. `badge-service-award-rate-limiting`
- **Regla:** Otorgar medallas mediante una cola con límite de tasa por jugador para cumplir con las cuotas de la API de Roblox.
```luau
--!strict
local BadgeService = game:GetService("BadgeService")

local function awardBadgeSafely(userId: number, badgeId: number): boolean
    local success, result = pcall(function()
        return BadgeService:AwardBadge(userId, badgeId)
    end)

    if not success then
        warn(`[BadgeService] Error otorgando badge {badgeId} a {userId}: {tostring(result)}`)
        return false
    end

    return result == true
end
```

### 332. `liveops-memorystore-feature-flags`
- **Regla:** Implementar *Feature Flags* remotas alojadas en `MemoryStoreService` con TTL y caché local de 60 segundos para activación de mecánicas sin reiniciar servidores.
```luau
--!strict
local MemoryStoreService = game:GetService("MemoryStoreService")
local flagsMap = MemoryStoreService:GetHashMap("LiveOpsFeatureFlags")

local flagCache: { [string]: { Value: boolean, Expiry: number } } = {}

local function isFeatureEnabled(flagName: string): boolean
    local now = os.clock()
    local cached = flagCache[flagName]
    if cached and cached.Expiry > now then
        return cached.Value
    end

    local success, val = pcall(function()
        return flagsMap:GetAsync(flagName)
    end)

    local isEnabled = if success and typeof(val) == "boolean" then val else false
    flagCache[flagName] = { Value = isEnabled, Expiry = now + 60 }
    return isEnabled
end
```

### 333. `liveops-ab-testing-cohort-assignment`
- **Regla:** Asignar cohortes de pruebas A/B deterministas basadas en el identificador persistente del usuario (`userId % 100`) para garantizar consistencia entre sesiones.
```luau
--!strict
export type CohortVariant = "Control" | "VariantA" | "VariantB"

local function assignABVariant(userId: number): CohortVariant
    local bucket = userId % 100
    if bucket < 50 then
        return "Control"
    elseif bucket < 75 then
        return "VariantA"
    else
        return "VariantB"
    end
end
```

### 334. `telemetry-fps-frametime-monitor`
- **Regla:** Monitorear frametime y tasa de cuadros por segundo en el cliente mediante muestras periódicas de `task.wait()` o `Stats.Workspace.Heartbeat:GetValue()`.
```luau
--!strict
local function sampleFramePerformance(): (number, number)
    local heartbeat = game:GetService("RunService").Heartbeat
    local frameCount = 0
    local accumulatedTime = 0

    while accumulatedTime < 1.0 do
        local dt = heartbeat:Wait()
        accumulatedTime += dt
        frameCount += 1
    end

    local fps = math.round(frameCount / accumulatedTime)
    local avgFrametimeMs = (accumulatedTime / frameCount) * 1000
    return fps, avgFrametimeMs
end
```

### 335. `telemetry-ping-network-rtt-sampling`
- **Regla:** Muestrear el tiempo de ida y vuelta de red (RTT / Ping) mediante timestamps sincronizados entre cliente y servidor.
```luau
--!strict
local function calculatePing(requestTimestamp: number): number
    local roundTrip = (os.clock() - requestTimestamp) * 1000
    return math.max(0, math.round(roundTrip))
end
```

### 336. `telemetry-client-error-logging-beacon`
- **Regla:** Capturar excepciones no controladas en el cliente con `ScriptContext.Error`, agregando por firma de error y aplicando rate limiting antes de reportar.
```luau
--!strict
local ScriptContext = game:GetService("ScriptContext")

local errorHistory: { [string]: number } = {}

local function listenClientErrors(onErrorLogged: (msg: string, stack: string) -> ())
    ScriptContext.Error:Connect(function(message: string, stackTrace: string)
        local now = os.clock()
        local lastTime = errorHistory[message] or 0
        if now - lastTime >= 30 then
            errorHistory[message] = now
            onErrorLogged(message, stackTrace)
        end
    end)
end
```

### 337. `liveops-dynamic-event-scheduler`
- **Regla:** Programar eventos de juego temporales (fin de semana de doble experiencia) comparando marcas de tiempo absolutas en UTC (`os.time()`).
```luau
--!strict
export type LiveEvent = {
    Name: string,
    StartTimestamp: number,
    EndTimestamp: number,
}

local function isEventActive(event: LiveEvent): boolean
    local now = os.time()
    return now >= event.StartTimestamp and now < event.EndTimestamp
end
```

### 338. `liveops-server-shutdown-message-grace`
- **Regla:** Gestionar cierres ordenados de servidores mediante `game:BindToClose()`, notificando a los jugadores y permitiendo que se guarden los datos de sesión pendientes.
```luau
--!strict
local function setupGracefulShutdown(saveAllDataSync: () -> ())
    game:BindToClose(function()
        print("[LiveOps] Servidor en proceso de apagado. Salvando datos críticos...")
        saveAllDataSync()
        task.wait(2)
    end)
end
```

### 339. `analytics-session-duration-retention`
- **Regla:** Calcular y registrar la duración de sesión del jugador al salir de la experiencia (`Players.PlayerRemoving`).
```luau
--!strict
local Players = game:GetService("Players")

local sessionStartTimes: { [number]: number } = {}

local function trackSessionLifecycle()
    Players.PlayerAdded:Connect(function(player)
        sessionStartTimes[player.UserId] = os.time()
    end)

    Players.PlayerRemoving:Connect(function(player)
        local startTime = sessionStartTimes[player.UserId]
        if startTime then
            local sessionSeconds = os.time() - startTime
            sessionStartTimes[player.UserId] = nil
            print(`[Retención] Jugador {player.UserId} finalizó sesión: {sessionSeconds}s`)
        end
    end)
end
```

### 340. `telemetry-memory-budget-health-check`
- **Regla:** Inspeccionar la memoria del servidor mediante `Stats:GetTotalMemoryUsageMb()` y disparar alertas de telemetría si el consumo supera los 4000 MB.
```luau
--!strict
local StatsService = game:GetService("Stats")

local MEMORY_ALERT_THRESHOLD_MB = 4000

local function checkServerMemoryHealth(): (number, boolean)
    local totalMemoryMb = StatsService:GetTotalMemoryUsageMb()
    local isCritical = totalMemoryMb >= MEMORY_ALERT_THRESHOLD_MB
    return totalMemoryMb, isCritical
end
```

---

## Reglas Inviolables

1. **Encapsulamiento Obligatorio con `pcall`:** Toda llamada a `AnalyticsService`, `BadgeService` y `MemoryStoreService` DEBE estar envuelta en `pcall` para no interrumpir el flujo de juego ante caídas de red externas.
2. **Verificación Previa en Badges:** Jamás invocar `AwardBadge` sin comprobar primero `UserHasBadgeAsync`. El exceso de llamadas redundantes agota las cuotas del DataModel.
3. **Fail-Safe en Feature Flags:** Todo selector de Feature Flag debe contar con un valor predeterminado seguro (*default fallback*) si el servicio de almacenamiento remoto no responde.
4. **Agrupación y Rate Limiting de Métricas:** Está prohibido emitir telemetría de analítica en bucles por cuadro (*RenderStepped* / *Heartbeat*). Los eventos deben despacharse por hitos o agregados periódicos.
5. **Aislamiento de Identificadores Personales:** Ningún evento de `AnalyticsService` o log de telemetría debe contener Información de Identificación Personal (nombres reales, contraseñas, correos electrónicos).
