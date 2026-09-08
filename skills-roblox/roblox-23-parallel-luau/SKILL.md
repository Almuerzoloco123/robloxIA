---
name: roblox-23-parallel-luau
description: "Rige la arquitectura y programación concurrente con Parallel Luau (skills 416-430) en Roblox 2026: instancias Actor, división de tareas con task.desynchronize y task.synchronize, estructuras SharedTable y SharedTableRegistry, consultas de raycasting masivo en paralelo, simulación espacial y boundaries de ejecución segura. Úsala al optimizar simulaciones de cientos de entidades (boids, proyectiles, IA), procesamiento de mallas o muestreo procedural pesado distribuyendo la carga en múltiples núcleos de CPU."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Parallel Luau & Multithreading"
  range: "416-430"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-23-parallel-luau — Luau Paralelo y Multiprocesamiento (Skills 416 - 430)

Este módulo establece los estándares de ingeniería para el aprovechamiento de CPUs multinúcleo en Roblox Studio mediante Parallel Luau. Define la topología de instancias `Actor`, el ciclo de desincronización/sincronización de hilos, el uso de memoria compartida thread-safe con `SharedTable` y las restricciones de seguridad al interactuar con el DataModel.

## Catálogo de Habilidades Técnicas

### 416. `parallel-actor-hierarchy-topology`
- **Regla:** Para que el motor Luau distribuya scripts en distintos hilos de hardware, los scripts ejecutantes deben ser descendientes directos de instancias `Actor` independientes.
- **Estándar:** Múltiples scripts bajo un mismo `Actor` comparten el mismo hilo de ejecución. Para paralelismo real, instanciar un pool de $N$ instancias `Actor` hermanas.
- **Ejemplo:**
  ```luau
  --!strict
  local function spawnActorPool(parent: Instance, count: number, workerScriptPrefab: Script): { Actor }
      local actors = table.create(count)
      for i = 1, count do
          local actor = Instance.new("Actor")
          actor.Name = `WorkerActor_{i}`
          local worker = workerScriptPrefab:Clone()
          worker.Parent = actor
          actor.Parent = parent
          actors[i] = actor
      end
      return actors
  end
  ```

### 417. `parallel-task-desynchronize-flow`
- **Regla:** Para delegar cálculos pesados al hilo del Actor, invocar `task.desynchronize()`.
- **Estándar:** A partir de ese punto, el código se ejecuta en paralelo con respecto al hilo principal del DataModel.
- **Ejemplo:**
  ```luau
  --!strict
  local function computeIntensiveWorkParallel(dataList: { Vector3 }): { number }
      task.desynchronize()

      -- Fase paralela: cálculos matemáticos sin mutar el DataModel
      local results = table.create(#dataList)
      for idx, vec in dataList do
          results[idx] = vec.X * vec.Y + vec.Z
      end

      task.synchronize()
      -- Fase serial: seguro para mutar instancias
      return results
  end
  ```

### 418. `parallel-task-synchronize-mutation`
- **Regla:** Cualquier mutación de propiedades del DataModel (`Parent`, `CFrame`, `Color`, etc.) o invocación de señales DEBE realizarse tras volver al hilo principal con `task.synchronize()`.
- **Prohibido:** Intentar escribir propiedades de instancias o crear instancias en el DataModel dentro de una fase desincronizada (provocará error fatal de ejecución paralela de Roblox).

### 419. `parallel-shared-table-registry`
- **Regla:** Para compartir datos entre diferentes hilos de Actors sin incurrir en clonaciones profundas que disparen la recolección de basura, emplear `SharedTable` y registrar tablas compartidas en `SharedTableRegistry`.
- **Ejemplo:**
  ```luau
  --!strict
  local SharedTableRegistry = game:GetService("SharedTableRegistry")

  local function setupSharedMemoryBus(busName: string): SharedTable
      local shared = SharedTable.new()
      SharedTableRegistry:SetSharedTable(busName, shared)
      return shared
  end
  ```

### 420. `parallel-shared-table-atomic-writes`
- **Regla:** Las mutaciones en `SharedTable` deben utilizar métodos de actualización atómica o control de versiones para evitar condiciones de carrera (*race conditions*).
- **Estándar:** Utilizar `SharedTable.increment` o wrappers atómicos para contadores e índices compartidos.

### 421. `parallel-raycasting-spatial-queries`
- **Regla:** Las consultas espaciales de solo lectura (`WorldRoot:Raycast`, `WorldRoot:Shapecast`, `WorldRoot:GetPartsInPart`) son seguras y están altamente aceleradas dentro de la fase paralela (`task.desynchronize()`).
- **Ejemplo:**
  ```luau
  --!strict
  local Workspace = game:GetService("Workspace")

  local function castRayInParallel(origin: Vector3, direction: Vector3, params: RaycastParams): RaycastResult?
      task.desynchronize()
      local result = Workspace:Raycast(origin, direction, params)
      task.synchronize()
      return result
  end
  ```

