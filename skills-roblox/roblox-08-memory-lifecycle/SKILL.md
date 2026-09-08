---
name: roblox-08-memory-lifecycle
description: "Rige la auditoría de memoria y ciclo de vida de instancias (skills 186-210): patrón Janitor, erradicación de fugas, desconexión de RBXScriptConnection, pooling con PartCache y optimizaciones MicroProfiler. Úsala al gestionar recursos dinámicos, destruir entidades, crear proyectiles o diagnosticar caídas de FPS."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Memory & Janitor Auditing"
  range: "186-210"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-08-memory-lifecycle — Gestión de Memoria, Ciclo de Vida y Janitor (Skills 186 - 210)

Este módulo rige la erradicación de fugas de memoria y la estabilidad a 60 FPS en experiencias de Roblox.

## Catálogo de Habilidades Técnicas

### 186. `memory-janitor-class-lifecycle`
- **Regla:** Vincular todas las conexiones y objetos temporales de una clase a una instancia `Janitor` central, limpiando con `janitor:Destroy()`.

### 187. `memory-maid-pattern-cleanup`
- **Regla:** Implementar patrones de limpieza que garanticen la desconexión total de eventos al retirar entidades del juego.

### 188. `memory-rbxscript-disconnect-assert`
- **Regla:** Asegurar que toda llamada a `:Connect()` tenga su correspondiente llamada a `:Disconnect()` al finalizar su propósito.

### 189. `memory-instance-destroy-recursive`
- **Regla:** Invocar `:Destroy()` en instancias descartadas para romper vínculos de propiedades, limpiar scripts y liberar referencias de motor.

### 190. `memory-closure-circular-ref-purge`
- **Regla:** Eliminar referencias circulares en funciones anónimas y tablas que impidan la recolección de basura por el recolector de Luau.

### 191. `memory-developer-console-profiling`
- **Regla:** Inspeccionar pestañas de Memoria en la Consola de Desarrollador (F9) vigilando picos en `LuaHeap` o `Instances`.

### 192. `memory-microprofiler-scope-markers`
- **Regla:** Envolver bloques de código pesados con `debug.profilebegin()` y `debug.profileend()` para análisis de cuadros en MicroProfiler.

### 193. `memory-part-cache-projectile-pooling`
- **Regla:** Reutilizar proyectiles y efectos visuales mediante pooling de objetos (`PartCache`) en lugar de instanciar y destruir repetidamente.

### 194. `memory-texture-budget-optimization`
- **Regla:** Limitar resoluciones de texturas PBR a 1024x1024 como máximo, reutilizando atlas de texturas comunes.

### 195. `memory-physics-sleep-optimization`
- **Regla:** Anclar partes estáticas (`Anchored = true`) para permitir que el motor de física las ponga en estado de reposo (*sleep*).

### 196. `memory-collision-group-matrix`
- **Regla:** Desactivar chequeos de colisión innecesarios entre grupos de entidades no interactuables.

### 197. `memory-raycast-params-reuse`
- **Regla:** Reutilizar instancias `RaycastParams` preasignadas en lugar de instanciar nuevas en bucles de cuadro.

### 198. `memory-table-clear-recycling`
- **Regla:** Limpiar arrays temporales con `table.clear(tbl)` para reusar memoria asignada sin provocar reubicaciones de heap.

### 199. `memory-bulk-instance-move-pivot`
- **Regla:** Mover agrupaciones masivas de partes utilizando `workspace:BulkMoveTo()` para mínimo costo de sincronización.

### 200. `memory-spatial-hash-broadphase`
- **Regla:** Emplear particionamiento espacial en celdas para limitar comprobaciones de proximidad solo a entidades cercanas.

### 201. `memory-animation-track-limit-cache`
- **Regla:** Cargar pistas de animación una sola vez y mantenerlas cacheadas en el Animator del personaje.

### 202. `memory-cframe-math-precomputation`
- **Regla:** Precalcular matrices trigonométricas y constantes de rotación fuera de los bucles de cuadro.

### 203. `memory-streaming-pause-mode-handling`
- **Regla:** Gestionar correctamente el estado de pausa y reanudación de entidades al descargarse regiones con StreamingEnabled.

### 204. `memory-weak-metatable-tables`
- **Regla:** Emplear tablas con referencias débiles (`__mode = "k"` o `"v"`) en cachés para permitir recolección de basura automática.

### 205. `memory-task-cancel-threads`
- **Regla:** Cancelar hilos pendientes agendados con `task.delay` o `task.defer` mediante `task.cancel(thread)` al destruir el objeto.

### 206. `memory-ui-offscreen-rendering-disable`
- **Regla:** Desactivar `Visible = false` o `Enabled = false` en elementos de interfaz fuera de pantalla para ahorrar renderizado.

### 207. `memory-draw-call-batching`
- **Regla:** Agrupar geometrías con el mismo material y color para permitir el batching automático del motor gráfico.

### 208. `memory-light-shadow-limit`
- **Regla:** Limitar el número de fuentes de luz con sombras activadas (`Shadows = true`) visibles simultáneamente en pantalla.

### 209. `memory-character-appearance-preload`
- **Regla:** Precargar apariencias de avatares mediante `ContentProvider:PreloadAsync()` para eliminar tirones al aparecer jugadores.

### 210. `memory-network-bandwidth-profiler`
- **Regla:** Medir los kilobytes enviados y recibidos por segundo en remotos vigilando que el consumo de ancho de banda se mantenga bajo 50 KB/s.
