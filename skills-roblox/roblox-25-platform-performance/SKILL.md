---
name: roblox-25-platform-performance
description: "Rige el rendimiento de plataforma, presupuestos de memoria y optimización de fotogramas (skills 446-460) en Roblox 2026: StreamingEnabled avanzado (ModelStreamingMode.Atomic, PersistentPerPlayer, StreamOutBehavior.Opportunistic), perfiles de memoria por tiers de dispositivo, instrumentación con MicroProfiler (debug.profilebegin/profileend), LODs automáticos y mitigación de estrangulamiento térmico. Úsala al optimizar juegos para móviles de gama baja, consolas y PCs para garantizar 60 FPS estables sin exceder los límites de VRAM."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Platform Performance & Memory Budgets"
  range: "446-460"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-25-platform-performance — Rendimiento de Plataforma y Presupuestos de Memoria (Skills 446 - 460)

Este módulo establece los estándares de ingeniería para garantizar 60 FPS continuos en toda la gama de hardware soportado por Roblox (móviles de gama de entrada, consolas y PCs de alto rendimiento). Regula la configuración avanzada de `StreamingEnabled`, la gestión estricta del heap de memoria, el perfilado mediante MicroProfiler y las estrategias de reducción de consumo de batería y temperatura.

## Catálogo de Habilidades Técnicas

### 446. `perf-streaming-enabled-model-modes`
- **Regla:** En proyectos con `StreamingEnabled = true`, configurar explícitamente `ModelStreamingMode` en modelos estructurales y entidades clave:
  - `ModelStreamingMode.Atomic`: Para vehículos, NPCs o armas ensambladas donde todas las partes deben cargar o descargar en bloque atómico simultáneo.
  - `ModelStreamingMode.PersistentPerPlayer`: Para bases o salas de spawn del jugador que nunca deben descargarse del cliente.
  - `ModelStreamingMode.Default`: Para terreno y elementos de ambientación no críticos.
- **Ejemplo:**
  ```luau
  --!strict
  local function configureVehicleStreaming(vehicleModel: Model)
      vehicleModel.ModelStreamingMode = Enum.ModelStreamingMode.Atomic
  end
  ```

### 447. `perf-stream-out-behavior-policing`
- **Regla:** Para mapas extensos y experiencias móviles, configurar `Workspace.StreamOutBehavior = Enum.StreamOutBehavior.Opportunistic`.
- **Estándar:** Calibrar `StreamingMinRadius` (mínimo 64 studs) y `StreamingTargetRadius` (256 a 512 studs) para mantener el uso de memoria RAM del cliente por debajo de 1.8 GB.

### 448. `perf-streaming-client-wait-for-child`
- **Regla:** En scripts de cliente bajo StreamingEnabled, NUNCA asumir que una parte o modelo distante existe al iniciar la partida.
- **Estándar:** Emplear `WaitForChild` con timeout defensivo o suscribirse a señales de carga contextual.
- **Ejemplo:**
  ```luau
  --!strict
  local Workspace = game:GetService("Workspace")

  local function awaitStreamingInstance(parent: Instance, name: string, timeoutSec: number): Instance?
      return parent:WaitForChild(name, timeoutSec)
  end
  ```

### 449. `perf-microprofiler-custom-tags`
- **Regla:** Toda función crítica que procese bucles, simulaciones de IA o actualización de mallas debe instrumentarse con etiquetas de MicroProfiler mediante `debug.profilebegin(tag)` y `debug.profileend()`.
- **Ejemplo:**
  ```luau
  --!strict
  local function executeCombatTick(entities: { Model })
      debug.profilebegin("CombatEngine_Tick")

      for _, entity in entities do
          debug.profilebegin("Entity_ProcessAI")
          -- Lógica de procesamiento...
          debug.profileend()
      end

      debug.profileend()
  end
  ```

### 450. `perf-memory-budget-device-tiers`
- **Regla:** Monitorear el uso total de memoria mediante `Stats:GetTotalMemoryUsageMb()` y segmentar a los usuarios en tres niveles de dispositivo (*Tiers*):
  - *Tier 1 (Low-End Mobile)*: $< 2$ GB RAM disponible $\rightarrow$ Reducir draw distance, apagar sombras dinámicas de puntos de luz.
  - *Tier 2 (Mid-Range Mobile/Tablet)*: $2$ a $4$ GB RAM.
  - *Tier 3 (High-End PC/Console)*: $> 4$ GB RAM $\rightarrow$ Activar fidelidad gráfica máxima.

### 451. `perf-adaptive-physics-stepping`
- **Regla:** Configurar `Workspace.PhysicsSteppingMethod = Enum.PhysicsSteppingMethod.Adaptive`.
- **Propósito:** Permitir que el motor de física reduzca automáticamente la frecuencia de cálculo en ensambles con movimiento lento o estacionarios, liberando ciclos vitales de CPU.

