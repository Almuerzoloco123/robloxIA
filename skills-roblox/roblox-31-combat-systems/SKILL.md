---
name: roblox-31-combat-systems
description: "Rige la arquitectura de sistemas de combate y hitboxes espaciales en Roblox (skills 536-550): detección de impactos volumétricos (GetPartBoundsInBox, GetPartBoundsInRadius) vs raycasting multipunto, reconciliación de latencia cliente-servidor, máquina de estados finitos (FSM), ventanas de parry e i-frames, impulsos físicos de knockback con LinearVelocity y fórmulas de mitigación por armadura. Úsala al desarrollar sistemas melee, armas de fuego, combates de acción en tiempo real y mecánicas PvP/PvE competitivas."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Combat Systems & Spatial Hitboxes"
  range: "536-550"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-31-combat-systems — Sistemas de Combate, Hitboxes y Máquinas de Estado (Skills 536 - 550)

Este módulo establece los fundamentos de ingeniería para sistemas de combate físico en tiempo real, detección geométrica de impactos y balance de estados de juego autoritativos bajo Luau 2026.

## Catálogo de Habilidades Técnicas

### 536. `combat-spatial-query-box-detection`
- **Regla:** Para ataques con cajas de impacto instantáneas o de área delimitada, emplear `workspace:GetPartBoundsInBox()` reutilizando una instancia `OverlapParams` configurada con lista blanca o CollisionGroups dedicados.
- **Ejemplo:**
  ```luau
  --!strict
  local function queryMeleeBox(boxCFrame: CFrame, boxSize: Vector3, filterList: { Instance }): { BasePart }
      local overlap = OverlapParams.new()
      overlap.FilterType = Enum.RaycastFilterType.Include
      overlap.FilterDescendantsInstances = filterList
      overlap.MaxParts = 20
      return workspace:GetPartBoundsInBox(boxCFrame, boxSize, overlap)
  end
  ```

### 537. `combat-spatial-query-radius-detection`
- **Regla:** En ataques de área radial (AoE) o barridos cónicos frontales, combinar `workspace:GetPartBoundsInRadius()` con la evaluación del producto punto (*dot product*) entre el vector frontal del atacante y la dirección hacia el objetivo.
- **Ejemplo:**
  ```luau
  --!strict
  local function queryFrontalCone(attackerRoot: BasePart, radius: number, angleDegrees: number): { Model }
      local threshold = math.cos(math.rad(angleDegrees))
      local overlap = OverlapParams.new()
      overlap.CollisionGroup = "Characters"
      
      local parts = workspace:GetPartBoundsInRadius(attackerRoot.Position, radius, overlap)
      local hitCharacters: { [Model]: boolean } = {}
      local result: { Model } = {}

      for _, part in parts do
          local char = part.Parent
          if char and char:IsA("Model") and char ~= attackerRoot.Parent and not hitCharacters[char] then
              local targetRoot = char:FindFirstChild("HumanoidRootPart")
              if targetRoot and targetRoot:IsA("BasePart") then
                  local dirToTarget = (targetRoot.Position - attackerRoot.Position).Unit
                  local dot = attackerRoot.CFrame.LookVector:Dot(dirToTarget)
                  if dot >= threshold then
                      hitCharacters[char] = true
                      table.insert(result, char)
                  end
              end
          end
      end
      return result
  end
  ```

### 538. `combat-raycast-multi-point-hitbox`
- **Regla:** Para armas de filo de alta velocidad (katanas, espadas), trazar múltiples rayos interpolados entre posiciones del fotograma anterior y el actual para evitar túneles de colisión (*tunneling*).
- **Ejemplo:**
  ```luau
  --!strict
  export type BladeSocket = { point0: Attachment, point1: Attachment, lastPos0: Vector3, lastPos1: Vector3 }

  local function castBladeRay(socket: BladeSocket, filter: { Instance }): RaycastResult?
      local currentPos0 = socket.point0.WorldPosition
      local currentPos1 = socket.point1.WorldPosition
      local rayDirection = currentPos1 - socket.lastPos1

      local params = RaycastParams.new()
      params.FilterType = Enum.RaycastFilterType.Exclude
      params.FilterDescendantsInstances = filter

      local hit = workspace:Raycast(socket.lastPos1, rayDirection, params)
      socket.lastPos0 = currentPos0
      socket.lastPos1 = currentPos1
      return hit
  end
  ```

