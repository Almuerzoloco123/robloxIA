---
name: roblox-15-input-action-systems
description: "Rige la captura de entradas multiplataforma y sistemas de acción (skills 296-310): ContextActionService con prioridades y bindeos contextuales, UserInputService crudo, personalización táctil móvil dinámica, soporte completo para Gamepad con zonas muertas y GUI navigation, y arquitecturas de InputContext Stack. Úsala al programar controles de personajes, vehículos, menús de interfaz y esquemas de entrada en PC, móvil y consola."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Input & Cross-Platform Action Systems"
  range: "296-310"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-15-input-action-systems — Sistemas de Entrada y Acciones Multiplataforma (Skills 296 - 310)

Este módulo establece los estándares para el diseño de sistemas de entrada unificados y responsivos que operan sin fricción en teclado/ratón, mandos de consola (Xbox/PlayStation) y dispositivos táctiles móviles en Roblox Studio.

## Principio Fundamental: Abstracción Semántica de Acciones
Los sistemas de juego nunca deben escuchar teclas físicas directas de manera aislada. Toda acción del jugador debe tratarse como una intención abstracta (*"FireAction"*, *"JumpAction"*, *"InteractAction"*) gestionada por capas de prioridad y contextos intercambiables.

---

## Catálogo de Habilidades Técnicas

### 296. `input-cas-cross-platform-binding`
- **Regla:** Utilizar `ContextActionService:BindAction()` para asociar una misma intención de juego a múltiples periféricos simultáneamente (tecla física, botón de gamepad y botón en pantalla móvil).
- **Estándar:**
```luau
--!strict
local ContextActionService = game:GetService("ContextActionService")

local function bindPlayerInteract(callback: (actionName: string, state: Enum.UserInputState, input: InputObject) -> Enum.ContextActionResult)
    ContextActionService:BindAction(
        "PlayerInteract",
        callback,
        true, -- Crear botón móvil táctil automáticamente si procede
        Enum.KeyCode.E,
        Enum.KeyCode.ButtonX
    )
end
```

### 297. `input-action-priority-stacking`
- **Regla:** Emplear `BindActionAtPriority()` con valores enteros explícitos (`Enum.ContextActionPriority`) y retornar `Enum.ContextActionResult.Sink` para consumir la acción o `Pass` para permitir propagación a capas inferiores.
```luau
--!strict
local ContextActionService = game:GetService("ContextActionService")

local PRIORITY_MODAL_MENU = Enum.ContextActionPriority.High.Value + 100

local function bindPauseMenuBack(onBack: () -> ())
    ContextActionService:BindActionAtPriority(
        "PauseMenuBack",
        function(actionName, inputState, inputObject)
            if inputState == Enum.UserInputState.Begin then
                onBack()
                return Enum.ContextActionResult.Sink
            end
            return Enum.ContextActionResult.Pass
        end,
        false,
        PRIORITY_MODAL_MENU,
        Enum.KeyCode.Escape,
        Enum.KeyCode.ButtonB
    )
end
```

### 298. `input-uis-hardware-detection-adaptation`
- **Regla:** Detectar los tipos de hardware disponibles en tiempo de ejecución mediante `UserInputService` (`TouchEnabled`, `KeyboardEnabled`, `GamepadEnabled`) para adaptar dinámicamente el HUD y los esquemas visuales.
```luau
--!strict
local UserInputService = game:GetService("UserInputService")

export type ActiveDeviceType = "Desktop" | "Mobile" | "Console"

local function detectPrimaryDevice(): ActiveDeviceType
    if UserInputService.GamepadEnabled and not UserInputService.KeyboardEnabled then
        return "Console"
    elseif UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
        return "Mobile"
    else
        return "Desktop"
    end
end
```

### 299. `input-mobile-dynamic-thumbstick-tuning`
- **Regla:** Adaptar el movimiento móvil analógico respetando la configuración nativa `TouchMovementMode` del jugador y proporcionando zonas seguras de interacción ergonómicas.
```luau
--!strict
local UserInputService = game:GetService("UserInputService")
local userGameSettings = UserSettings():GetService("UserGameSettings")

local function isTouchMovementActive(): boolean
    return UserInputService.TouchEnabled and (
        userGameSettings.TouchMovementMode == Enum.TouchMovementMode.DynamicThumbstick
        or userGameSettings.TouchMovementMode == Enum.TouchMovementMode.Default
    )
end
```

