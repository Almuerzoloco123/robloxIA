---
name: roblox-29-animation-authoring-retargeting
description: "Gobierna la autoría, control y retargeting de animaciones en Roblox (skills 506-520): gestión del ciclo de vida de Animator, jerarquía de AnimationPriority, curvas de animación (CurveAnimation), transiciones suaves de peso y velocidad (AdjustWeight, AdjustSpeed), retargeting procedural entre rigs R15 de diversas escalas y sincronización de marcadores de eventos. Úsala al implementar sistemas de locomoción, combate coreografiado, cinemáticas procedurales o sincronización de animaciones complejas."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Animation Authoring & Retargeting"
  range: "506-520"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-29-animation-authoring-retargeting — Animaciones, Retargeting y Prioridades (Skills 506 - 520)

Este módulo establece los estándares técnicos de ingeniería para la carga, sincronización, transición y retargeting de animaciones en personajes y humanoides bajo el motor Luau 2026 de Roblox.

## Catálogo de Habilidades Técnicas

### 506. `anim-animator-initialization-lifecycle`
- **Regla:** Las animaciones deben cargarse EXCLUSIVAMENTE a través de una instancia `Animator` alojada en un `Humanoid` o `AnimationController`.
- **Prohibición Total:** El método legado `Humanoid:LoadAnimation()` está estrictamente prohibido debido a degradación de rendimiento y falta de sincronización estricta.
- **Ejemplo:**
  ```luau
  --!strict
  local function getOrCreateAnimator(humanoid: Humanoid): Animator
      local animator = humanoid:FindFirstChildOfClass("Animator")
      if not animator then
          animator = Instance.new("Animator")
          animator.Parent = humanoid
      end
      return animator
  end

  local function loadTrack(humanoid: Humanoid, animation: Animation): AnimationTrack
      local animator = getOrCreateAnimator(humanoid)
      return animator:LoadAnimation(animation)
  end
  ```

### 507. `anim-priority-hierarchy-governance`
- **Regla:** Asignar estrictamente la prioridad adecuada (`AnimationPriority`) en función de la función del clip en la jerarquía motriz para evitar sobrescrituras no deseadas.
  - `Core`: Postura base neutral y físicas pasivas.
  - `Idle`: Respiración, balanceo estático e inquietud.
  - `Movement`: Caminado, carrera, natación y salto continuo.
  - `Action`, `Action2`, `Action3`, `Action4`: Ataques, esquivas, habilidades y cinemáticas de máxima prioridad.
- **Ejemplo:**
  ```luau
  --!strict
  local function configureTrackPriority(track: AnimationTrack, category: "Idle" | "Locomotion" | "CombatAttack" | "Ultimate")
      if category == "Idle" then
          track.Priority = Enum.AnimationPriority.Idle
      elseif category == "Locomotion" then
          track.Priority = Enum.AnimationPriority.Movement
      elseif category == "CombatAttack" then
          track.Priority = Enum.AnimationPriority.Action
      elseif category == "Ultimate" then
          track.Priority = Enum.AnimationPriority.Action4
      end
  end
  ```

### 508. `anim-weight-blending-transitions`
- **Regla:** Toda transición entre clips debe emplear `AdjustWeight` con tiempo de fundido (*fadeTime*) paramétrico para evitar saltos bruscos (*snapping*).
- **Ejemplo:**
  ```luau
  --!strict
  local function crossfadeTracks(currentTrack: AnimationTrack, nextTrack: AnimationTrack, transitionDuration: number)
      nextTrack:Play(transitionDuration)
      nextTrack:AdjustWeight(1.0, transitionDuration)
      currentTrack:AdjustWeight(0.0, transitionDuration)
      task.delay(transitionDuration, function()
          if currentTrack.WeightCurrent <= 0.01 then
              currentTrack:Stop()
          end
      end)
  end
  ```

