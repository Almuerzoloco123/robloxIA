---
name: roblox-22-camera-cinematics
description: "Rige la arquitectura de cámaras y sistemas cinematográficos (skills 401-415) en Roblox 2026: control de CameraType.Scriptable, interpolación fluida de CFrame en RenderStepped, screen shake procedural con ruido Perlin 3D, cinemáticas con corte multicámara, transiciones de perspectiva 1ra/3ra persona y FOV dinámico reactivo. Úsala al implementar directores de cámara, secuencias narrativas, efectos de impacto, vehículos o cámaras personalizadas de alta fidelidad visual."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Camera Systems & Cinematics"
  range: "401-415"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-22-camera-cinematics — Sistemas de Cámara y Cinemáticas (Skills 401 - 415)

Este módulo establece los estándares de ingeniería para el control de la cámara en Roblox Studio. Cubre el desacoplamiento y restauración no destructiva del controlador de cámara nativo, interpolación matemática en el ciclo de renderizado, sacudidas de pantalla procedurales multi-eje y orquestación de secuencias narrativas.

## Catálogo de Habilidades Técnicas

### 401. `camera-scriptable-override-lifecycle`
- **Regla:** La toma de control de la cámara debe realizarse asignando `workspace.CurrentCamera.CameraType = Enum.CameraType.Scriptable` y almacenando el estado previo para una restauración transparente.
- **Estándar:** Al restaurar el control al jugador, devolver `CameraType` a `Custom` y asegurar que `CameraSubject` apunte al `Humanoid` del personaje local.
- **Ejemplo:**
  ```luau
  --!strict
  local Workspace = game:GetService("Workspace")
  local Players = game:GetService("Players")

  local player = Players.LocalPlayer
  local camera = Workspace.CurrentCamera

  local function setScriptableCamera(): () -> ()
      local prevType = camera.CameraType
      local prevSubject = camera.CameraSubject

      camera.CameraType = Enum.CameraType.Scriptable

      -- Devolver función de teardown idempotente
      return function()
          camera.CameraType = prevType
          local character = player.Character
          if character then
              local humanoid = character:FindFirstChildOfClass("Humanoid")
              if humanoid then
                  camera.CameraSubject = humanoid
              end
          end
      end
  end
  ```

### 402. `camera-render-priority-binding`
- **Regla:** Las mutaciones directas de `CurrentCamera.CFrame` deben ejecutarse dentro de `RunService:BindToRenderStep` utilizando `Enum.RenderPriority.Camera.Value + 1` o `RenderPriority.Last.Value`.
- **Propósito:** Evitar micro-tirones (*jitter*) causados por la sobreescritura del script de cámara estándar de Roblox al ejecutarse antes del pipeline de renderizado del avatar.

### 403. `camera-cframe-slerp-interpolation`
- **Regla:** En seguimientos dinámicos de cámara, usar interpolación geométrica con compensación de tasa de fotogramas independiente mediante decaimiento exponencial: $1 - e^{-\lambda \cdot dt}$.
- **Ejemplo:**
  ```luau
  --!strict
  local function interpolateCamera(currentCF: CFrame, targetCF: CFrame, sharpness: number, dt: number): CFrame
      local alpha = 1 - math.exp(-sharpness * dt)
      return currentCF:Lerp(targetCF, math.clamp(alpha, 0, 1))
  end
  ```

### 404. `camera-perlin-screen-shake-3d`
- **Regla:** Las sacudidas de pantalla no deben usar números aleatorios uniformes (`math.random`), ya que generan parpadeo estroboscópico de alta frecuencia.
- **Estándar:** Utilizar `math.noise` tridimensional con frecuencia temporal y decaimiento cuadrático o exponencial.
- **Ejemplo:**
  ```luau
  --!strict
  local function calculatePerlinShake(trauma: number, timeSec: number, frequency: number): CFrame
      -- Trauma al cuadrado para respuesta perceptiva no lineal
      local intensity = math.clamp(trauma, 0, 1) ^ 2
      local yaw = (math.noise(timeSec * frequency, 0, 0) - 0.5) * 2 * math.rad(4) * intensity
      local pitch = (math.noise(0, timeSec * frequency, 0) - 0.5) * 2 * math.rad(4) * intensity
      local roll = (math.noise(0, 0, timeSec * frequency) - 0.5) * 2 * math.rad(6) * intensity

      local offsetX = (math.noise(timeSec * frequency, 17, 0) - 0.5) * 0.4 * intensity
      local offsetY = (math.noise(0, 31, timeSec * frequency) - 0.5) * 0.4 * intensity

      return CFrame.new(offsetX, offsetY, 0) * CFrame.Angles(pitch, yaw, roll)
  end
  ```

### 405. `camera-dynamic-speed-fov`
- **Regla:** El campo visual (`FieldOfView`) debe ajustarse reactivamente a la velocidad lineal del personaje o vehículo para intensificar la sensación cinética (efecto túnel).
- **Estándar:** El FOV debe acotarse estrictamente entre un mínimo de 70° y un máximo de 95° para no provocar distorsión ojo de pez extrema.
- **Ejemplo:**
  ```luau
  --!strict
  local BASE_FOV = 70
  local MAX_FOV = 90
  local SPEED_THRESHOLD = 50

  local function getTargetFov(currentSpeed: number): number
      local factor = math.clamp(currentSpeed / SPEED_THRESHOLD, 0, 1)
      return BASE_FOV + (MAX_FOV - BASE_FOV) * factor
  end
  ```

### 406. `camera-first-third-person-transition`
- **Regla:** Al alternar entre primera y tercera persona, respetar los ángulos de vista (Pitch y Yaw) actuales del jugador para evitar desorientación espacial instantánea.
- **Estándar:** Mantener la orientación del mouse o stick sincronizada interpolando exclusivamente el radio de distancia (`CameraMinZoomDistance` y `CameraMaxZoomDistance`).

