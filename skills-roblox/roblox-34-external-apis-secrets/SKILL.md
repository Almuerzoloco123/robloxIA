---
name: roblox-34-external-apis-secrets
description: "Gobierna la integración con APIs externas, gestión de secretos y Open Cloud en Roblox (skills 581-595): consumo seguro de HttpService (RequestAsync, JSONEncode, JSONDecode), control de cuota estricta (500 req/min por servidor), backoff exponencial con jitter, patrón Circuit Breaker, inyección de credenciales con HttpService:GetSecret(), comunicación con Open Cloud (DataStores, MessagingService) y degradación elegante ante caídas de red. Úsala al conectar experiencias con servidores web, dashboards de administración, analíticas o microservicios."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "External APIs, Secrets & Open Cloud"
  range: "581-595"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-34-external-apis-secrets — APIs Externas, Secretos y Open Cloud (Skills 581 - 595)

Este módulo establece los estándares de ingeniería para la comunicación segura y de alto rendimiento entre servidores de Roblox y servicios web externos bajo Luau 2026.

## Catálogo de Habilidades Técnicas

### 581. `api-httpservice-request-async-wrapper`
- **Regla:** Toda comunicación HTTP debe canalizarse mediante un wrapper tipado alrededor de `HttpService:RequestAsync()`, nunca con los métodos legados `GetAsync` o `PostAsync`.
- **Ejemplo:**
  ```luau
  --!strict
  local HttpService = game:GetService("HttpService")

  export type HttpResponse<T> = {
      success: boolean,
      statusCode: number,
      data: T?,
      error: string?,
  }

  local function safeHttpRequest<T>(url: string, method: "GET" | "POST", body: string?, headers: { [string]: string }?): HttpResponse<T>
      local options = {
          Url = url,
          Method = method,
          Headers = headers or { ["Content-Type"] = "application/json" },
          Body = body,
      }

      local ok, rawResponse = pcall(function()
          return HttpService:RequestAsync(options)
      end)

      if not ok or not rawResponse then
          return { success = false, statusCode = 0, error = tostring(rawResponse) }
      end

      if rawResponse.StatusCode >= 200 and rawResponse.StatusCode < 300 then
          local parseOk, parsedData = pcall(function()
              return HttpService:JSONDecode(rawResponse.Body) :: T
          end)
          if parseOk then
              return { success = true, statusCode = rawResponse.StatusCode, data = parsedData }
          else
              return { success = false, statusCode = rawResponse.StatusCode, error = "JSON decode failure" }
          end
      end

      return { success = false, statusCode = rawResponse.StatusCode, error = rawResponse.StatusMessage }
  end
  ```

### 582. `api-json-safe-encode-decode`
- **Regla:** Serializar y deserializar cadenas JSON obligatoriamente dentro de un bloque `pcall` para amortiguar datos corruptos o valores cíclicos que harían colapsar el hilo.
- **Ejemplo:**
  ```luau
  --!strict
  local HttpService = game:GetService("HttpService")

  local function safeJsonDecode(jsonString: string): (boolean, any)
      return pcall(function()
          return HttpService:JSONDecode(jsonString)
      end)
  end

  local function safeJsonEncode(value: any): (boolean, string?)
      return pcall(function()
          return HttpService:JSONEncode(value)
      end)
  end
  ```

### 583. `api-secrets-management-open-cloud`
- **Regla:** Prohibido escribir claves de autenticación o tokens directamente en el código. Acceder a secretos mediante la API oficial de Roblox `HttpService:GetSecret()`.
- **Ejemplo:**
  ```luau
  --!strict
  local HttpService = game:GetService("HttpService")

  local function getApiSecret(secretName: string): Secret?
      local ok, secret = pcall(function()
          return HttpService:GetSecret(secretName)
      end)
      return if ok and secret then secret else nil
  end
  ```

### 584. `api-rate-limit-token-bucket`
- **Regla:** Mantener un limitador Token Bucket que garantice no superar el límite de 500 peticiones por minuto por servidor (server instance) impuesto por el motor de Roblox (equivalente a un gasto medio $\le 8$ peticiones/seg).
- **Ejemplo:**
  ```luau
  --!strict
  local MAX_CAPACITY = 450 -- Margen de seguridad sobre el límite de 500
  local REFILL_RATE_PER_SEC = 7.5
  local tokens = MAX_CAPACITY
  local lastRefill = os.clock()

  local function consumeHttpToken(): boolean
      local now = os.clock()
      local delta = now - lastRefill
      lastRefill = now
      tokens = math.min(MAX_CAPACITY, tokens + delta * REFILL_RATE_PER_SEC)

      if tokens >= 1 then
          tokens -= 1
          return true
      end
      return false
  end
  ```