### 509. `anim-playback-speed-tuning`
- **Regla:** Ajustar la velocidad de reproducción dinámicamente mediante `AdjustSpeed(speed)` en proporción directa a la velocidad física de desplazamiento para erradicar el deslizamiento de pies (*foot sliding*).
- **Ejemplo:**
  ```luau
  --!strict
  local BASE_WALK_SPEED = 16.0

  local function syncLocomotionSpeed(walkTrack: AnimationTrack, currentVelocityMagnitude: number)
      if currentVelocityMagnitude <= 0.1 then
          walkTrack:AdjustSpeed(0)
      else
          local relativeSpeed = math.clamp(currentVelocityMagnitude / BASE_WALK_SPEED, 0.25, 2.5)
          walkTrack:AdjustSpeed(relativeSpeed)
      end
  end
  ```

### 510. `anim-keyframe-event-markers`
- **Regla:** Emplear `AnimationTrack:GetMarkerReachedSignal(markerName)` para disparar lógica audiovisual y de impacto mecánico en instantes exactos de la línea de tiempo.
- **Prohibido:** El uso del evento obsoleto `KeyframeReached`.
- **Ejemplo:**
  ```luau
  --!strict
  local function bindHitMarker(track: AnimationTrack, onHitWindow: () -> ()): RBXScriptConnection
      return track:GetMarkerReachedSignal("HitImpact"):Connect(function(param: string)
          onHitWindow()
      end)
  end
  ```

### 511. `anim-curve-animation-evaluation`
- **Regla:** En rigs cinematicos o avatares de alta fidelidad, usar `CurveAnimation` para garantizar interpolaciones rotacionales libres de bloqueo de cardán (*gimbal lock*) y con curvaturas Bezier de aceleración natural.
- **Ejemplo:**
  ```luau
  --!strict
  local function isCurveAnimation(animation: Instance): boolean
      return animation:IsA("CurveAnimation")
  end
  ```

### 512. `anim-r15-rig-retargeting-rules`
- **Regla:** Al aplicar animaciones diseñadas para proporciones R15 estándar sobre rigs con escalas modificadas, recalcular `Humanoid.HipHeight` dinámicamente y preservar el alineamiento del suelo según la longitud efectiva de piernas.
- **Ejemplo:**
  ```luau
  --!strict
  local function recalibrateHipHeight(humanoid: Humanoid, rigScaleMultiplier: number)
      local baseHipHeight = 2.0
      humanoid.HipHeight = baseHipHeight * rigScaleMultiplier
  end
  ```

### 513. `anim-track-state-caching`
- **Regla:** Almacenar en caché las pistas de animación cargadas en un registro local indexado por identificador de animación para prevenir la recreación repetitiva de pistas.
- **Ejemplo:**
  ```luau
  --!strict
  export type TrackCache = { [string]: AnimationTrack }

  local function getCachedTrack(cache: TrackCache, animator: Animator, animation: Animation): AnimationTrack
      local animId = animation.AnimationId
      local cached = cache[animId]
      if cached then
          return cached
      end

      local newTrack = animator:LoadAnimation(animation)
      cache[animId] = newTrack
      return newTrack
  end
  ```

### 514. `anim-procedural-head-spine-lookat`
- **Regla:** Las modificaciones procedimentales de articulaciones (como seguimiento de mirada o inclinación espinal) deben ejecutarse en el evento `RunService.PreAnimation` o modificando únicamente `Motor6D.Transform`, nunca mutando `C0` o `C1`.
- **Ejemplo:**
  ```luau
  --!strict
  local function applySpineLookAt(neckMotor: Motor6D, targetAngleY: number, targetAngleX: number)
      -- Motor6D.Transform es recalculado por el Animator en cada fotograma antes del render
      local clampedY = math.clamp(targetAngleY, -math.rad(60), math.rad(60))
      local clampedX = math.clamp(targetAngleX, -math.rad(45), math.rad(45))
      neckMotor.Transform = CFrame.Angles(clampedX, clampedY, 0) * neckMotor.Transform
  end
  ```

### 515. `anim-root-motion-compensation`
- **Regla:** Cuando se requiera desplazamiento guiado por animación (*root motion*), el servidor debe proyectar el desplazamiento cinemático mediante una restricción de velocidad física controlada (`LinearVelocity`), desacoplando la translación visual del desfase de red.
- **Ejemplo:**
  ```luau
  --!strict
  local function applyLungeRootMotion(linearVelocity: LinearVelocity, forwardVector: Vector3, impulseSpeed: number, duration: number)
      linearVelocity.VectorVelocity = forwardVector * impulseSpeed
      linearVelocity.Enabled = true
      task.delay(duration, function()
          linearVelocity.Enabled = false
          linearVelocity.VectorVelocity = Vector3.zero
      end)
  end
  ```