### 539. `combat-server-client-latency-reconciliation`
- **Regla:** Al validar un impacto reportado por el cliente, el servidor debe verificar si la posición del atacante y el defensor estaban dentro de una distancia admisible considerando el tiempo de ida y vuelta de red (*RTT / Ping*).
- **Ejemplo:**
  ```luau
  --!strict
  local function isHitInRange(attackerPos: Vector3, targetPos: Vector3, weaponRange: number, pingSeconds: number): boolean
      local maxAllowedDisplacement = 16.0 * (pingSeconds * 0.5) -- Velocidad caminata * compensación
      local maxLegalDistance = weaponRange + maxAllowedDisplacement + 2.0 -- Tolerancia geométrica
      return (attackerPos - targetPos).Magnitude <= maxLegalDistance
  end
  ```

### 540. `combat-fsm-state-machine`
- **Regla:** Los personajes deben gobernarse por una máquina de estados finitos estricta (`StateFSM`). Si el estado actual es `Stunned`, `Ragdoll` o `Dead`, las solicitudes de ataque entrantes deben ser rechazadas de inmediato.
- **Ejemplo:**
  ```luau
  --!strict
  export type CombatState = "Idle" | "Attacking" | "Parrying" | "Blocking" | "Stunned" | "Dead"

  local function canInitiateAttack(currentState: CombatState): boolean
      return currentState == "Idle"
  end
  ```

### 541. `combat-parry-window-timing`
- **Regla:** Implementar ventanas de contraataque (*parry*) acotadas entre 120ms y 200ms. Si un impacto se recibe durante dicha ventana activa, anular el daño y aplicar aturdimiento al agresor.
- **Ejemplo:**
  ```luau
  --!strict
  local function resolveIncomingHit(isDefenderParrying: boolean, onParrySuccess: () -> (), onNormalHit: () -> ())
      if isDefenderParrying then
          onParrySuccess()
      else
          onNormalHit()
      end
  end
  ```

### 542. `combat-iframe-invulnerability-manager`
- **Regla:** Durante esquivas (*dash/dodge roll*) conceder fotogramas de invulnerabilidad (*i-frames*). Todo daño entrante debe ser descartado silenciosamente en el servidor mientras la etiqueta o atributo `IsInvulnerable` permanezca en `true`.
- **Ejemplo:**
  ```luau
  --!strict
  local function grantInvulnerability(character: Model, duration: number)
      character:SetAttribute("IsInvulnerable", true)
      task.delay(duration, function()
          if character.Parent then
              character:SetAttribute("IsInvulnerable", false)
          end
      end)
  end
  ```

### 543. `combat-vector-force-knockback`
- **Regla:** Los empujes y derribos físicos deben ejecutarse mediante `LinearVelocity` acoplado al `HumanoidRootPart`, estableciendo `MaxForce` alto y desactivándolo tras un intervalo corto ($\le 0.35$ s).
- **Ejemplo:**
  ```luau
  --!strict
  local function applyKnockback(rootPart: BasePart, direction: Vector3, forceMagnitude: number, duration: number)
      local attachment = rootPart:FindFirstChild("KnockbackAttachment") :: Attachment?
      if not attachment then
          attachment = Instance.new("Attachment")
          attachment.Name = "KnockbackAttachment"
          attachment.Parent = rootPart
      end

      local linearVel = Instance.new("LinearVelocity")
      linearVel.Attachment0 = attachment
      linearVel.MaxForce = 1e6
      linearVel.VectorVelocity = (direction.Unit + Vector3.new(0, 0.3, 0)).Unit * forceMagnitude
      linearVel.Parent = rootPart

      task.delay(duration, function()
          linearVel:Destroy()
      end)
  end
  ```

### 544. `combat-armor-mitigation-formula`
- **Regla:** El cálculo de daño neto debe aplicar una función de mitigación hiperbólica por armadura: $Damage_{final} = Damage_{base} \times \frac{100}{100 + ArmorEffective}$, evitando valores de absorción de daño superiores al 90%.
- **Ejemplo:**
  ```luau
  --!strict
  local function calculateMitigatedDamage(baseDamage: number, armor: number, armorPenetration: number): number
      local effectiveArmor = math.max(0, armor - armorPenetration)
      local multiplier = 100 / (100 + effectiveArmor)
      local finalDamage = baseDamage * multiplier
      return math.max(1, math.round(finalDamage))
  end
  ```

### 545. `combat-combo-counter-buffering`
- **Regla:** Implementar buffer de entrada para ataques continuos. Si el jugador pulsa ataque durante los últimos 150ms de la animación anterior, encolar el siguiente eslabón del combo sin reiniciar la secuencia.
- **Ejemplo:**
  ```luau
  --!strict
  local function processComboBuffer(currentCombo: number, maxCombo: number, lastHitTime: number, comboWindow: number): number
      local now = os.clock()
      if now - lastHitTime <= comboWindow then
          return (currentCombo % maxCombo) + 1
      else
          return 1
      end
  end
  ```

