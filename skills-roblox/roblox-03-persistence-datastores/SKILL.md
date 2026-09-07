---
name: roblox-03-persistence-datastores
description: "Skills 061-085: Persistencia Transaccional con DataStore, Session Locking, MemoryStore, Versionado de Esquemas y Mitigación de Pérdida de Datos."
license: MIT
metadata:
  domain: "Persistence & DataStores"
  range: "061-085"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-03-persistence-datastores — Persistencia de Datos, Transacciones y Memoria (Skills 061 - 085)

Este módulo rige el almacenamiento confiable de perfiles de jugadores, inventarios y clasificaciones en tiempo real en Roblox.

## Catálogo de Habilidades Técnicas

### 061. `datastore-update-async-transactions`
- **Regla:** Uso OBLIGATORIO de `UpdateAsync()` en lugar de `SetAsync()` para escrituras transaccionales protegidas contra race conditions concurrentes.

### 062. `datastore-exponential-backoff`
- **Regla:** Envolver llamadas a DataStore en reintentos con retraso exponencial (`delay *= 2`) ante fallos de conexión o límites de tasa.

### 063. `datastore-session-locking`
- **Regla:** Implementar candado de sesión (*Session Locking*) mediante una marca de tiempo (*lease*) de 30 minutos almacenada en la metadata del perfil. Si otro servidor intenta cargar el perfil con el candado activo, la carga se bloquea, impidiendo la duplicación de ítems por juego simultáneo.

### 064. `datastore-schema-version-migration`
- **Regla:** Incluir un campo `schemaVersion: number` en todo perfil guardado. Proveer funciones automáticas de migración para transformar estructuras antiguas hacia la versión actual sin pérdida de datos.

### 065. `datastore-budget-monitoring`
- **Regla:** Consultar `DataStoreService:GetRequestBudgetForRequestType()` antes de emitir peticiones en masa para no agotar las cuotas del servidor.

### 066. `datastore-data-compression-deflate`
- **Regla:** En inventarios densos, utilizar serialización con cadenas o buffers binarios antes de guardar para reducir el tamaño del payload bajo el límite de 4 MB.

### 067. `datastore-bind-to-close-safety`
- **Regla:** Registrar siempre un manejador `game:BindToClose()` que guarde los datos de todos los jugadores activos y libere sus candados de sesión antes de que el servidor se apague:
  ```lua
  game:BindToClose(function()
      for _, player in Players:GetPlayers() do
          task.spawn(savePlayerData, player, true)
      end
      task.wait(3)
  end)
  ```

### 068. `datastore-auto-save-rotator`
- **Regla:** Bucle de autoguardado periódico escalonado (cada 300 segundos por jugador) para minimizar la pérdida de datos ante caídas inesperadas del servidor.

### 069. `datastore-mock-unit-testing`
- **Regla:** Proveer una capa de abstracción simulada (*Mock DataStore*) para pruebas unitarias sin conexión de red.

### 070-075. `memorystore-and-cross-server`
- `memorystore-sorted-leaderboard`: Clasificaciones globales en tiempo real con `MemoryStoreService:GetSortedMap()`.
- `memorystore-queue-matchmaking`: Colas de emparejamiento distribuidas usando `MemoryStoreService:GetQueue()`.
- `messagingservice-cross-server-chat`: Anuncios y comunicación entre servidores activos.
- `datastore-gdpr-erasure-compliance`: Rutinas automáticas para cumplir con avisos de borrado de privacidad GDPR/CCPA.
- `datastore-corrupted-data-quarantine`: Detección de perfiles corruptos para evitar sobrescribir con un perfil en blanco.
