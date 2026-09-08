---
name: roblox-26-accessibility
description: "Rige la accesibilidad integral y diseño de experiencia inclusiva (skills 461-475) en Roblox 2026: modos para daltonismo (Protanopía, Deuteranopía, Tritanopía), contraste WCAG AA, autosizing de texto dinámico sin desbordamiento, remapeo de teclas con ContextActionService, subtítulos para audio espacial, retroalimentación háptica (HapticService) y modos de fotosensibilidad reducida. Úsala para certificar que cualquier usuario, independientemente de sus capacidades motoras, visuales o auditivas, pueda interactuar plenamente con la experiencia."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Accessibility & Inclusive UX"
  range: "461-475"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-26-accessibility — Accesibilidad y Experiencia Inclusiva (Skills 461 - 475)

Este módulo establece los estándares de ingeniería para hacer que las experiencias de Roblox sean accesibles, inclusivas y adaptables a todo tipo de jugadores. Cubre adaptaciones para discapacidades visuales (daltonismo, bajo contraste), auditivas (subtítulos cerrados direccionales), motoras (remapeo de controles, zonas de toque ampliadas) y neurológicas (fotosensibilidad y reducción de mareo).

## Catálogo de Habilidades Técnicas

### 461. `a11y-colorblind-matrix-correction`
- **Regla:** Implementar perfiles de post-procesamiento o paletas adaptativas para daltonismo: Protanopía (rojo débil), Deuteranopía (verde débil) y Tritanopía (azul débil).
- **Estándar:** Modificar los canales de color en la UI y balancear el entorno mediante `ColorCorrectionEffect` para asegurar diferenciación de elementos críticos (enemigo vs aliado, interactuable vs inerte).
- **Ejemplo:**
  ```luau
  --!strict
  export type ColorblindMode = "None" | "Protanopia" | "Deuteranopia" | "Tritanopia"

  local Lighting = game:GetService("Lighting")

  local function applyColorblindCorrection(mode: ColorblindMode)
      local cc = Lighting:FindFirstChild("A11yColorCorrection") :: ColorCorrectionEffect?
      if not cc then
          cc = Instance.new("ColorCorrectionEffect")
          cc.Name = "A11yColorCorrection"
          cc.Parent = Lighting
      end

      if mode == "Protanopia" then
          cc.TintColor = Color3.fromRGB(255, 235, 215)
          cc.Saturation = 0.2
      elseif mode == "Deuteranopia" then
          cc.TintColor = Color3.fromRGB(230, 240, 255)
          cc.Saturation = 0.25
      elseif mode == "Tritanopia" then
          cc.TintColor = Color3.fromRGB(255, 245, 220)
          cc.Saturation = 0.15
      else
          cc.TintColor = Color3.fromRGB(255, 255, 255)
          cc.Saturation = 0
      end
  end
  ```

### 462. `a11y-color-independent-signaling`
- **Regla:** Ningún elemento del juego debe comunicar información crítica de estado (éxito, peligro, selección) basándose ÚNICAMENTE en el color.
- **Estándar:** Acompañar siempre el cambio cromático de un icono inequívoco (e.g. cruz para error, marca de verificación para éxito, candado para bloqueado).

### 463. `a11y-dynamic-text-autosizing`
- **Regla:** Las fuentes deben responder al escalado de accesibilidad del usuario sin desbordar el contenedor de interfaz ni solaparse sobre otros widgets.
- **Estándar:** Usar `AutomaticSize = Enum.AutomaticSize.Y`, envolver con `TextWrapped = true` y limitar dimensiones máximas con `UISizeConstraint`.

### 464. `a11y-high-contrast-ui-palettes`
- **Regla:** Todo texto legible sobre fondos de interfaz debe cumplir con la especificación WCAG AA con una relación de contraste cromático mínima de **4.5:1** para texto normal y **3.0:1** para texto en negrita de gran tamaño ($> 18$ pt).

### 465. `a11y-custom-keybind-remapping`
- **Regla:** Las acciones de control primarias deben implementarse mediante `ContextActionService`, permitiendo al jugador reasignar teclas de teclado, botones de ratón y botones de mando en un menú dedicado de configuración.
- **Ejemplo:**
  ```luau
  --!strict
  local ContextActionService = game:GetService("ContextActionService")

  local function bindPlayerAction(
      actionName: string,
      defaultKey: Enum.KeyCode,
      handler: (string, Enum.UserInputState, InputObject) -> Enum.ContextActionResult
  )
      ContextActionService:BindAction(actionName, handler, true, defaultKey)
  end
  ```