### 546. `combat-stamina-poise-break`
- **Regla:** Mantener un contador de postura (*poise*). Los impactos reducen la postura; al llegar a cero, romper la guardia del personaje, cancelar sus animaciones activas e inducir un estado de vulnerabilidad crítica.
- **Ejemplo:**
  ```luau
  --!strict
  local function applyPoiseDamage(character: Model, poiseDmg: number, onGuardBreak: () -> ())
      local currentPoise = character:GetAttribute("CurrentPoise") or 100
      local newPoise = math.max(0, (currentPoise :: number) - poiseDmg)
      character:SetAttribute("CurrentPoise", newPoise)

      if newPoise == 0 then
          onGuardBreak()
          character:SetAttribute("CurrentPoise", 100) -- Reset tras la penalización
      end
  end
  ```

### 547. `combat-directional-blocking-angles`
- **Regla:** Al recibir un ataque mientras se bloquea, comprobar que el agresor esté en el arco frontal del defensor ($\ge 120^\circ$ de cobertura, producto punto $\ge 0.5$). Los ataques por la espalda ignoran el escudo.
- **Ejemplo:**
  ```luau
  --!strict
  local function isBlockAngleValid(defenderRoot: BasePart, attackerPos: Vector3): boolean
      local defenderLook = defenderRoot.CFrame.LookVector
      local dirToAttacker = (attackerPos - defenderRoot.Position).Unit
      return defenderLook:Dot(dirToAttacker) >= 0.5
  end
  ```

### 548. `combat-damage-number-replicated-billboard`
- **Regla:** Los indicadores numéricos flotantes de daño deben emitirse hacia los clientes mediante un `UnreliableRemoteEvent` ligero conteniendo únicamente la posición 3D, el valor del daño y si fue crítico.
- **Ejemplo:**
  ```luau
  --!strict
  local function replicateDamageIndicator(unreliableRemote: UnreliableRemoteEvent, hitPos: Vector3, damage: number, isCritical: boolean)
      unreliableRemote:FireAllClients(hitPos, damage, isCritical)
  end
  ```

### 549. `combat-friendly-fire-team-check`
- **Regla:** Antes de calcular o infligir daño, validar en el servidor que la víctima y el agresor no compartan equipo o que el fuego amigo esté explícitamente deshabilitado.
- **Ejemplo:**
  ```luau
  --!strict
  local function canDamageTarget(attackerPlayer: Player?, targetChar: Model): boolean
      if not attackerPlayer then return true end -- NPCs pueden dañar
      local targetPlayer = game:GetService("Players"):GetPlayerFromCharacter(targetChar)
      if targetPlayer and targetPlayer.Team ~= nil and targetPlayer.Team == attackerPlayer.Team then
          return false
      end
      return true
  end
  ```

### 550. `combat-hit-confirmation-anti-exploit`
- **Regla:** La confirmación de impacto debe ser 100% server-side. El servidor verifica la distancia euclidiana, el estado del atacante (vivo, sin aturdimiento) y línea de visión antes de restar vida al `Humanoid`.
- **Ejemplo:**
  ```luau
  --!strict
  local function validateAndApplyHit(attacker: Player, targetHumanoid: Humanoid, weaponRange: number, damage: number)
      local attackerChar = attacker.Character
      if not attackerChar then return end
      local attackerRoot = attackerChar:FindFirstChild("HumanoidRootPart") :: BasePart?
      local targetRoot = targetHumanoid.RootPart
      if not attackerRoot or not targetRoot then return end

      if targetHumanoid.Health <= 0 then return end
      if (attackerRoot.Position - targetRoot.Position).Magnitude > (weaponRange + 5.0) then return end

      targetHumanoid:TakeDamage(damage)
  end
  ```

## Reglas Inviolables

1. **Daño exclusivamente en el servidor:** Jamás aceptar un valor de daño declarado por el cliente. El cliente solo reporta la intención de ataque o la señal de colisión; el servidor calcula y deduce los puntos de vida.
2. **Respeto absoluto a los i-frames:** Si el atributo `IsInvulnerable` es verdadero, ningún ataque o efecto de daño puede surtir efecto en el personaje receptor.
3. **Validación espacial server-authoritative:** Todo impacto debe superar la verificación de distancia máxima y estado físico del agresor antes de ejecutarse en el motor de juego.
4. **Físicas desacopladas:** Emplear restricciones modernas (`LinearVelocity`) para knockback, destruyendo o desactivando la instancia tras la expiración de la ventana de impulso.
5. **Reutilización de OverlapParams:** En detección por `GetPartBoundsInBox` y `GetPartBoundsInRadius`, nunca instanciar un nuevo `OverlapParams` por cada fotograma; mantener una referencia estática o reutilizable en memoria.