### 585. `api-exponential-backoff-jitter`
- **Regla:** En peticiones que fallen por errores transitorios (código 429 o 503), aplicar reintentos con retraso exponencial incrementado con variación aleatoria (*Full Jitter*): $t_{espera} = \text{random}(0, \min(\text{cap}, \text{base} \times 2^{intento}))$.
- **Ejemplo:**
  ```luau
  --!strict
  local function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number
      local temp = math.min(maxDelay, baseDelay * (2 ^ attempt))
      return math.random() * temp
  end
  ```

### 586. `api-circuit-breaker-pattern`
- **Regla:** Si una API externa falla 5 veces consecutivas, el circuito entra en estado `OPEN` durante 60 segundos, rechazando peticiones inmediatamente sin invocar `HttpService` para no ralentizar el servidor.
- **Ejemplo:**
  ```luau
  --!strict
  export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

  local circuitState: CircuitState = "CLOSED"
  local consecutiveFailures = 0
  local openTimestamp = 0

  local function canExecuteRequest(): boolean
      local now = os.clock()
      if circuitState == "OPEN" then
          if now - openTimestamp >= 60 then
              circuitState = "HALF_OPEN"
              return true
          end
          return false
      end
      return true
  end
  ```

### 587. `api-payload-hash-signature-verification`
- **Regla:** Firmar las cargas salientes de alta seguridad adjuntando un hash en los encabezados HTTP para que el backend externo verifique que la solicitud proviene de un servidor oficial de Roblox.
- **Ejemplo:**
  ```luau
  --!strict
  local function createSignatureHeader(payloadJson: string, secretKey: string): { [string]: string }
      -- En Luau, computar hash criptográfico o enviar token preacordado de origen
      return {
          ["Content-Type"] = "application/json",
          ["X-Roblox-Place-Id"] = tostring(game.PlaceId),
          ["X-Roblox-Job-Id"] = game.JobId,
      }
  end
  ```

### 588. `api-discord-webhook-rate-safeguards`
- **Regla:** Prohibido contactar los webhooks de Discord directamente desde servidores de Roblox sin pasar por un servidor proxy amortiguador, previniendo baneos de rangos de IP de Roblox.
- **Ejemplo:**
  ```luau
  --!strict
  -- Uso exclusivo de URL de proxy de confianza
  local PROXY_WEBHOOK_URL = "https://discord-proxy.mi-estudio.com/api/webhooks/roblox"

  local function dispatchLogToDiscordProxy(message: string)
      -- Envío al proxy seguro
  end
  ```

### 589. `api-open-cloud-datastore-sync`
- **Regla:** Las operaciones que interactúan con las APIs REST de Open Cloud DataStores deben procesar códigos de estado `ETag` para control de concurrencia optimista y evitar sobreescrituras en caliente.
- **Ejemplo:**
  ```luau
  --!strict
  -- Formato de encabezado requerido para escrituras concurrentes de Open Cloud
  local function getOpenCloudHeaders(apiKey: string, lastETag: string?): { [string]: string }
      local headers = {
          ["x-api-key"] = apiKey,
          ["Content-Type"] = "application/json",
      }
      if lastETag then
          headers["if-match"] = lastETag
      end
      return headers
  end
  ```

### 590. `api-open-cloud-messaging-publish`
- **Regla:** Al recibir mensajes desde Open Cloud vía `MessagingService`, sanitizar los parámetros y verificar que la marca temporal (*timestamp*) sea reciente para evitar ataques de repetición (*replay attacks*).
- **Ejemplo:**
  ```luau
  --!strict
  local MessagingService = game:GetService("MessagingService")

  local function subscribeToCloudTopic(topicName: string, onMessageReceived: (any) -> ())
      pcall(function()
          MessagingService:SubscribeAsync(topicName, function(message)
              local data = message.Data
              local sentTime = message.Sent
              if os.time() - sentTime <= 30 then -- Mensaje vigente
                  onMessageReceived(data)
              end
          end)
      end)
  end
  ```

### 591. `api-response-caching-ttl`
- **Regla:** Cachear en memoria las respuestas de consultas idempotentes durante un tiempo de vida (*TTL* de al menos 30 a 60 segundos) para mitigar el consumo de llamadas salientes.
- **Ejemplo:**
  ```luau
  --!strict
  export type CacheEntry = { data: any, expiresAt: number }
  local localCache: { [string]: CacheEntry } = {}

  local function getWithCache(cacheKey: string, ttlSeconds: number, fetcher: () -> any): any
      local cached = localCache[cacheKey]
      local now = os.clock()
      if cached and now < cached.expiresAt then
          return cached.data
      end

      local freshData = fetcher()
      localCache[cacheKey] = { data = freshData, expiresAt = now + ttlSeconds }
      return freshData
  end
  ```

