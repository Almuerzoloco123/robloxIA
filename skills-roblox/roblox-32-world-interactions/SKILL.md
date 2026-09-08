---
name: roblox-32-world-interactions
description: "Gobierna las interacciones del mundo 3D y elementos contextuales en Roblox (skills 551-565): configuración avanzada de ProximityPrompt (HoldDuration, MaxActivationDistance, Exclusivity, LineOfSight), optimización de ClickDetector, feedback visual dinámico (Hover Highlights y custom prompts), cinemática de puertas interactivas, cofres de botín con cooldown server-authoritative y recogida de ítems en el suelo. Úsala al implementar sistemas de saqueo, puertas, vehículos, palancas o cualquier interacción ambiental."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "World Interactions & Prompts"
  range: "551-565"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-32-world-interactions — Interacciones con el Mundo, Prompts y Cofres (Skills 551 - 565)

Este módulo establece los estándares técnicos de ingeniería para sistemas de interacción contextual en el espacio tridimensional, optimización de señales y sincronización autoritativa bajo Luau 2026.

## Catálogo de Habilidades Técnicas

### 551. `interact-proximity-prompt-lifecycle`
- **Regla:** Configurar explícitamente las propiedades clave de todo `ProximityPrompt`: `HoldDuration`, `MaxActivationDistance`, `RequiresLineOfSight`, `KeyboardKeyCode`, `ActionText` y `ObjectText`.
- **Ejemplo:**
  ```luau
  --!strict
  local function createInteractPrompt(parent: BasePart, actionText: string, objectText: string, holdTime: number): ProximityPrompt
      local prompt = Instance.new("ProximityPrompt")
      prompt.ActionText = actionText
      prompt.ObjectText = objectText
      prompt.HoldDuration = holdTime
      prompt.MaxActivationDistance = 10
      prompt.RequiresLineOfSight = true
      prompt.KeyboardKeyCode = Enum.KeyCode.E
      prompt.Parent = parent
      return prompt
  end
  ```

### 552. `interact-prompt-exclusivity-policy`
- **Regla:** En zonas densas en interactivos (mercados, forjas, consolas), asignar `Exclusivity = Enum.ProximityPromptExclusivity.OnePerButton` para impedir la superposición y activación accidental de múltiples prompts con la misma pulsación.
- **Ejemplo:**
  ```luau
  --!strict
  local function configurePromptExclusivity(prompt: ProximityPrompt)
      prompt.Exclusivity = Enum.ProximityPromptExclusivity.OnePerButton
  end
  ```

### 553. `interact-line-of-sight-clearance`
- **Regla:** Mantener siempre `RequiresLineOfSight = true` en prompts situados en interiores. Al disparar el evento en el servidor, validar adicionalmente mediante un raycast corto que no existan muros oclusivos entre el jugador y el objeto.
- **Ejemplo:**
  ```luau
  --!strict
  local function verifyLineOfSightServer(playerRoot: BasePart, targetPart: BasePart): boolean
      local origin = playerRoot.Position
      local direction = targetPart.Position - origin
      local params = RaycastParams.new()
      params.FilterType = Enum.RaycastFilterType.Exclude
      params.FilterDescendantsInstances = { playerRoot.Parent, targetPart }

      local result = workspace:Raycast(origin, direction, params)
      return result == nil -- Sin obstrucciones en la trayectoria
  end
  ```

### 554. `interact-custom-billboard-hover-feedback`
- **Regla:** Para interfaces de interacción de alta fidelidad, deshabilitar el renderizado por defecto configurando `prompt.Style = Enum.ProximityPromptStyle.Custom` en la instancia y suscribirse a `PromptShown` y `PromptHidden` de `ProximityPromptService` en el cliente.
- **Ejemplo:**
  ```luau
  --!strict
  local ProximityPromptService = game:GetService("ProximityPromptService")

  local function setupCustomPromptListener(onShow: (ProximityPrompt) -> (), onHide: (ProximityPrompt) -> ())
      ProximityPromptService.PromptShown:Connect(function(prompt, inputType)
          onShow(prompt)
      end)
      ProximityPromptService.PromptHidden:Connect(function(prompt)
          onHide(prompt)
      end)
  end
  ```