### 407. `camera-cinematic-cutscene-sequencer`
- **Regla:** Los planos cinemáticos secuenciales deben definirse mediante estructuras orientadas a datos con marcas de tiempo relativas, puntos de clave CFrame y funciones de easing Bézier.
- **Ejemplo:**
  ```luau
  --!strict
  export type ShotDefinition = {
      startCFrame: CFrame,
      endCFrame: CFrame,
      duration: number,
      fov: number,
      easingStyle: Enum.EasingStyle,
      easingDirection: Enum.EasingDirection,
  }
  ```

### 408. `camera-orbit-panning-math`
- **Regla:** Para cámaras orbitales de inspección de objetos o inventario, calcular las coordenadas esféricas del CFrame a partir de dos ángulos escalares: Azimut (Yaw) y Elevación (Pitch), acotando la elevación entre $[-80^\circ, 80^\circ]$ para prevenir el bloqueo de cardán (*gimbal lock*).

### 409. `camera-subject-tracking-lookat`
- **Regla:** Al seguir a múltiples entidades en simultáneo (e.g. dos combatientes en un ring), calcular el centroide ponderado de sus posiciones y posicionar la cámara a una distancia proporcional a la diagonal del cuadro delimitador (*AABB*).
- **Prohibido:** Apuntar la cámara directamente a un solo objetivo ignorando a los demás oponentes en escena.

### 410. `camera-collision-occlusion-raycasting`
- **Regla:** Toda cámara personalizada en tercera persona debe implementar detección de oclusión geométrica mediante `workspace:Raycast` o `workspace:Shapecast` (con radio de esfera de 0.5 studs).
- **Estándar:** Acortar la distancia de la cámara hacia el avatar si hay una pared o techo sólido obstruyendo la línea de visión, filtrando al personaje local en el `RaycastParams`.

### 411. `camera-letterbox-cinematic-bars`
- **Regla:** El efecto de bandas negras de relación de aspecto panorámica (Letterboxing 21:9 o 2.39:1) debe implementarse mediante dos marcos `CanvasGroup` o `Frame` con `AnchorPoint` arriba y abajo, animados suavemente mediante `TweenService`.
- **Prohibido:** Tapar la interfaz de usuario crítica de accesibilidad o forzar bandas que no se puedan omitir en reintentos de cinemáticas.

### 412. `camera-dof-focus-pulling`
- **Regla:** Al enfocar personajes en cinemáticas de diálogo, sincronizar `DepthOfFieldEffect.FocusDistance` dinámicamente con la distancia euclidiana entre la lente de la cámara y la cabeza (`Head.Position`) del sujeto interactuante.

### 413. `camera-pan-tilt-roll-composition`
- **Regla:** Para impactos sísmicos o frenadas bruscas de vehículos, componer ángulos holandeses (*Dutch Angle*) mediante rotación en el eje Z (*Roll*) limitado a un máximo de $\pm 8^\circ$, retornando el ángulo a cero en reposo.

### 414. `camera-accessibility-anti-motion-sickness`
- **Regla:** Toda experiencia con sacudida de pantalla o FOV dinámico DEBE proveer en sus ajustes de accesibilidad la opción de reducir o apagar completamente el temblor de cámara (`ScreenShake = false`) y fijar el FOV (`ConstantFOV = true`).
- **Propósito:** Prevenir mareo por movimiento cinético (*motion sickness*) y accesibilidad para personas con trastornos vestibulares.

### 415. `camera-janitor-cleanup-unbind`
- **Regla:** Toda rutina conectada a `RunService:BindToRenderStep` debe desvincularse obligatoriamente al destruirse el controlador mediante `RunService:UnbindFromRenderStep(bindName)` o encapsularse en un `Janitor`.
- **Prohibido:** Dejar callbacks de renderizado corriendo en segundo plano tras salir de una cinemática o tras la muerte del personaje.

## Reglas Inviolables

1. **Nunca dejar la cámara en `CameraType.Scriptable` indefinidamente:** Toda transición a scriptable debe contar con un camino de retorno garantizado a `CameraType.Custom` si el jugador sufre respawn o se cancela la escena.
2. **Nunca actualizar la cámara en `Heartbeat` o `Stepped`:** La manipulación de cámara es exclusiva de `BindToRenderStep` o `RenderStepped` para garantizar sincronización perfecta con la tasa de refresco del monitor (60 - 144+ FPS).
3. **Prohibido el uso de `math.random` para Screen Shake:** Debe utilizarse exclusivamente `math.noise` tridimensional con decaimiento temporal continuo para evitar micro-saltos y fatiga ocular.
4. **Respetar opciones de accesibilidad de temblor:** Si el usuario activa "Reducir movimiento", el multiplicador de trauma debe ser forzado a `0.0`.
5. **Siempre desenlazar bindings de render:** Al concluir o abortar una secuencia de cámara, invocar `RunService:UnbindFromRenderStep` para evitar fugas de memoria y desincronización de hilos.


---

## 🎥 Anexo: Ciclo de Render y Cámara: PreRender (RunService 2026)
Para cinemáticas y controladores de cámara libres de temblores (*jitter*):
- **PreRender Obligatorio:** Toda actualización de `Camera.CFrame`, cinemáticas de resorte y FOV dinámico DEBE ejecutarse en `RunService.PreRender` (o `RenderStepped`).
- **Desacoplamiento de Física:** Nunca sincronizar la cámara en `PostSimulation` o `Heartbeat`, ya que se produce desfase temporal respecto al refresco del monitor del cliente.