### 466. `a11y-gamepad-gui-focus-navigation`
- **Regla:** Para jugadores que utilizan exclusivamente mando de consola o teclado sin ratón, la interfaz debe admitir navegación por cruceta (*D-Pad*) o flechas.
- **Estándar:** Establecer `GuiService.SelectedObject` al abrir cualquier menú modal y configurar explícitamente `NextSelectionDown`, `NextSelectionUp`, `NextSelectionLeft` y `NextSelectionRight` para evitar callejones sin salida de navegación.

### 467. `a11y-spatial-sound-visual-captions`
- **Regla:** Los efectos de audio que afecten la supervivencia o la jugabilidad (disparos, pasos de enemigos, alarmas) deben representarse visualmente en pantalla mediante subtítulos o indicadores direccionales alrededor de la retícula.
- **Ejemplo:**
  ```luau
  --!strict
  export type AudioCaption = {
      soundSource: Vector3,
      label: string,
      priority: number,
      timestamp: number,
  }
  ```

### 468. `a11y-haptic-feedback-actuation`
- **Regla:** Proporcionar respuesta táctil diferenciada mediante `HapticService:SetMotor()` en eventos de colisión, confirmación de acciones o daño recibido para jugadores que utilicen mandos con vibración o teléfonos móviles con soporte de retroalimentación háptica.

### 469. `a11y-reduced-motion-photosensitivity`
- **Regla:** Incluir en el menú de accesibilidad una opción global de "Reducir Movimiento".
- **Efecto:** Al estar activada, suprime sacudidas de pantalla de cámara (`trauma = 0`), desactiva desenfoque de movimiento (`BlurEffect = 0`) y desactiva oscilaciones parásitas de UI.

### 470. `a11y-screen-reader-gui-descriptions`
- **Regla:** En interfaces primarias de inventario y menús, añadir descripciones semánticas textuales en propiedades accesibles para permitir la lectura automatizada por software de asistencia o síntesis de voz.

### 471. `a11y-touch-target-minimum-dimensions`
- **Regla:** Todo botón táctil en pantalla para dispositivos móviles debe poseer una zona de toque efectiva mínima de **44 x 44 píxeles** (o DP equivalentes), evitando pulsaciones accidentales en botones adyacentes.

### 472. `a11y-audio-channel-balance-controls`
- **Regla:** El mezclador de audio debe separar el volumen general en canales independientes: Master, Música, Efectos de Sonido (SFX), Ambiente y Voces, con opción de activar modo "Audio Mono" que mezcle ambos canales en uno solo.

### 473. `a11y-hold-vs-toggle-interaction`
- **Regla:** Para cualquier interacción que requiera mantener pulsada una tecla (e.g. esprintar, apuntar, agacharse, interactuar con `ProximityPrompt`), ofrecer en configuración la alternativa de "Pulsar una vez (Toggle)" en lugar de "Mantener presionado (Hold)".

### 474. `a11y-flashing-light-epilepsy-guard`
- **Regla:** Queda terminantemente prohibido emitir luces parpadeantes o cambios bruscos de contraste a una frecuencia superior a **3 Hz** (3 destellos por segundo).
- **Propósito:** Cumplir con las directrices médicas internacionales para la prevención de ataques en personas con epilepsia fotosensible.

### 475. `a11y-preferences-persistence-sync`
- **Regla:** Las configuraciones de accesibilidad seleccionadas por el jugador deben guardarse de inmediato en su perfil de datos persistente (`DataStore`) para que persistan en todas las sesiones y servidores a los que acceda.

## Reglas Inviolables

1. **Prohibido basar información crítica únicamente en el color:** Todo indicador de alerta, salud o estado debe complementarse con iconos, textos o formas geométricas diferenciadas.
2. **Nunca superar 3 Hz en destellos visuales:** Ninguna habilidad, explosión o efecto de luz puede parpadear a frecuencias peligrosas para personas con epilepsia fotosensible.
3. **Garantizar navegación completa por Gamepad:** Todo menú accesible con ratón debe ser 100% navegable con mando mediante `GuiService.SelectedObject`.
4. **Zonas de toque mínimas de 44x44 px:** En interfaces móviles, ningún botón interactuable puede tener un área de pulsación inferior a este estándar ergonómico.
5. **Opción obligatoria de reducción de temblor de cámara:** Si el juego incorpora screen shake, debe existir un ajuste accesible para desactivarlo completamente.
