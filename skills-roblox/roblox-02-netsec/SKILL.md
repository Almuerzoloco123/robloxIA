---
name: roblox-02-netsec
description: "Skills 026-060: Seguridad de Redes Cliente-Servidor Zero-Trust, Token Bucket Rate Limiting, Honeypots, Anti-Exploits y Validación Espacial."
license: MIT
metadata:
  domain: "Networking & Anti-Exploit Security"
  range: "026-060"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-02-netsec — Redes Autoritativas, Seguridad y Anti-Exploits (Skills 026 - 060)

Este módulo establece los estándares de seguridad de red inviolables para experiencias de Roblox en 2026.

## Principio Fundamental: Zero-Trust Client
El cliente de Roblox se ejecuta en la máquina del usuario y debe considerarse **100% comprometido y hostil**. El cliente solo tiene permiso para enviar intenciones de entrada (*inputs*); el servidor valida y ejecuta todo cambio de estado.

## Catálogo de Habilidades Técnicas

### 026. `net-server-authoritative-model`
- **Regla:** Salud, daño, monedas, inventarios, transacciones y posición legal se calculan exclusivamente en el servidor.
- **Prohibido:** Que el cliente declare "Me hice 50 de daño" o "Compré este ítem por 10 monedas".

### 027. `net-remote-payload-validation`
- **Regla:** Validar con `typeof()` el tipo y forma exacta de cada parámetro entrante en `RemoteEvent.OnServerEvent`.
  ```lua
  if typeof(targetId) ~= "string" or typeof(amount) ~= "number" or amount <= 0 then
      return -- Rechazo silencioso o sanción
  end
  ```

### 028. `net-packet-size-sanitization`
- **Regla:** Rechazar cadenas de texto superiores a 500 caracteres o tablas con más de 50 elementos para prevenir ataques de desbordamiento de memoria (OOM / packet flooding).

### 029. `net-spatial-distance-validation`
- **Regla:** Validar la distancia euclidiana entre el personaje y el objeto con el que interactúa:
  ```lua
  local distance = (playerRoot.Position - targetPart.Position).Magnitude
  if distance > 15 then
      return -- Interacción rechazada por estar fuera de rango
  end
  ```

### 030. `net-raycast-server-verification`
- **Regla:** En armas de fuego y proyectiles, trazar un rayo en el servidor (`workspace:Raycast`) para confirmar línea de visión antes de registrar impactos.

### 031. `net-contextual-state-verification`
- **Regla:** No procesar acciones de un jugador si su personaje está muerto (`Humanoid.Health <= 0`), congelado, aturdido o en cooldown.

### 032. `net-remote-rate-limiter`
- **Regla:** Todo `RemoteEvent` debe contar con un limitador de tasa Token Bucket por jugador (ej: máx 20 tokens, recarga de 5/seg). Si se agotan los tokens, descartar paquetes y alertar telemetría.

### 033. `net-unreliable-remote-sync`
- **Regla:** Usar `UnreliableRemoteEvent` para sincronizar datos cosméticos de alta frecuencia (efectos de partículas, orientación de torretas, destellos de disparo).

### 034. `net-reliable-transactional-remotes`
- **Regla:** Reservar `RemoteEvent` estándar únicamente para eventos de cambio de estado críticos (compras, muertes, inicio de rondas, apertura de cofres).

### 035. `net-dynamic-remote-instantiation`
- **Regla:** Instanciar remotos dinámicamente en tiempo de ejecución alojados en carpetas protegidas en `ReplicatedStorage.Remotes`.

### 036. `net-unidirectional-remote-policing`
- **Regla:** Si un cliente invoca un `RemoteEvent` concebido solo para dispararse de Servidor a Cliente, expulsar inmediatamente al jugador con `player:Kick()`.

### 037. `net-honeypot-decoy-remotes`
- **Regla:** Desplegar remotos trampa con nombres comunes en exploits (`AdminAddCoins`, `KillAllPlayers`, `GiveGodmode`). Cualquier cliente que dispare estos remotos es automáticamente baneado y expulsado.

### 038. `net-timestamp-latency-compensation`
- **Regla:** Compensar el lag del cliente verificando marcas de tiempo en el servidor y validando contra un búfer circular de estados pasados (máx 200 ms).

### 039. `net-anticheat-speed-audit`
- **Regla:** Monitorear el delta de posición física en el tiempo en el servidor:
  ```lua
  local speed = (currentPos - lastPos).Magnitude / dt
  if speed > maxAllowedSpeed * 1.3 then
      -- Corregir posición (rubberband)
      rootPart.CFrame = CFrame.new(lastPos)
  end
  ```

### 040. `net-anticheat-teleport-detection`
- **Regla:** Detectar saltos espaciales instantáneos sin interacción previa con vehículos o teletransportadores registrados.

### 041. `net-anticheat-fly-noclip-guard`
- **Regla:** Validar estados ilegales de física (`Enum.HumanoidStateType.Flying`) e interpenetración de partes sólidas en el servidor.

### 042. `net-server-side-sanity-checks`
- **Regla:** Cálculos de costos, verificación de saldo y reglas de negocio ejecutadas exclusivamente en el servidor.

### 043. `net-anti-memory-tampering`
- **Regla:** En el cliente, proteger tablas críticas y configuraciones mediante metatablas congeladas con `table.freeze` o proxies protectores.

### 044. `net-kick-message-sanitization`
- **Regla:** Estandarizar los mensajes de expulsión para no filtrar lógica interna de seguridad (ej: "Error de conexión con el servidor").

### 045. `net-session-token-handshake`
- **Regla:** Para transacciones críticas secuenciales, generar tokens de sesión de un solo uso validados en el servidor.

### 046. `net-character-ownership-assertion`
- **Regla:** Verificar que la instancia manipulada o el personaje corresponda efectivamente al `player.Character` del emisor.

### 047. `net-network-ownership-lockdown`
- **Regla:** Asignar `part:SetNetworkOwner(nil)` forzando la simulación física en el servidor en entidades críticas (monedas, proyectiles, jefes).

### 048-060. `net-advanced-telemetry-and-defense`
- Incluye `net-replicated-storage-segregation`, `net-server-script-service-isolation`, `net-remote-call-graph-logging`, `net-ddos-packet-flood-mitigation`, `net-position-history-rewind`, `net-exploit-telemetry-beacon`.