### 300. `input-cas-touch-button-styling`
- **Regla:** Personalizar los botones generados por `ContextActionService` recuperando la instancia con `ContextActionService:GetButton()` y estilizando tamaño, icono y posición para ergonomía en pantalla táctil.
```luau
--!strict
local ContextActionService = game:GetService("ContextActionService")

local function styleActionButton(actionName: string, iconAssetId: string)
    local button = ContextActionService:GetButton(actionName)
    if button and button:IsA("ImageButton") then
        button.Size = UDim2.new(0, 64, 0, 64)
        button.Image = iconAssetId
        button.Position = UDim2.new(0.85, -32, 0.75, -32)
    end
end
```

### 301. `input-gamepad-gui-navigation-core`
- **Regla:** Garantizar compatibilidad absoluta con mandos de consola habilitando `GuiService.SelectedObject` al abrir cualquier menú o interfaz modal interactiva.
```luau
--!strict
local GuiService = game:GetService("GuiService")

local function setModalFocus(firstSelectableButton: GuiButton?)
    if firstSelectableButton then
        firstSelectableButton.Selectable = true
        GuiService.SelectedObject = firstSelectableButton
    else
        GuiService.SelectedObject = nil
    end
end
```

### 302. `input-gamepad-thumbstick-deadzone`
- **Regla:** Aplicar un filtrado de zona muerta radial a las lecturas continuas del joystick para eliminar deriva (*drifting*) por desgaste físico del hardware del mando.
```luau
--!strict
local DEADZONE_THRESHOLD = 0.2

local function filterAnalogStick(rawVector: Vector3): Vector2
    local input2D = Vector2.new(rawVector.X, rawVector.Y)
    local magnitude = input2D.Magnitude
    if magnitude < DEADZONE_THRESHOLD then
        return Vector2.zero
    end

    -- Normalizar y reescalar suavemente entre 0 y 1
    local normalized = input2D.Unit
    local scaledMagnitude = (magnitude - DEADZONE_THRESHOLD) / (1 - DEADZONE_THRESHOLD)
    return normalized * math.clamp(scaledMagnitude, 0, 1)
end
```

### 303. `input-context-stack-manager`
- **Regla:** Implementar una pila de contextos de entrada (*Input Context Stack*) donde solo el contexto superior tenga autoridad sobre las acciones del jugador.
```luau
--!strict
local ContextActionService = game:GetService("ContextActionService")

export type InputContext = {
    Name: string,
    Actions: { string },
    OnEnter: () -> (),
    OnExit: () -> (),
}

local ContextStack = {}
local currentContext: InputContext? = nil

local function pushContext(newContext: InputContext)
    if currentContext then
        currentContext.OnExit()
    end
    table.insert(ContextStack, newContext)
    currentContext = newContext
    newContext.OnEnter()
end

local function popContext()
    if #ContextStack == 0 then return end
    local removed = table.remove(ContextStack)
    if removed then
        removed.OnExit()
    end
    currentContext = ContextStack[#ContextStack]
    if currentContext then
        currentContext.OnEnter()
    end
end
```

### 304. `input-mouse-delta-camera-custom`
- **Regla:** En mecánicas de torreta o primera persona personalizada, calcular deltas de rotación en el evento `UserInputService.InputChanged` cuando el tipo de entrada sea `Enum.UserInputType.MouseMovement`.
```luau
--!strict
local UserInputService = game:GetService("UserInputService")

local function bindMouseRotation(onDelta: (delta: Vector2) -> ()): RBXScriptConnection
    return UserInputService.InputChanged:Connect(function(input, gameProcessed)
        if input.UserInputType == Enum.UserInputType.MouseMovement then
            local delta = Vector2.new(input.Delta.X, input.Delta.Y)
            onDelta(delta)
        end
    end)
end
```

### 305. `input-touch-gestures-pinch-pan`
- **Regla:** Utilizar eventos nativos táctiles (`TouchPinch`, `TouchPan`) de `UserInputService` para zoom de cámara o rotación de modelos en visores 3D de inventario.
```luau
--!strict
local UserInputService = game:GetService("UserInputService")

local function bindTouchZoom(onScaleChange: (scale: number) -> ()): RBXScriptConnection
    return UserInputService.TouchPinch:Connect(function(touchPositions, scale, velocity, state)
        if state == Enum.UserInputState.Change then
            onScaleChange(scale)
        end
    end)
end
```

