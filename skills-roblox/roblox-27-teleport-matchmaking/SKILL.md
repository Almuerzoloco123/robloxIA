---
name: roblox-27-teleport-matchmaking
description: "Rige los sistemas de teletransporte, colas de matchmaking distribuido y servidores reservados (skills 476-490) en Roblox 2026: TeleportService seguro con TeleportAsync y TeleportOptions, validación estricta de TeleportInitData en servidor de destino, colas en MemoryStoreService con resolución de concurrencia y backoff exponencial, servidores reservados (ReserveServer) y recuperación ante fallos de conexión. Úsala al implementar transiciones entre lugares (cross-place), salas de emparejamiento por MMR, torneos o instancias de mazmorras privadas."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Teleportation & Matchmaking Systems"
  range: "476-490"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-27-teleport-matchmaking — Teletransporte y Sistemas de Matchmaking (Skills 476 - 490)

Este módulo establece los estándares de ingeniería para la movilidad de jugadores entre servidores y mundos (*Places*) de un universo Roblox. Cubre el uso moderno de `TeleportService:TeleportAsync`, emparejamiento de alta concurrencia mediante `MemoryStoreService`, validación de cargas útiles en servidores de destino y gestión resiliente ante fallas de red.

## Catálogo de Habilidades Técnicas

### 476. `teleport-teleport-async-options`
- **Regla:** Emplear exclusivamente la API moderna `TeleportService:TeleportAsync(placeId, players, teleportOptions)`.
- **Prohibido:** El uso de las APIs legadas obsoletas `Teleport`, `TeleportToSpawnByName` o `TeleportToPrivateServer`.
- **Ejemplo:**
  ```luau
  --!strict
  local TeleportService = game:GetService("TeleportService")

  local function teleportParty(placeId: number, players: { Player }, reservedCode: string?): (boolean, string?)
      local options = Instance.new("TeleportOptions")
      if reservedCode then
          options.ReservedServerAccessCode = reservedCode
      end

      local success, err = pcall(function()
          TeleportService:TeleportAsync(placeId, players, options)
      end)

      return success, if not success then tostring(err) else nil
  end
  ```

### 477. `teleport-reserved-server-instance`
- **Regla:** Para partidas competitivas, salas de clan o mazmorras aisladas, generar una instancia privada de servidor mediante `TeleportService:ReserveServer(placeId)`.
- **Estándar:** Almacenar el código de acceso del servidor reservado en `MemoryStoreService` con TTL acotado (máximo 30 minutos) para permitir que los miembros del grupo se unan.

### 478. `teleport-init-data-payload-validation`
- **Regla:** Los datos iniciales adjuntados en `teleportOptions:SetTeleportData()` son visibles y pueden ser manipulados por el cliente si se envían sin comprobación.
- **Estándar:** En el servidor de destino, leer los datos con `player:GetJoinData()` y NUNCA confiar en cantidades de monedas, inventario o estadísticas enviadas en el payload. Validar siempre contra el `DataStore` transaccional o firmar criptográficamente el payload.
- **Ejemplo:**
  ```luau
  --!strict
  local function extractJoinMetadata(player: Player): { [string]: any }?
      local joinData = player:GetJoinData()
      local teleportData = joinData.TeleportData
      if typeof(teleportData) == "table" then
          -- Validar únicamente metadatos no críticos (e.g. ID de partida o modo de juego)
          return teleportData
      end
      return nil
  end
  ```

### 479. `teleport-memorystore-matchmaking-queue`
- **Regla:** Para colas de emparejamiento globales entre múltiples servidores del lobby, utilizar `MemoryStoreService:GetQueue(queueName)`.
- **Estándar:** Asignar un tiempo de vida (*expiration*) estricto a las entradas (e.g. 60 segundos) para evitar acumulación de jugadores fantasma que ya se hayan desconectado.
- **Ejemplo:**
  ```luau
  --!strict
  local MemoryStoreService = game:GetService("MemoryStoreService")

  local function enqueuePlayerForMatch(queueName: string, userId: number, skillRating: number)
      local queue = MemoryStoreService:GetQueue(queueName)
      local payload = {
          userId = userId,
          rating = skillRating,
          enqueuedAt = os.time(),
      }
      -- Añadir a la cola con expiración automática de 120 segundos
      queue:AddAsync(payload, 120, skillRating)
  end
  ```

### 480. `teleport-concurrency-conflict-backoff`
- **Regla:** Al leer y reclamar jugadores en colas de `MemoryStoreService` de forma concurrente entre servidores, manejar errores de contención con reintentos y backoff exponencial con dispersión aleatoria (*jitter*).
- **Ejemplo:**
  ```luau
  --!strict
  local function fetchQueueBatchWithBackoff(queue: MemoryStoreQueue, batchSize: number): { any }?
      for attempt = 1, 3 do
          local success, items = pcall(function()
              return queue:ReadAsync(batchSize, false, 5)
          end)
          if success and items then
              return items
          end
          task.wait(0.2 * (2 ^ (attempt - 1)) + math.random() * 0.1)
      end
      return nil
  end
  ```

