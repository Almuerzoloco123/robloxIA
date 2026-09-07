---
name: roblox-06-ui-ux-gui
description: "Skills 141-165: UI/UX Reactiva, UIAspectRatioConstraint, CanvasGroup, Safe Zones Móviles, Gamepad Navigation y Diseño Anti-Slop."
license: MIT
metadata:
  domain: "UI/UX & Reactive GUI"
  range: "141-165"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-06-ui-ux-gui — UI/UX, Interfaces Reactivas y HUD (Skills 141 - 165)

Este módulo rige el diseño de interfaces modernas, responsivas y visualmente sobrias para Roblox.

## Directrices Anti-Slop de Diseño Frontend
- **Sin degradados cliché:** Prohibidos degradados violeta/fucsia genéricos. Usar paletas intencionales y armónicas.
- **Sin anidación excesiva de tarjetas:** Mantener jerarquías visuales limpias.
- **Micro-interacciones táctiles:** Feedback instantáneo con `TweenService` al pasar el cursor o pulsar botones.

## Catálogo de Habilidades Técnicas

### 141. `ui-declarative-component-architecture`
- **Regla:** Separar la lógica del estado del árbol visual de instancias (usando patrones declarativos o controladores modulares).

### 142. `ui-resolution-aspect-ratio-lock`
- **Regla:** Uso estricto de `UIAspectRatioConstraint` en botones, iconos y modales para mantener proporciones idénticas en móviles, tablets y monitores ultrawide.

### 143. `ui-relative-scale-offset-best-practice`
- **Regla:** Emplear unidades `Scale` para dimensiones estructurales combinadas con `Offset` para márgenes (`UIPadding`) consistentes.

### 144. `ui-canvas-group-fading`
- **Regla:** Usar `CanvasGroup.GroupTransparency` para transiciones y fundidos de paneles complejos en una sola pasada de dibujo sin parpadeos.

### 145. `ui-safe-zone-mobile-insets`
- **Regla:** Ajustar dinámicamente las posiciones de los botones de borde respetando los recortes de pantalla (*notches*) móviles mediante `GuiService:GetGuiInset()` o `ScreenGui.ScreenInsets`.

### 146. `ui-gamepad-cross-navigation`
- **Regla:** Soportar navegación fluida con mandos de consola (Xbox / PlayStation) asegurando que `GuiService.SelectedObject` responda a las flechas del D-pad.

### 147. `ui-billboard-screen-clamping`
- **Regla:** Paneles de vida y nombres 3D sobre jugadores implementados con `BillboardGui`, configurados con límites de distancia de visión.