### 422. `parallel-pathfinding-boids-simulation`
- **Regla:** Algoritmos de enjambre (Boids), campos vectoriales de flujo (*Flow Fields*) o simulación de multitudes deben dividir los agentes uniformemente entre el pool de Actors, calculando posiciones y velocidades desincronizadamente en cada fotograma.

### 423. `parallel-actor-message-bus`
- **Regla:** La comunicación asíncrona entre el hilo principal y los hilos de los Actors debe realizarse mediante `Actor:SendMessage(messageName, ...)` y suscribirse en el trabajador con `actor:BindToMessage(messageName, handler)`.
- **Propósito:** Desacoplamiento limpio sin polling ni bloqueos activos.

### 424. `parallel-chunked-data-partitioning`
- **Regla:** Al distribuir colecciones masivas de datos entre $K$ trabajadores, particionar los arrays en segmentos continuos para maximizar la localidad de caché de la CPU:
  - Actor $i$ procesa el rango $\left[ \lfloor (i-1) \cdot \frac{N}{K} \rfloor + 1, \lfloor i \cdot \frac{N}{K} \rfloor \right]$.

### 425. `parallel-safe-read-phase-boundaries`
- **Regla:** Durante la fase paralela, la lectura de propiedades de instancias existentes (`part.Position`, `part.Size`) está permitida siempre que ningún otro hilo esté modificando esas mismas partes en fase serial.
- **Estándar:** Mantener separadas las fases de lectura paralela y las fases de escritura sincronizada.

### 426. `parallel-connect-parallel-signals`
- **Regla:** Cuando un evento del motor (como `RunService.Heartbeat`) deba ejecutar su lógica directamente en paralelo dentro del hilo del Actor, utilizar el método nativo `:ConnectParallel(callback)`.
- **Ejemplo:**
  ```luau
  --!strict
  local RunService = game:GetService("RunService")

  local function bindParallelTick()
      RunService.Heartbeat:ConnectParallel(function(dt: number)
          -- El callback inicia automáticamente en fase desincronizada
          -- Realizar trabajo matemático pesado aquí...

          task.synchronize()
          -- Aplicar cambios si es indispensable
      end)
  end
  ```

### 427. `parallel-procedural-noise-sampling`
- **Regla:** La generación de mapas de densidad de terreno voxel o mallas de ruido Perlin 3D debe distribuirse en bloques volumétricos independientes asignados a distintos Actors para acelerar los tiempos de carga del mundo.

### 428. `parallel-buffer-binary-shared-memory`
- **Regla:** Para volúmenes extremos de datos (como cientos de miles de enteros o floats de coordenadas), empaquetar los datos en instancias `buffer` y compartirlas entre hilos dentro de un `SharedTable` para minimizar overhead de serialización.

### 429. `parallel-thread-starvation-watchdog`
- **Regla:** Ningún cálculo en un Actor individual debe superar los 4 milisegundos de tiempo de CPU continuo por fotograma sin devolver el control. Si una tarea es masiva, debe subdividirse con `task.wait()` o ceder el turno.

### 430. `parallel-actor-pool-lifecycle`
- **Regla:** Los pools de Actors deben ser persistentes y reutilizables. No destruir e instanciar nuevos `Actor` constantemente durante la ejecución de la partida, pues la creación de hilos en el runtime tiene un alto costo de asignación en el SO.

## Reglas Inviolables

1. **Nunca mutar el DataModel en fase paralela:** Toda asignación de propiedades (`CFrame`, `Parent`, etc.) o llamada a métodos de mutación (`Destroy`, `Clone` al DataModel) debe estar precedida obligatoriamente por `task.synchronize()`.
2. **Prohibido el polling activo entre hilos:** La sincronización entre el hilo principal y los Actors debe realizarse mediante `SharedTable` o `Actor:SendMessage` / `BindToMessage`. Nunca emplear bucles `while not done do` de espera activa.
3. **No crear un Actor por cada entidad individual:** Crear 5000 Actors satura el planificador del sistema operativo. Agrupar la carga en un pool de 4 a 16 Actors fijos según el hardware de la plataforma.
4. **Respetar la inmutabilidad de lecturas concurrentes:** Si un hilo lee una propiedad en paralelo, ningún script serial debe escribirla concurrentemente durante esa misma fase.
5. **Siempre sanitizar excepciones en hilos de Actors:** Las rutinas dentro de un Actor deben contener manejo defensivo de errores (`pcall`) para que el fallo de un cálculo matemático no anule permanentemente el hilo de ese trabajador.