### 481. `teleport-party-squad-group-teleport`
- **Regla:** Para escuadrones o grupos de amigos, teletransportar a todo el conjunto de jugadores en una única llamada a `TeleportAsync` pasando la lista completa `{Player}`.
- **Propósito:** Garantizar que el motor asigne a todos los miembros de la party en la misma sala del servidor destino simultáneamente.

### 482. `teleport-custom-teleport-gui-transition`
- **Regla:** Para evitar la pantalla negra genérica o estática de teletransporte, configurar una interfaz de transición cinematográfica asignada con `teleportOptions:SetTeleportGui(guiInstance)`.
- **Estándar:** El GUI debe residir en `ReplicatedFirst` o clonarse antes de la invocación para asegurar su presentación instantánea en el cliente durante el handoff.

### 483. `teleport-failure-rollback-recovery`
- **Regla:** Conectar en el cliente y en el servidor a `TeleportService.TeleportInitFailed` para gestionar interrupciones de red o servidores llenos.
- **Acción:** Si el teletransporte falla, desbloquear la interfaz del jugador, sacarlo de la cola de espera y mostrar un aviso claro permitiendo reintentar.

### 484. `teleport-destination-server-ready-check`
- **Regla:** Al orquestar partidas competitivas con servidores reservados, consultar o registrar el estado del servidor destino en `MemoryStoreService` para verificar que el servidor receptor haya completado su arranque antes de despachar al lote de jugadores.

### 485. `teleport-cross-place-state-handoff`
- **Regla:** Antes de disparar el teletransporte hacia otro lugar del universo, invocar el guardado seguro de datos del jugador en `DataStoreService` (mediante el módulo de persistencia de perfiles y liberación ordenada de Session Locks) para evitar desincronización de inventario si el servidor receptor intenta cargar los datos antes de que el servidor emisor los persista.

### 486. `teleport-reconnect-session-recovery`
- **Regla:** Si un jugador sufre una caída de conexión o cierre de cliente durante una partida activa en un servidor reservado, almacenar temporalmente su `AccessCode` en `MemoryStoreService` indexado por su `UserId` para ofrecerle la opción de "Reconectar a la partida en curso" al volver a ingresar al lobby.

### 487. `teleport-mmr-skill-rating-brackets`
- **Regla:** El algoritmo de emparejamiento por MMR debe ampliar gradualmente la ventana de búsqueda de habilidad si el tiempo de espera en cola se prolonga:
  - $0 - 15$ s: Tolerancia $\Delta \text{MMR} \le 50$.
  - $15 - 45$ s: Tolerancia $\Delta \text{MMR} \le 150$.
  - $> 45$ s: Tolerancia $\Delta \text{MMR} \le 400$.

### 488. `teleport-rate-limit-protection`
- **Regla:** Controlar la frecuencia de invocaciones a `TeleportService`.
- **Límite:** No superar las cuotas del motor (límite de peticiones de teletransporte por servidor por minuto). Agrupar a los jugadores salientes en ráfagas planificadas en lugar de disparar teletransportes individuales cada medio segundo.

### 489. `teleport-client-teleport-lock-guard`
- **Regla:** Al iniciar la transición de teletransporte, congelar el `HumanoidRootPart.Anchored = true` del personaje y desactivar los controles de entrada del usuario en el cliente para prevenir glitches de física en los últimos fotogramas de la sesión.

### 490. `teleport-cleanup-bind-to-close-safety`
- **Regla:** En `game:BindToClose()`, si el servidor se está cerrando por mantenimiento o actualización de versión, iterar sobre todos los jugadores presentes y ejecutar un teletransporte de emergencia a un servidor alternativo del mismo universo antes de que expire el tiempo de gracia de 30 segundos.

## Reglas Inviolables

1. **Nunca usar métodos de teletransporte obsoletos:** Queda prohibido `TeleportService:Teleport()`. Utilizar exclusivamente `TeleportService:TeleportAsync()`.
2. **Nunca confiar en datos económicos en `TeleportInitData`:** Toda moneda, objeto o progreso debe validarse y leerse desde el DataStore o servicio central en el servidor de destino.
3. **Manejo obligatorio del evento `TeleportInitFailed`:** Ningún sistema de teletransporte debe quedar silencioso si falla la conexión; se debe informar al usuario y restaurar su estado local.
4. **Persistencia previa al teletransporte:** Antes de iniciar la transferencia de un jugador, persistir de manera atómica su sesión en el DataStore para prevenir duplicación o pérdida de datos.
5. **Colas de emparejamiento con TTL en MemoryStore:** Toda entrada añadida a colas o mapas de emparejamiento debe tener un tiempo de expiración estricto para no acumular registros residuales.
