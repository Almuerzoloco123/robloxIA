---
name: roblox-01-luau-core
description: "Rige el núcleo de Luau (skills 001-025) para Roblox 2026: tipado estricto (--!strict), genéricos, buffer binario, metatablas OOP y la biblioteca task. Úsala al escribir cualquier script .luau del proyecto, definir tipos y contratos, o aplicar las reglas de estilo y linting (Selene/StyLua) del sistema RAASE."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Luau Language & Strict Typing"
  range: "001-025"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-01-luau-core — Núcleo de Luau, Tipado Estricto y Sandbox (Skills 001 - 025)

Este módulo contiene las directrices técnicas, patrones de código y restricciones para el desarrollo en Luau moderno (2026).

## Catálogo de Habilidades Técnicas

### 001. `luau-strict-mode-enforcement`
- **Regla:** La primera línea de TODO archivo `.luau` DEBE ser `--!strict`.
- **Propósito:** Activar el análisis estático del compilador Luau, erradicando discrepancias de tipos antes de tiempo de ejecución.
- **Ejemplo:**
  ```lua
  --!strict
  local function calculateDamage(baseDamage: number, multiplier: number): number
      return baseDamage * multiplier
  end
  ```

### 002. `luau-type-annotations-custom`
- **Regla:** Exportar contratos y tipos de dominio explícitos (`export type ...`).
- **Ejemplo:**
  ```lua
  export type InventoryItem = {
      id: string,
      displayName: string,
      rarity: "Common" | "Rare" | "Legendary",
      quantity: number,
  }
  ```

### 003. `luau-generics-contracts`
- **Regla:** Usar parámetros de tipo genéricos `<T>` para estructuras de datos y funciones reutilizables.
- **Ejemplo:**
  ```lua
  local function findFirst<T>(list: { T }, predicate: (T) -> boolean): T?
      for _, item in list do
          if predicate(item) then
              return item
          end
      end
      return nil
  end
  ```

### 004. `luau-singleton-service-injection`
- **Regla:** Acceso EXCLUSIVO a servicios mediante `game:GetService("NombreServicio")`.
- **Prohibido:** `game.Workspace`, `game.Players`, `game.ReplicatedStorage`.

### 005. `luau-nil-explicit-handling`
- **Regla:** Evaluar nulidad con comparaciones explícitas `value == nil` o `value ~= nil`.
- **Prohibido:** Coalescencias ambiguas que confundan `false` con `nil`.

### 006. `luau-absolute-pathing`
- **Regla:** No encadenar `script.Parent.Parent.Parent`. Utilizar referencias canónicas, servicios o paquetes Wally.

### 007. `luau-stylua-formatting`
- **Regla:** Sangría física con tabulaciones (`\t`), límite estricto de 100 caracteres por línea y comillas dobles.

### 008. `luau-sandbox-cpu-throttling`
- **Regla:** Todo bucle que itere más de 500 operaciones pesadas DEBE ceder el hilo voluntariamente con `task.wait()`.

### 009. `luau-task-library-scheduling`
- **Regla:** Uso exclusivo de `task.spawn`, `task.defer`, `task.delay` y `task.wait`.
- **Prohibición Total:** Desterrar por completo las funciones legadas `spawn()`, `delay()` y `wait()`.

### 010. `luau-string-buffer-manipulation`
- **Regla:** Para procesamiento intensivo de datos, serialización o compresión, usar `buffer.create()` y las APIs de `buffer`.

### 011. `luau-metatable-oop-patterns`
- **Regla:** Clases estructuradas con metatablas fuertemente tipadas:
  ```lua
  local MyClass = {}
  MyClass.__index = MyClass
  export type MyClass = typeof(setmetatable({} :: { id: string }, MyClass))
  ```

### 012. `luau-functional-table-algorithms`
- **Regla:** Manipulación inmutable de tablas usando `table.freeze()` para configuraciones estáticas y `table.clone()` para copias superficiales.

### 013. `luau-bit32-flag-operations`
- **Regla:** Empaquetado eficiente de múltiples booleanos en enteros de 32 bits con `bit32.band`, `bit32.bor`, `bit32.btest`.

### 014. `luau-runtime-type-reflection`
- **Regla:** Validación dinámica en tiempo de ejecución de argumentos externos usando `typeof()` (que distingue `Vector3`, `Color3`, `Instance`, etc.).

### 015. `luau-selene-lint-compliance`
- **Regla:** Todo código Luau debe superar el linter Selene con 0 advertencias y 0 errores.

### 016. `luau-coroutine-lifecycle-control`
- **Regla:** Control riguroso de corrutinas con `coroutine.create`, `coroutine.yield` y `coroutine.resume`.

### 017. `luau-native-codegen-flags`
- **Regla:** Scripts con operaciones matemáticas intensivas (generación de ruido, simulación de proyectiles) deben incluir `--!native` para aceleración JIT nativa.

### 018. `luau-frozen-constant-dictionaries`
- **Regla:** Todo diccionario de configuración global debe congelarse con `table.freeze(CONFIG)`.

### 019. `luau-symbol-private-keys`
- **Regla:** Uso de tablas vacías únicas (`local PRIVATE_KEY = {}`) como claves de metatablas para miembros estrictamente privados.

### 020. `luau-pattern-matching-parsing`
- **Regla:** Uso de patrones Luau (`string.match`, `string.gmatch`) evitando expresiones complejas propensas a lag.

### 021. `luau-math-vectorization`
- **Regla:** Utilizar el tipo nativo `vector` o bibliotecas vectorizadas para operaciones espaciales 3D.

### 022. `luau-error-handling-pcall`
- **Regla:** Toda llamada externa a red o DataStore debe envolverse en `pcall` estructurado retornando `(success, result)`.

### 023. `luau-signal-implementation`
- **Regla:** Empleo de señales de bajo overhead (tipo GoodSignal / FastSignal) en lugar de crear `BindableEvents` desechables.

### 024. `luau-garbage-collection-tuning`
- **Regla:** Monitorizar `gcinfo()` en playtests y evitar instanciación desmedida de tablas dentro de bucles por fotograma.

### 025. `luau-debug-stack-tracing`
- **Regla:** Captura de pila enriquecida en fallos críticos mediante `debug.traceback()`.
