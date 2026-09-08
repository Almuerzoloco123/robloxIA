---
name: roblox-28-instance-service-internals
description: "Rige la arquitectura interna de instancias, patrones de componentes con CollectionService y gestión de bajo nivel del ciclo de vida del DataModel (skills 491-505) en Roblox 2026: GetInstanceAddedSignal/RemovedSignal, clonación atómica de jerarquías grandes, instanciación con presupuesto de fotograma (frame budgeting), tablas débiles para caching de instancias y optimización de mutaciones masivas. Úsala al diseñar sistemas reactivos dirigidos por etiquetas (ECS/Component-based), spawners masivos de entidades o al depurar fugas de memoria en referencias de instancias."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Instance Internals & CollectionService"
  range: "491-505"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-28-instance-service-internals — Internos de Instancias y CollectionService (Skills 491 - 505)

Este módulo establece los estándares de ingeniería para la gestión de instancias del DataModel en Roblox Studio. Cubre el diseño desacoplado de componentes mediante `CollectionService`, la optimización del pipeline de instanciación del motor C++, la clonación de jerarquías complejas sin caídas de framerate (*spikes*), y la gestión de tablas débiles en memoria Luau.

## Catálogo de Habilidades Técnicas

### 491. `instance-collection-service-lifecycle`
- **Regla:** Los componentes desacoplados gobernados por etiquetas (*Tags*) deben suscribirse a `CollectionService:GetInstanceAddedSignal(tag)` y `GetInstanceRemovedSignal(tag)`.
- **Estándar:** Al inicializar un servicio, procesar las instancias preexistentes mediante `CollectionService:GetTagged(tag)` antes de conectar las señales de adición para no omitir elementos del mapa.
- **Ejemplo:**
  ```luau
  --!strict
  local CollectionService = game:GetService("CollectionService")

  local function bindTagComponent(tag: string, onAdded: (Instance) -> (), onRemoved: (Instance) -> ())
      for _, instance in CollectionService:GetTagged(tag) do
          task.spawn(onAdded, instance)
      end

      CollectionService:GetInstanceAddedSignal(tag):Connect(onAdded)
      CollectionService:GetInstanceRemovedSignal(tag):Connect(onRemoved)
  end
  ```

### 492. `instance-pre-parenting-property-configuration`
- **Regla:** Al instanciar cualquier objeto mediante `Instance.new`, configurar **todas** sus propiedades (`Size`, `CFrame`, `Color`, `Material`, etc.) ANTES de asignar su propiedad `Parent`.
- **Razón de Motor:** Cuando se asigna el `Parent` primero, cada cambio posterior de propiedad dispara eventos internos de render, replicación de red y recálculo de física del motor de Roblox, degradando gravemente el rendimiento.
- **Ejemplo:**
  ```luau
  --!strict
  local function createOptimizedPart(parent: Instance, cframe: CFrame, size: Vector3): Part
      local part = Instance.new("Part")
      part.Size = size
      part.CFrame = cframe
      part.Anchored = true
      part.CanCollide = false
      part.Material = Enum.Material.SmoothPlastic
      -- Parent siempre al final
      part.Parent = parent
      return part
  end
  ```

### 493. `instance-atomic-deep-cloning`
- **Regla:** Para jerarquías complejas de modelos (e.g. edificios, avatares completos con accesorios y scripts), configurar todas las propiedades de personalización en la copia clonada en memoria antes de emparentarla al DataModel activo (`workspace`).

### 494. `instance-frame-budgeted-spawning`
- **Regla:** Al generar cientos o miles de instancias (e.g. inicialización de dungeons o vegetación procedural), limitar el tiempo de ejecución a un presupuesto de fotograma estricto (máximo 4 ms por frame) utilizando `os.clock()`.
- **Ejemplo:**
  ```luau
  --!strict
  local MAX_FRAME_TIME_MS = 0.004 -- 4 milisegundos

  local function spawnEntitiesBudgeted(prefabs: { Instance }, parent: Instance)
      local startTime = os.clock()

      for _, prefab in prefabs do
          local clone = prefab:Clone()
          clone.Parent = parent

          if (os.clock() - startTime) >= MAX_FRAME_TIME_MS then
              task.wait() -- Ceder el fotograma para mantener 60 FPS
              startTime = os.clock()
          end
      end
  end
  ```

### 495. `instance-weak-table-caching`
- **Regla:** Si se almacenan referencias a instancias en diccionarios de caché o metadatos en Luau, la tabla debe configurarse con metatabla débil (`__mode = "k"` para claves o `"v"` para valores).
- **Propósito:** Permitir que el recolector de basura (GC) libere la memoria si la instancia es destruida del juego, evitando fugas por referencias retenidas en tablas globales.
- **Ejemplo:**
  ```luau
  --!strict
  local function createWeakInstanceCache(): { [Instance]: any }
      local cache = {}
      setmetatable(cache, { __mode = "k" })
      return cache
  end
  ```