### 516. `anim-looped-timeline-wrapping`
- **Regla:** Para animaciones en ciclo (`Looped = true`), validar que las poses inicial y final compartan valores de rotación articular con tolerancia $\le 0.05$ radianes para erradicar tirones de costura (*loop popping*).
- **Ejemplo:**
  ```luau
  --!strict
  local function configureContinuousLoop(track: AnimationTrack)
      track.Looped = true
      track:Play(0.2)
  end
  ```

### 517. `anim-client-side-replication-boundary`
- **Regla:** Los personajes controlados por jugadores locales deben reproducir sus pistas de animación directamente en el cliente. El `Animator` interno de Roblox se encarga de replicar la pose a la red con compresión de ancho de banda.
- **Ejemplo:**
  ```luau
  --!strict
  local function playLocalPlayerAction(animator: Animator, attackAnimation: Animation)
      -- Ejecución directa en cliente; replicación nativa por Animator
      local track = animator:LoadAnimation(attackAnimation)
      track.Priority = Enum.AnimationPriority.Action
      track:Play(0.1)
  end
  ```

### 518. `anim-npc-server-animator-throttling`
- **Regla:** En NPCs y multitudes del servidor, suspender o reducir la tasa de evaluación de pistas de animación si el NPC se encuentra fuera del radio de interés o con distancia a cualquier jugador $\ge 120$ studs.
- **Ejemplo:**
  ```luau
  --!strict
  local function throttleNpcAnimation(animator: Animator, isFarFromPlayers: boolean, activeTrack: AnimationTrack)
      if isFarFromPlayers then
          if activeTrack.IsPlaying then
              activeTrack:AdjustSpeed(0.5) -- O pausar si la IA está inactiva
          end
      else
          if activeTrack.IsPlaying then
              activeTrack:AdjustSpeed(1.0)
          end
      end
  end
  ```

### 519. `anim-layered-stance-blending`
- **Regla:** Superponer posturas de extremidades superiores (apuntado con rifle, bloqueo con escudo) asignando prioridad `Action` sobre la locomoción base (`Movement`), asegurando que el clip superior solo contenga keyframes en brazos y torso.
- **Ejemplo:**
  ```luau
  --!strict
  local function enableAimLayer(aimTrack: AnimationTrack)
      aimTrack.Priority = Enum.AnimationPriority.Action
      aimTrack:Play(0.15)
      aimTrack:AdjustWeight(1.0)
  end
  ```

### 520. `anim-track-disposal-janitor`
- **Regla:** Todo `AnimationTrack` debe ser detenido y desconectado formalmente al limpiar componentes, utilizando `Janitor` o desconexiones explícitas para no acumular memoria residual en el subsistema de renderizado.
- **Ejemplo:**
  ```luau
  --!strict
  local function cleanupTrack(track: AnimationTrack)
      if track.IsPlaying then
          track:Stop(0.1)
      end
      track:Destroy()
  end
  ```

## Reglas Inviolables

1. **Carga en `Animator` estricta:** Jamás invocar `Humanoid:LoadAnimation()`. La única ruta admitida por la ingeniería RAASE 2026 es a través de la instancia `Animator`.
2. **Sincronización por `GetMarkerReachedSignal`:** No emplear `KeyframeReached`. Toda lógica mecánica sincronizada debe guiarse por marcadores con nombres explícitos y señales modernas.
3. **Inmutabilidad de articulaciones base:** Prohibido modificar las propiedades `C0` o `C1` de `Motor6D` en bucles continuos de animación procedimental. Interpolar únicamente `Motor6D.Transform`.
4. **Reproducción del jugador en el cliente:** Las animaciones del personaje propio deben dispararse siempre en el cliente para garantizar latencia de respuesta cero en la visualización.
5. **Liberación exhaustiva:** Ningún `AnimationTrack` debe permanecer reproduciéndose en bucle cuando el personaje muere o el estado del juego cambia de fase; invocar siempre `:Stop()` y limpiar las conexiones.