### 592. `api-url-sanitization-query-builder`
- **Regla:** Toda cadena de consulta con parámetros dinámicos debe escapar sus valores utilizando `HttpService:UrlEncode()` para neutralizar inyecciones de parámetros y caracteres ilícitos.
- **Ejemplo:**
  ```luau
  --!strict
  local HttpService = game:GetService("HttpService")

  local function buildSafeUrl(baseUrl: string, queryParams: { [string]: string }): string
      local parts = {}
      for key, value in queryParams do
          table.insert(parts, `{HttpService:UrlEncode(key)}={HttpService:UrlEncode(value)}`)
      end
      return `{baseUrl}?{table.concat(parts, "&")}`
  end
  ```

### 593. `api-batch-aggregation-pipeline`
- **Regla:** Acumular eventos de analítica y telemetría en una cola en memoria y enviarlos en un único lote periódico cada 30 segundos, reduciendo drásticamente las peticiones unitarias.
- **Ejemplo:**
  ```luau
  --!strict
  local telemetryBuffer: { any } = {}

  local function enqueueTelemetry(eventData: any)
      table.insert(telemetryBuffer, eventData)
      if #telemetryBuffer >= 50 then
          -- Despachar lote completo
      end
  end
  ```

### 594. `api-external-ban-list-sync`
- **Regla:** La sincronización de listas negras desde servidores externos debe guardarse en `MemoryStoreService` con una expiración de 10 minutos, asegurando que todos los servidores del cluster compartan la misma información sin peticiones duplicadas.
- **Ejemplo:**
  ```luau
  --!strict
  local MemoryStoreService = game:GetService("MemoryStoreService")
  local banCacheMap = MemoryStoreService:GetHashMap("GlobalBans")

  local function cacheBannedUser(userId: number, reason: string)
      pcall(function()
          banCacheMap:SetAsync(tostring(userId), reason, 600)
      end)
  end
  ```

### 595. `api-graceful-degradation-fallback`
- **Regla:** Diseñar todo consumo de servicios web externos bajo el principio de fallo controlado: si la API no responde, el juego debe operar con valores por defecto locales sin interrumpir la sesión del jugador.
- **Ejemplo:**
  ```luau
  --!strict
  local DEFAULT_SHOP_CATALOG = table.freeze({
      ["sword_basic"] = { price = 100, isAvailable = true },
      ["shield_basic"] = { price = 75, isAvailable = true },
  })

  local function getShopCatalog(fetchRemoteCatalog: () -> any): any
      local ok, remoteCatalog = pcall(fetchRemoteCatalog)
      if ok and remoteCatalog then
          return remoteCatalog
      else
          warn("[API] Fallo al consultar catálogo externo. Activando catálogo local predeterminado.")
          return DEFAULT_SHOP_CATALOG
      end
  end
  ```

## Reglas Inviolables

1. **Cero credenciales en código:** Queda terminantemente prohibido hardcodear API keys, contraseñas o tokens web en los scripts.
2. **Respeto absoluto a la cuota de 500 req/min:** Todo sistema debe contar con limitadores locales para no agotar la cuota de red de la experiencia.
3. **Encapsulamiento de HttpService:** Prohibido invocar `RequestAsync`, `JSONDecode` o `JSONEncode` sin envolver la llamada en `pcall`.
4. **Prohibición de webhooks de Discord directos:** Jamás apuntar peticiones HTTP directamente al dominio `discord.com`; utilizar siempre proxies intermedios amortiguadores.
5. **Principio de degradación elegante:** La indisponibilidad de un servicio web externo nunca debe bloquear la jugabilidad base ni causar crash del servidor.


---

## 🌐 Anexo: Integración con Pasarelas de Pago y Webhooks Externos
Para sistemas externos de auditoría financiera y Creator Store:
- **Gestión Segura con GetSecret:** Prohibido codificar claves de API en scripts. Usar siempre `HttpService:GetSecret()` para acceder a tokens protegidos.
- **Webhooks Seguros:** Toda notificación hacia sistemas externos (Discord, Telegram, ERPs) debe utilizar `HttpService:RequestAsync` con firmas HMAC de autenticación para prevenir suplantación.