### 496. `instance-safe-destroy-lifecycle`
- **Regla:** Para eliminar definitivamente una instancia, invocar siempre `:Destroy()`.
- **Prohibido:** Asignar `part.Parent = nil` creyendo que se elimina. Las instancias con `Parent = nil` retienen conexiones de señales activas en memoria si no se llama a `Destroy()`.

### 497. `instance-attribute-change-signals`
- **Regla:** Para variables dinámicas de entidades (salud, nivel, equipo), utilizar atributos nativos (`SetAttribute`, `GetAttribute`) en lugar de crear instancias `StringValue`, `IntValue` o `NumberValue`.
- **Estándar:** Escuchar cambios específicos mediante `instance:GetAttributeChangedSignal(attrName)` para no disparar eventos innecesarios.

### 498. `instance-descendant-traversal-optimization`
- **Regla:** Al iterar sobre árboles de instancias extensos, utilizar `instance:GetDescendants()` filtrando con verificaciones directas (`IsA`), en lugar de escribir funciones recursivas con llamadas anidadas a `GetChildren()`.

### 499. `instance-streaming-tag-component-binding`
- **Regla:** En clientes con `StreamingEnabled`, los componentes basados en etiquetas de `CollectionService` deben estar preparados para instancias que entran y salen del rango de visión repetidamente.
- **Estándar:** Limpiar los recursos locales y conexiones en `GetInstanceRemovedSignal` y re-inicializarlos si la misma instancia vuelve a transmitirse mediante `GetInstanceAddedSignal`.

### 500. `instance-bulk-property-mutation`
- **Regla:** Al aplicar modificaciones a múltiples propiedades de un modelo grande, congelar cálculos intermedios o agrupar cambios para minimizar los eventos de invalidación en el pipeline de replicación.

### 501. `instance-find-first-child-cache-elimination`
- **Regla:** Evitar invocar repetidamente `instance:FindFirstChild("Nombre")` o `WaitForChild` dentro de bucles por fotograma (`RenderStepped`, bucles de combate intensivos).
- **Estándar:** Almacenar la referencia en una variable local o propiedad del componente durante la fase de inicialización.

### 502. `instance-property-change-specific-signals`
- **Regla:** Nunca conectarse al evento general `instance.Changed` en `BasePart` u otras instancias complejas.
- **Estándar:** Conectarse exclusivamente a la señal de la propiedad requerida mediante `instance:GetPropertyChangedSignal(propertyName)` (e.g. `:GetPropertyChangedSignal("CFrame")`).

### 503. `instance-script-context-sandboxing`
- **Regla:** Todo script generado o inyectado dinámicamente en tiempo de ejecución debe validar su entorno de ejecución (`RunContext` correcto: `Server`, `Client` o `Plugin`) y no ejecutar código desde fuentes externas sin sanitización previa.

### 504. `instance-template-folder-isolation`
- **Regla:** Los modelos prefabricados (*Prefabs*), armas e ítems que sirvan como moldes para clonación deben guardarse en carpetas dedicadas dentro de `ServerStorage` (para plantillas exclusivas de servidor) o `ReplicatedStorage` (para plantillas requeridas por clientes), NUNCA en `Workspace` ocultos o transparentes.

### 505. `instance-garbage-collection-sentinel`
- **Regla:** Para verificar en pruebas de estrés que los componentes se limpian correctamente, asociar sentinelas con `userdata` o tablas débiles para auditar que el conteo de instancias en memoria de `gcinfo()` regrese a la línea base tras la destrucción de modelos grandes.

## Reglas Inviolables

1. **Parent siempre al final:** Toda instancia creada con `Instance.new` debe tener todas sus propiedades configuradas antes de asignarle `Parent`. Prohibido el uso del segundo argumento `Instance.new("Part", parent)`.
2. **Siempre llamar a `:Destroy()` para borrado:** Nunca eliminar objetos asignando únicamente `instance.Parent = nil`.
3. **Prohibido conectar a `BasePart.Changed`:** Usar exclusivamente `GetPropertyChangedSignal` para la propiedad específica requerida.
4. **Sustituir `ValueObjects` por Atributos:** No instanciar `IntValue`, `StringValue` o `BoolValue` para datos primitivos; utilizar `SetAttribute` y `GetAttribute`.
5. **Presupuesto de fotograma en instanciación masiva:** Ningún bucle de generación masiva puede ejecutar operaciones continuas por más de 4 ms sin ceder el turno al planificador con `task.wait()`.
