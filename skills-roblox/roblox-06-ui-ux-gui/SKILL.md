---
name: roblox-06-ui-ux-gui
description: "Rige el desarrollo de interfaces de usuario en Roblox (skills 141-165): componentes declarativos, CanvasGroup, navegación con mando, diseño responsivo móvil y efectos visuales de GUI. Úsala al menús, HUDs de combate, inventarios o sistemas de accesibilidad de interfaz."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "UI/UX & Reactive GUI"
  range: "141-165"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-06-ui-ux-gui — UI/UX y Sistemas de Interfaz Reactiva (Skills 141 - 165)

Este módulo rige la creación de interfaces de usuario escalables, accesibles y de alto rendimiento en Roblox 2026.

## Principios Fundamentales
- **Diseño Responsivo Multiplataforma:** Uso de proporciones `Scale` y restricciones de relación de aspecto para compatibilidad móvil, consola y PC.
- **CanvasGroup para Transiciones:** Aplicación de `CanvasGroup.GroupTransparency` para desvanecimientos fluidos sin recalcular jerarquías internas.
- **Soporte Completo de Mando:** Configuración explícita de navegación espacial con gamepad para accesibilidad en consola.

## Catálogo de Habilidades Técnicas

### 141. `ui-declarative-component-architecture`
- **Regla:** Estructurar interfaces de usuario mediante componentes desacoplados y reutilizables siguiendo patrones declarativos.

### 142. `ui-state-store-management`
- **Regla:** Gestionar el estado global de la interfaz mediante flujos unidireccionales de datos (state stores o stores reactivos).

### 143. `ui-resolution-aspect-ratio-lock`
- **Regla:** Utilizar UIAspectRatioConstraint para mantener la proporción de diseño idéntica en pantallas cuadradas y ultra-panorámicas.

### 144. `ui-relative-scale-offset-best-practice`
- **Regla:** Priorizar Scale para posicionamiento y dimensionamiento responsivo, reservando Offset para bordes y márgenes fijos.

### 145. `ui-automatic-size-scrolling-frame`
- **Regla:** Configurar AutomaticSize y AutomaticCanvasSize en ScrollingFrames para contenido de tamaño variable sin recortes.

### 146. `ui-responsive-grid-wrap`
- **Regla:** Emplear UIGridLayout y UIPageLayout para acomodar listas dinámicas de ítems e inventarios con ajuste fluido de columnas.

### 147. `ui-tween-service-transitions`
- **Regla:** Animar propiedades visuales con TweenService aplicando curvas de aceleración (EasingDirection/EasingStyle) suaves.

### 148. `ui-spring-motion-physics`
- **Regla:** Utilizar ecuaciones de resorte para animaciones interactivas elásticas y naturales en respuestas táctiles y modales.

### 149. `ui-rich-text-formatting`
- **Regla:** Aprovechar etiquetas RichText de Roblox (<font>, <b>, <stroke>) para textos dinámicos con formato avanzado.

### 150. `ui-canvas-group-fading`
- **Regla:** Utilizar CanvasGroup para aplicar desvanecimientos globales de opacidad (GroupTransparency) a jerarquías completas de UI sin fallos de composición.

### 151. `ui-gradient-animation-effects`
- **Regla:** Animar la propiedad Offset de UIGradient para simular efectos de brillo metálico o desplazamiento de energía en barras.

### 152. `ui-stroke-corner-modern-design`
- **Regla:** Aplicar UICorner y UIStroke con ApplyStrokeMode = Border para lograr estéticas modernas de bordes pulidos y tarjetas elevadas.

### 153. `ui-haptic-mobile-feedback`
- **Regla:** Activar vibraciones y retroalimentación háptica (HapticService) en dispositivos móviles ante eventos de interfaz significativos.

### 154. `ui-gamepad-cross-navigation`
- **Regla:** Configurar GuiService.SelectedObject y propiedades NextSelection para garantizar navegación fluida con mandos y consolas.

### 155. `ui-billboard-screen-clamping`
- **Regla:** Fijar AlwaysOnTop y MaxDistance en BillboardGuis e implementar clamp para mantener etiquetas importantes dentro de la pantalla.

### 156. `ui-surfacegui-interactive-displays`
- **Regla:** Proyectar SurfaceGuis sobre superficies 3D interactivas con PixelsPerStud calibrado para pantallas y terminales en el juego.

### 157. `ui-sound-hover-click-bindings`
- **Regla:** Vincular efectos de sonido de clic y sobrevuelo (hover) estandarizados a todos los botones interactivos de la interfaz.

### 158. `ui-cooldown-radial-radialwipe`
- **Regla:** Crear indicadores de tiempo de reutilización de habilidades mediante máscaras radiales o UIGradient rotativo.

### 159. `ui-damage-indicator-floating-numbers`
- **Regla:** Generar números de daño flotantes animados con desplazamiento vertical y desvanecimiento progresivo.

### 160. `ui-custom-mouse-cursor-icon`
- **Regla:** Cambiar y restaurar el icono del cursor (UserInputService.OverrideMouseIcon) de forma limpia según el contexto de la acción.

### 161. `ui-accessibility-text-contrast`
- **Regla:** Garantizar contrastes de color adecuados entre el texto y los fondos para cumplimiento de pautas de accesibilidad visual.

### 162. `ui-safe-zone-mobile-insets`
- **Regla:** Respetar GuiService:GetGuiInset() para no ubicar elementos interactivos debajo de los notches o barras de navegación móviles.

### 163. `ui-drag-and-drop-inventory`
- **Regla:** Implementar mecánicas de arrastrar y soltar ítems entre casillas de inventario con validación de posición y retorno ante soltado inválido.

### 164. `ui-tooltip-context-system`
- **Regla:** Mostrar ventanas emergentes de ayuda contextual (tooltips) tras una pausa del cursor sobre ítems o habilidades.

### 165. `ui-virtual-keyboard-handling`
- **Regla:** Adaptar la posición de campos de entrada de texto (TextBox) cuando el teclado virtual táctil se despliega en pantalla.
