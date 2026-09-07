---
name: roblox-08-memory-lifecycle
description: "Skills 186-210: Gestión de Ciclo de Vida con Janitor, PartCache Pooling, Eliminación de Fugas de Memoria y Optimización MicroProfiler."
license: MIT
metadata:
  domain: "Memory & Janitor Auditing"
  range: "186-210"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-08-memory-lifecycle — Rendimiento, Fugas y Ciclo de Vida (Skills 186 - 210)

Este módulo rige la gestión estricta de memoria, erradicación de fugas y optimización de tasa de fotogramas (60 FPS estables).

## Catálogo de Habilidades Técnicas

### 186. `memory-janitor-class-lifecycle`
- **Regla:** Todo componente o servicio que escuche señales o instancie partes debe implementar el patrón `Janitor`.
- **Implementación:** Al destruirse la clase, invocar `self._janitor:Destroy()` para desconectar automáticamente todas las conexiones asociadas.

### 187. `memory-rbxscript-disconnect-assert`
- **Regla:** Ningún `RBXScriptConnection` debe quedar activo tras la muerte del personaje o la eliminación de una entidad del juego.

### 188. `memory-instance-destroy-recursive`
- **Regla:** Las instancias eliminadas deben desecharse formalmente con `Instance:Destroy()` para desconectar sus eventos y desvincularlas del árbol de replicación del DataModel.
- **Prohibido:** Simplemente asignar `part.Parent = nil` dejando referencias flotantes en memoria.

### 189. `memory-part-cache-projectile-pooling`
- **Regla:** Reutilizar proyectiles físicos, monedas o efectos visuales frecuentes mediante agrupamiento (*PartCache / Object Pooling*) en lugar de llamar a `Instance.new()` en cada disparo.

### 190. `memory-microprofiler-scope-markers`
- **Regla:** Envolver cálculos algorítmicos complejos en bloques `debug.profilebegin("Label")` y `debug.profileend()` para auditoría con el MicroProfiler (`Ctrl+F6`).

### 191. `memory-physics-sleep-optimization`
- **Regla:** Configurar ensamblajes estáticos o inertes con `Anchored = true` para permitir que el motor de físicas ponga sus cuerpos rígidos en reposo (*Physics Sleep*).

### 192. `memory-draw-call-batching`
- **Regla:** Unir geometrías estáticas con materiales idénticos para reducir el recuento de llamadas de dibujo (draw calls) en GPU.

### 193. `memory-task-cancel-threads`
- **Regla:** Cancelar hilos en espera mediante `task.cancel(thread)` cuando el contexto asociado sea destruido.