### 306. `input-cross-platform-prompt-hints`
- **Regla:** Escuchar el último tipo de entrada activo (`UserInputService.LastInputTypeChanged`) para actualizar dinámicamente las etiquetas visuales de los botones de interacción en el HUD ([E] vs [X] vs Tap).
```luau
--!strict
local UserInputService = game:GetService("UserInputService")

local function getGlyphForAction(actionName: string, lastInput: Enum.UserInputType): string
    if lastInput == Enum.UserInputType.Gamepad1 then
        return "[X]"
    elseif lastInput == Enum.UserInputType.Touch then
        return "[Tocar]"
    else
        return "[E]"
    end
end
```

### 307. `input-accelerometer-gyroscope-mobile`
- **Regla:** Consultar `UserInputService.GyroscopeEnabled` y capturar `UserInputService.DeviceRotationChanged` para mecánicas de balanceo o puntería por giroscopio móvil.
```luau
--!strict
local UserInputService = game:GetService("UserInputService")

local function setupGyroAim(onRotated: (cframe: CFrame) -> ())
    if UserInputService.GyroscopeEnabled then
        UserInputService.DeviceRotationChanged:Connect(function(rotationCFrame: CFrame)
            onRotated(rotationCFrame)
        end)
    end
end
```

### 308. `input-mouse-lock-shift-lock-integration`
- **Regla:** Gestionar el modo de bloqueo de ratón (*Shift Lock*) de forma no destructiva respetando la configuración del menú del jugador sin sobrescribir el módulo Core de cámara.
```luau
--!strict
local UserInputService = game:GetService("UserInputService")

local function toggleMouseCenterLock(enable: boolean)
    if enable then
        UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter
    else
        UserInputService.MouseBehavior = Enum.MouseBehavior.Default
    end
end
```

### 309. `input-buffer-action-queuing`
- **Regla:** Implementar un búfer de entrada de corta duración (100 - 200 ms) para combos de combate o saltos precisos, permitiendo que las acciones pulsadas durante una animación de recuperación se ejecuten de inmediato al finalizar.
```luau
--!strict
local BUFFER_WINDOW_SECONDS = 0.15

export type InputBuffer = {
    BufferedAction: string?,
    Timestamp: number,
    RecordAction: (self: InputBuffer, action: string) -> (),
    ConsumeAction: (self: InputBuffer) -> string?,
}

local function createInputBuffer(): InputBuffer
    local self = {
        BufferedAction = nil,
        Timestamp = 0,
    } :: InputBuffer

    function self:RecordAction(action: string)
        self.BufferedAction = action
        self.Timestamp = os.clock()
    end

    function self:ConsumeAction(): string?
        if self.BufferedAction and (os.clock() - self.Timestamp <= BUFFER_WINDOW_SECONDS) then
            local action = self.BufferedAction
            self.BufferedAction = nil
            return action
        end
        self.BufferedAction = nil
        return nil
    end

    return self
end
```

### 310. `input-unbind-cleanup-lifecycle`
- **Regla:** Desvincular incondicionalmente las acciones registradas con `ContextActionService:UnbindAction()` y desconectar conexiones de eventos cuando un elemento de interfaz o script de control sea destruido o desmontado.
```luau
--!strict
local ContextActionService = game:GetService("ContextActionService")

local function cleanupActions(actionNames: { string })
    for _, actionName in ipairs(actionNames) do
        ContextActionService:UnbindAction(actionName)
    end
end
```

---

## Reglas Inviolables

1. **Jerarquía con ContextActionService:** Toda acción interactiva de jugabilidad debe vincularse preferentemente mediante `ContextActionService` en lugar de conexiones globales en `UserInputService`, asegurando el retorno correcto de `Sink` o `Pass`.
2. **Equivalencia Multiplataforma Obligatoria:** Ninguna mecánica del juego puede depender exclusivamente de teclas de teclado físico. Toda acción DEBE tener mapeo equivalente para Gamepad y botón táctil móvil.
3. **Manejo de Zona Muerta en Mandos:** Es obligatorio aplicar un umbral de zona muerta ($\ge 0.18$) a cualquier lectura continua de joysticks analógicos para prevenir deriva accidental de cámara o movimiento.
4. **Navegación de Foco en Interfaz:** Todo menú desplegable o modal interactivo DEBE soportar navegación por mando asignando `GuiService.SelectedObject` al botón primario predeterminado al abrirse.
5. **Limpieza Rigurosa de Acciones (`UnbindAction`):** Al cerrar menús, cambiar de contexto o morir el personaje, todas las acciones temporales deben desvincularse para evitar ejecuciones fantasmas en estados inválidos.