### 555. `interact-click-detector-surface-optimization`
- **Regla:** En objetos que requieran clic de ratón directo, limitar `ClickDetector.MaxActivationDistance` a no más de 16 studs y desactivar el detector (`MaxActivationDistance = 0`) cuando la entidad esté inactiva.
- **Ejemplo:**
  ```luau
  --!strict
  local function toggleClickDetector(detector: ClickDetector, isActive: boolean)
      detector.MaxActivationDistance = if isActive then 12 else 0
  end
  ```

### 556. `interact-interactive-door-kinematics`
- **Regla:** La apertura de puertas cinemáticas debe ejecutarse en el servidor mediante `TweenService` sobre el `PrimaryPartCFrame` o una articulación `HingeConstraint`, validando que la puerta no esté bloqueada antes de comenzar.
- **Ejemplo:**
  ```luau
  --!strict
  local TweenService = game:GetService("TweenService")

  local function animateDoorOpen(doorModel: Model, targetPivot: CFrame, duration: number)
      local pivotValue = Instance.new("CFrameValue")
      pivotValue.Value = doorModel:GetPivot()
      
      local tween = TweenService:Create(pivotValue, TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
          Value = targetPivot,
      })
      
      pivotValue.Changed:Connect(function(newCFrame)
          doorModel:PivotTo(newCFrame)
      end)

      tween.Completed:Connect(function()
          pivotValue:Destroy()
      end)

      tween:Play()
  end
  ```

### 557. `interact-chest-loot-server-cooldown`
- **Regla:** Los cofres deben registrar un diccionario de marcas temporales por `UserId` en el servidor. Si un jugador intenta abrir el cofre antes de culminar el cooldown individual, rechazar la transacción.
- **Ejemplo:**
  ```luau
  --!strict
  export type ChestCooldowns = { [number]: number }

  local function canOpenChest(cooldowns: ChestCooldowns, userId: number, cooldownSeconds: number): boolean
      local lastOpen = cooldowns[userId] or 0
      local now = os.clock()
      if now - lastOpen >= cooldownSeconds then
          cooldowns[userId] = now
          return true
      end
      return false
  end
  ```

### 558. `interact-dynamic-item-pickup-prompt`
- **Regla:** Para objetos de botín soltados dinámicamente, asociar un `ProximityPrompt` instantáneo (`HoldDuration = 0`), programar su autodestrucción tras 60 segundos si nadie lo recoge y transferir el ítem al inventario seguro del servidor.
- **Ejemplo:**
  ```luau
  --!strict
  local function attachLootPrompt(dropItem: Model, onPicked: (Player) -> ())
      local root = dropItem.PrimaryPart or dropItem:FindFirstChildWhichIsA("BasePart")
      if not root then return end

      local prompt = Instance.new("ProximityPrompt")
      prompt.ActionText = "Recoger"
      prompt.ObjectText = dropItem.Name
      prompt.HoldDuration = 0
      prompt.MaxActivationDistance = 8
      prompt.Parent = root

      local conn: RBXScriptConnection? = nil
      conn = prompt.Triggered:Connect(function(player)
          if conn then conn:Disconnect() end
          prompt.Enabled = false
          onPicked(player)
          dropItem:Destroy()
      end)

      task.delay(60, function()
          if dropItem.Parent then
              dropItem:Destroy()
          end
      end)
  end
  ```

### 559. `interact-vehicle-seat-entry-prompt`
- **Regla:** El abordaje de vehículos o monturas debe realizarse mediante un `ProximityPrompt` que valide propiedad, verifique que el asiento esté desocupado y siente al personaje con `VehicleSeat:Sit(humanoid)`.
- **Ejemplo:**
  ```luau
  --!strict
  local function bindVehicleEntry(seat: VehicleSeat, prompt: ProximityPrompt)
      prompt.Triggered:Connect(function(player)
          local char = player.Character
          if not char then return end
          local humanoid = char:FindFirstChildOfClass("Humanoid")
          if humanoid and seat.Occupant == nil then
              seat:Sit(humanoid)
          end
      end)
  end
  ```

### 560. `interact-lever-button-toggle-state`
- **Regla:** Las palancas e interruptores deben mantener un atributo booleano `IsActive` autoritativo en el servidor, emitiendo sonido 3D y actualizando su orientación física tras cada pulsación legal.
- **Ejemplo:**
  ```luau
  --!strict
  local function toggleLever(leverModel: Model)
      local currentState = leverModel:GetAttribute("IsActive") == true
      local newState = not currentState
      leverModel:SetAttribute("IsActive", newState)
  end
  ```

