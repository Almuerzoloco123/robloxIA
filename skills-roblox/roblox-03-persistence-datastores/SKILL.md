---
name: roblox-03-persistence-datastores
description: "Rige la persistencia transaccional y DataStores en Roblox (skills 061-085): UpdateAsync idempotente, session locking anti-dupe, serialización de buffers, presupuestos de DataStore, MemoryStore ephemeral y cumplimiento GDPR. Úsala al diseñar perfiles de jugador, guardado de inventarios o migración de esquemas."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Persistence & DataStores"
  range: "061-085"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-03-persistence-datastores — Persistencia, DataStores y MemoryStore (Skills 061 - 085)

Este módulo rige la arquitectura de guardado transaccional y caché distribuida para experiencias de Roblox en 2026.

## Principios Fundamentales
- **Idempotencia Transaccional:** Uso exclusivo de `UpdateAsync()` en lugar de `SetAsync()` para prevenir condiciones de carrera.
- **Session Locking:** Bloqueo de sesión para impedir que dos servidores manipulen simultáneamente los datos del mismo usuario.
- **Cierre Seguro:** Sincronización garantizada en `game:BindToClose()` con un presupuesto máximo de 30 segundos.

## Catálogo de Habilidades Técnicas

### 061. `datastore-update-async-transactions`
- **Regla:** Utilizar UpdateAsync() para mutaciones atómicas idempotentes evaluando siempre el valor previo contra colisiones de escritura.

### 062. `datastore-exponential-backoff`
- **Regla:** Reintentar operaciones de red fallidas con retroceso exponencial (1s, 2s, 4s) hasta un máximo de 3 intentos antes de alertar fallo definitivo.

### 063. `datastore-session-locking`
- **Regla:** Escribir un candado con JobId y timestamp al cargar el perfil; denegar mutaciones concurrentes desde otros servidores hasta liberación o expiración de TTL.

### 064. `datastore-schema-version-migration`
- **Regla:** Incluir un campo version: number en la raíz del perfil para ejecutar migraciones y transformaciones de esquema retrocompatibles automáticamente.

### 065. `datastore-budget-monitoring`
- **Regla:** Verificar GetRequestBudgetForRequestType() antes de invocar llamadas a DataStoreService para no saturar los límites de la experiencia.

### 066. `datastore-data-compression-deflate`
- **Regla:** Comprimir inventarios masivos y estructuras JSON usando algoritmos de compresión o buffers antes de almacenar en DataStore.

### 067. `datastore-bind-to-close-safety`
- **Regla:** Registrar un callback en game:BindToClose() que garantice el volcado seguro de datos en memoria para todos los jugadores antes del apagado del servidor.

### 068. `datastore-auto-save-rotator`
- **Regla:** Implementar un temporizador cíclico que guarde periódicamente el estado de los jugadores con dispersión temporal para evitar picos de peticiones.

### 069. `datastore-mock-unit-testing`
- **Regla:** Crear mocks en memoria de DataStoreService para validar la lógica de guardado y carga en suites de tests automatizados sin tocar la nube.

### 070. `datastore-backup-failover-keys`
- **Regla:** Mantener claves secundarias de respaldo ante fallos de deserialización catastróficos o corrupción inesperada del payload.

### 071. `memorystore-sorted-leaderboard`
- **Regla:** Utilizar MemoryStoreService:GetSortedMap() para tablas de clasificación globales en tiempo real con expiración automática de registros.

### 072. `memorystore-queue-matchmaking`
- **Regla:** Aprovechar colas de MemoryStoreService:GetQueue() para orquestar emparejamientos y salas de espera compartidas entre servidores.

### 073. `memorystore-cross-server-locks`
- **Regla:** Implementar bloqueos atómicos efímeros entre servidores usando MemoryStore para coordinar recursos globales sin latencia de DataStore.

### 074. `messagingservice-cross-server-chat`
- **Regla:** Emitir y suscribirse a tópicos globales con MessagingService para canales de comunicación social compartidos entre servidores.

### 075. `messagingservice-cluster-teleport`
- **Regla:** Transmitir reservas previas e información de sesión entre servidores antes de efectuar teletransportes de grupos de jugadores.

### 076. `datastore-gdpr-erasure-compliance`
- **Regla:** Procesar solicitudes oficiales de eliminación de datos (Right to Erasure) purgando todas las claves asociadas al UserId en todos los almacenes.

### 077. `datastore-corrupted-data-quarantine`
- **Regla:** Aislar datos corrompidos o no legibles en un almacén de cuarentena para auditoría manual sin sobrescribir el progreso original con valores por defecto.

### 078. `datastore-profile-cache-layer`
- **Regla:** Mantener una copia en memoria local (caché de sesión) para servir lecturas instantáneas y minimizar accesos innecesarios a la red.

### 079. `datastore-inventory-delta-sync`
- **Regla:** Serializar y sincronizar únicamente los deltas o diferencias modificadas en lugar del árbol de inventario completo.

### 080. `datastore-crash-recovery-snapshot`
- **Regla:** Generar instantáneas de recuperación ante caídas repentinas de servidores para restaurar el último estado consistente conocido.

### 081. `datastore-ordered-datastore-query`
- **Regla:** Utilizar OrderedDataStore para consultas paginadas ordenadas de valores numéricos enteros.

### 082. `datastore-key-versioning-rollback`
- **Regla:** Consultar el historial de versiones con ListVersionsAsync() y GetVersionAsync() para permitir auditoría y restauración de versiones anteriores.

### 083. `datastore-payload-checksum-verification`
- **Regla:** Validar sumas de verificación o firmas de integridad de datos serializados para prevenir corrupción silenciosa de bits.

### 084. `datastore-cross-experience-data-sync`
- **Regla:** Coordinar la persistencia compartida entre diferentes lugares de un mismo universo mediante Open Cloud o DataStores centralizados.

### 085. `datastore-metadata-tagging`
- **Regla:** Etiquetar cada guardado con metadatos descriptivos (UserId, versión del juego, timestamp) usando SetMetadata().