### 452. `perf-mesh-lod-level-of-detail`
- **Regla:** Todo asset de malla compleja (`MeshPart`) debe configurarse con `RenderFidelity = Enum.RenderFidelity.Performance` y `CollisionFidelity = Enum.CollisionFidelity.Box` o `Hull` (salvo que sea estrictamente indispensable una colisión cóncava precisa).
- **Prohibido:** Usar `CollisionFidelity.PreciseConvexDecomposition` en mallas puramente decorativas.

### 453. `perf-draw-call-batching-materials`
- **Regla:** Para maximizar el batching de llamadas de dibujado (*Draw Calls*) en la GPU, agrupar objetos estáticos del entorno compartiendo el mismo `Material`, `Color3` y textura.
- **Estándar:** Evitar tener cientos de partes contiguas con materiales distintos que impidan al motor instanciar las geometrías en un solo pase de dibujado.

### 454. `perf-shadow-casting-mobile-budget`
- **Regla:** En dispositivos de gama baja, desactivar `CastShadow = false` en partes pequeñas ($< 4$ studs de tamaño) y suprimir sombras en `PointLight` y `SpotLight`.
- **Propósito:** El cálculo de mapas de sombras dinámicas es la causa número uno de sobrecalentamiento y caídas de frame en procesadores móviles integrados.

### 455. `perf-audio-voice-concurrency-budget`
- **Regla:** Limitar las voces de sonido concurrentes activas simultáneamente en `SoundService`.
- **Estándar:** Si más de 24 sonidos reproducen audio posicional en simultáneo, detener las fuentes más lejanas a la cámara para no saturar el mixer de audio de software en dispositivos móviles.

### 456. `perf-gc-heap-allocation-reduction`
- **Regla:** Prohibido instanciar tablas temporales, arrays o closures anónimos dentro de conexiones que corran cada fotograma (`RenderStepped`, `Heartbeat`).
- **Estándar:** Reutilizar tablas estáticas previamente asignadas o usar variables escalares para mantener la recolección de basura (Garbage Collector) en tasa de reciclaje mínima.

### 457. `perf-part-cache-culling-strategies`
- **Regla:** Para proyectiles, monedas o efectos visuales frecuentes, utilizar reservas pre-asignadas en memoria (*Object Pooling* con PartCache).
- **Prohibido:** Ejecutar `Instance.new("Part")` y `:Destroy()` en ráfagas continuas de disparos durante el gameplay.

### 458. `perf-content-provider-preloading`
- **Regla:** En pantallas de carga iniciales, pre-cargar únicamente los assets de alta prioridad de la interfaz de usuario y del spawn point mediante `ContentProvider:PreloadAsync(assets)`.
- **Prohibido:** Intentar pre-cargar todo el catálogo completo del juego en un solo pase, ya que provocará el cierre forzado de la aplicación (*crash por OOM*) en dispositivos con memoria restringida.

### 459. `perf-thermal-throttling-mitigation`
- **Regla:** Detectar degradación de rendimiento sostenida (tiempo de frame $> 22$ ms durante más de 5 segundos seguidos) e implementar degradación estética progresiva (reducir densidad de partículas, apagar bloom secundario).
- **Propósito:** Mitigar el estrangulamiento térmico de la CPU/GPU del dispositivo móvil, evitando que el sistema operativo baje la frecuencia de reloj del procesador.

### 460. `perf-dynamic-resolution-framerate-governor`
- **Regla:** Implementar un monitor que supervise `Workspace:GetRealPhysicsFPS()` y el tiempo entre fotogramas para regular la escala de efectos de post-procesamiento garantizando una tasa de refresco fluida.

## Reglas Inviolables

1. **Nunca omitir `StreamingEnabled` en mapas comerciales:** Las experiencias con más de 5,000 partes deben tener `StreamingEnabled = true` sin excepción.
2. **Prohibido el uso de `CollisionFidelity.PreciseConvexDecomposition` en partes decorativas:** Las mallas visuales deben usar `Box` o `Hull`.
3. **No generar allocations en el render loop:** Prohibido crear tablas vacías `{}` o lambdas dentro de callbacks conectados a `RenderStepped` o `Heartbeat`.
4. **Cerrar siempre los bloques de MicroProfiler:** Toda invocación a `debug.profilebegin` debe tener su correspondiente `debug.profileend()` en el mismo ámbito léxico.
5. **PreloadAsync acotado y selectivo:** Nunca invocar `PreloadAsync` con el contenedor `Workspace` completo; solo pre-cargar assets críticos del arranque.