### 561. `interact-player-holding-animation-sync`
- **Regla:** Sincronizar animaciones de mantenimiento (hurgar cerradura, registrar contenedor) mediante `PromptButtonHoldBegan` y detenerlas en `PromptButtonHoldEnded` para asegurar coherencia visual.
- **Ejemplo:**
  ```luau
  --!strict
  local function bindHoldAnimation(prompt: ProximityPrompt, track: AnimationTrack)
      prompt.PromptButtonHoldBegan:Connect(function()
          track:Play(0.2)
      end)
      prompt.PromptButtonHoldEnded:Connect(function()
          track:Stop(0.2)
      end)
  end
  ```

### 562. `interact-prompt-visibility-filtering`
- **Regla:** Cuando un jugador no cumpla los requisitos para interactuar (falta llave o nivel insuficiente), ocultar el prompt localmente con `prompt.Enabled = false` en un script de cliente para no saturar la interfaz.
- **Ejemplo:**
  ```luau
  --!strict
  local function updatePromptVisibilityLocal(prompt: ProximityPrompt, playerHasKey: boolean)
      prompt.Enabled = playerHasKey
  end
  ```

### 563. `interact-multiplayer-coop-activation`
- **Regla:** En puertas o mecanismos que requieran la activación simultánea de dos o más jugadores, mantener un registro de activaciones activas en el servidor y disparar la compuerta únicamente cuando el quórum requerido se alcance dentro de una ventana de tiempo.
- **Ejemplo:**
  ```luau
  --!strict
  export type PlateQuorum = { [string]: boolean }

  local function evaluateCoopQuorum(quorum: PlateQuorum, requiredCount: number, onUnlock: () -> ())
      local activeCount = 0
      for _, active in quorum do
          if active then activeCount += 1 end
      end
      if activeCount >= requiredCount then
          onUnlock()
      end
  end
  ```

### 564. `interact-highlight-on-proximity-hover`
- **Regla:** Aplicar feedback visual de contorno creando un `Highlight` efímero sobre el modelo interactivo únicamente cuando el jugador entra en el radio de acción del prompt (respetando la capacidad del motor de hasta 255 Highlights simultáneos y un presupuesto visual recomendado $\le 30$ activos para evitar sobrecarga de render).
- **Ejemplo:**
  ```luau
  --!strict
  local function attachProximityHighlight(prompt: ProximityPrompt, targetModel: Model): RBXScriptConnection
      return prompt.PromptShown:Connect(function()
          local highlight = Instance.new("Highlight")
          highlight.Adornee = targetModel
          highlight.FillTransparency = 0.8
          highlight.OutlineColor = Color3.fromRGB(255, 220, 100)
          highlight.Parent = targetModel

          local conn: RBXScriptConnection? = nil
          conn = prompt.PromptHidden:Connect(function()
              if conn then conn:Disconnect() end
              highlight:Destroy()
          end)
      end)
  end
  ```

### 565. `interact-prompt-disposal-cleanup`
- **Regla:** Toda eliminación o despawn de objetos interactivos debe desvincular explícitamente sus conexiones de eventos y destruir el `ProximityPrompt` para prevenir disparos fantasmas.
- **Ejemplo:**
  ```luau
  --!strict
  local function teardownInteractable(prompt: ProximityPrompt, interactableInstance: Instance)
      prompt.Enabled = false
      prompt:Destroy()
      interactableInstance:Destroy()
  end
  ```

## Reglas Inviolables

1. **Revalidación server-side de distancia:** El servidor nunca debe ejecutar una acción detonada por `ProximityPrompt.Triggered` sin volver a verificar que la distancia entre el `HumanoidRootPart` del jugador y el objeto sea $\le MaxActivationDistance + 3.0$ studs.
2. **Línea de visión estricta:** `RequiresLineOfSight` debe mantenerse en `true` para todo objeto interactivo salvo que el objeto sea explícitamente etéreo o telepático.
3. **Desconexión inmediata al morir:** Si un jugador muere o se desmaya durante el `HoldDuration`, la interacción en curso debe ser cancelada de inmediato en el servidor y cliente.
4. **Presupuesto visual de Highlights:** Prohibido dejar instancias `Highlight` permanentes en objetos interactivos del mundo; crearlas y destruirlas dinámicamente según la proximidad del jugador local.
5. **Protección contra spam de disparos:** Desactivar temporalmente el prompt o verificar cooldowns en el servidor al recibir la señal para evitar ejecución múltiple por clics o paquetes repetidos.
