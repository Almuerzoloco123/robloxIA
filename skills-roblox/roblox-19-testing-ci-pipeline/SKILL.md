---
name: roblox-19-testing-ci-pipeline
description: "Rige el aseguramiento de calidad, pruebas unitarias y automatización CI/CD (skills 356-370): TestEZ en estilo BDD con aserciones tipadas, mocking de DataModel y servicios de red, análisis estático con luau-lsp, linting estricto con Selene, formateo determinista con StyLua y flujos de trabajo GitHub Actions con compilación y despliegue automatizado con Rojo y Open Cloud. Úsala al escribir pruebas unitarias, configurar pipelines de integración continua o blindar la calidad de código en Roblox."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Testing, CI/CD & Luau Tooling"
  range: "356-370"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-19-testing-ci-pipeline — Pruebas BDD, Herramientas Luau y CI/CD (Skills 356 - 370)

Este módulo establece los estándares de calidad de software, pruebas unitarias automatizadas con TestEZ, verificación estática y flujos continuos de integración y despliegue (CI/CD) para experiencias profesionales de Roblox en 2026.

## Principio Fundamental: Pruebas Aisladas y Verificación en Cada Commit
Ningún código llega a producción sin superar análisis estático de tipos, reglas de linting y la batería completa de pruebas unitarias. Los servicios externos y DataStores deben sustituirse por dobles de prueba (*mocks*) durante la ejecución de los tests.

---

## Catálogo de Habilidades Técnicas

### 356. `test-testez-bdd-suite-structure`
- **Regla:** Estructurar los tests unitarios en archivos con sufijo `.spec.luau` utilizando las funciones de bloque BDD `describe`, `it` y `expect`.
- **Estándar:**
```luau
--!strict
return function()
    local describe = (_G :: any).describe
    local it = (_G :: any).it
    local expect = (_G :: any).expect

    describe("Calculadora de Recompensas", function()
        it("debe calcular el multiplicador de nivel correctamente", function()
            local base = 100
            local level = 5
            local result = base * (1 + (level * 0.1))
            expect(result).to.equal(150)
        end)
    end)
end
```

### 357. `test-testez-assertions-and-lifecycle`
- **Regla:** Utilizar aserciones precisas de TestEZ (`to.be.ok()`, `to.throw()`, `to.be.near()`) y bloques de ciclo de vida (`beforeEach`, `afterEach`) para inicializar el estado de prueba sin contaminación cruzada.
```luau
--!strict
return function()
    local describe = (_G :: any).describe
    local it = (_G :: any).it
    local expect = (_G :: any).expect
    local beforeEach = (_G :: any).beforeEach

    describe("Inventario", function()
        local inventory: { string }

        beforeEach(function()
            inventory = {}
        end)

        it("debe añadir ítems sin duplicar referencias", function()
            table.insert(inventory, "Espada")
            expect(#inventory).to.equal(1)
            expect(inventory[1]).to.equal("Espada")
        end)
    end)
end
```

### 358. `test-mocking-datastore-service`
- **Regla:** Implementar simuladores en memoria (*mocks*) de `DataStore` para probar la lógica de persistencia sin invocar endpoints HTTP reales de Roblox.
```luau
--!strict
export type MockDataStore = {
    Data: { [string]: any },
    GetAsync: (self: MockDataStore, key: string) -> any?,
    SetAsync: (self: MockDataStore, key: string, value: any) -> (),
}

local function createMockDataStore(): MockDataStore
    local store = {
        Data = {},
    } :: MockDataStore

    function store:GetAsync(key: string)
        return self.Data[key]
    end

    function store:SetAsync(key: string, value: any)
        self.Data[key] = value
    end

    return store
end
```

### 359. `test-mocking-player-character-rig`
- **Regla:** Crear instancias simuladas de `Player` y modelos con `Humanoid` en memoria para probar interacciones físicas, rangos de combate y cambios de vida sin depender de clientes conectados.
```luau
--!strict
local function createMockCharacter(): (Model, Humanoid, Part)
    local char = Instance.new("Model")
    char.Name = "MockCharacter"

    local rootPart = Instance.new("Part")
    rootPart.Name = "HumanoidRootPart"
    rootPart.Size = Vector3.new(2, 2, 1)
    rootPart.CFrame = CFrame.new(0, 5, 0)
    rootPart.Parent = char
    char.PrimaryPart = rootPart

    local humanoid = Instance.new("Humanoid")
    humanoid.MaxHealth = 100
    humanoid.Health = 100
    humanoid.Parent = char

    return char, humanoid, rootPart
end
```

### 360. `test-luau-lsp-static-analysis`
- **Regla:** Configurar y ejecutar `luau-lsp --analyze` en modo estricto en la raíz del proyecto para erradicar errores de inferencia y advertencias antes de la integración.
```luau
--!strict
-- Ejemplo de función con contratos explícitos validables por luau-lsp
local function parsePlayerLevel(rawLevel: unknown): number
    if typeof(rawLevel) == "number" and rawLevel >= 1 then
        return math.floor(rawLevel)
    end
    return 1
end
```

### 361. `test-selene-linting-configuration`
- **Regla:** Mantener un archivo de configuración `selene.toml` con reglas estrictas de linting (prohibición de variables no utilizadas, globales accidentales y comparaciones redundantes).
```toml
# selene.toml
std = "roblox"

[rules]
unused_variable = "error"
shadowing = "warn"
multiple_statements = "error"
roblox_incorrect_color3_new_bounds = "error"
```

### 362. `test-stylua-formatting-automation`
- **Regla:** Mantener consistencia estilística obligatoria mediante `stylua.toml` verificada con `stylua --check src/`.
```toml
# stylua.toml
column_width = 120
line_endings = "Windows"
indent_type = "Spaces"
indent_width = 4
quote_style = "AutoPreferDouble"
call_parentheses = "Always"
```

### 363. `ci-github-actions-workflow-setup`
- **Regla:** Automatizar la ejecución de linters, análisis de tipos y pruebas en cada `pull_request` y `push` a la rama principal mediante GitHub Actions.
```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Rokit Toolchain
        uses: rokit-dev/setup-rokit@v0.1.0

      - name: Check Formatting (StyLua)
        run: stylua --check src/

      - name: Lint Code (Selene)
        run: selene src/

      - name: Typecheck (Luau LSP)
        run: luau-lsp analyze --settings=.vscode/settings.json src/
```

### 364. `ci-rokit-toolchain-management`
- **Regla:** Fijar las versiones exactas de las herramientas de compilación y análisis en un manifiesto `rokit.toml` para reproducibilidad entre entornos de desarrollo locales y remotos.
```toml
# rokit.toml
[tools]
rojo = "rojo-rbx/rojo@7.4.4"
selene = "Kampfkarren/selene@0.27.1"
stylua = "JohnnyMorganz/StyLua@2.0.2"
wally = "UpliftGames/wally@0.3.2"
```

### 365. `ci-wally-package-dependency-management`
- **Regla:** Declarar dependencias externas exclusivamente a través de `wally.toml` y sincronizar paquetes con `wally install`.
```toml
# wally.toml
[package]
name = "studio/project-core"
version = "1.0.0"
registry = "https://github.com/UpliftGames/wally-index"
realm = "shared"

[dependencies]
TestEZ = "roblox/testez@0.4.1"
Janitor = "howmun/janitor@1.17.0"
```

### 366. `ci-rojo-project-sync-configuration`
- **Regla:** Mapear la arquitectura de directorios local a la jerarquía de Roblox Studio mediante `default.project.json`.
```json
{
  "name": "robloxIA-Project",
  "tree": {
    "$className": "DataModel",
    "ReplicatedStorage": {
      "$path": "src/ReplicatedStorage"
    },
    "ServerScriptService": {
      "$path": "src/ServerScriptService"
    },
    "StarterPlayer": {
      "StarterPlayerScripts": {
        "$path": "src/StarterPlayerScripts"
      }
    }
  }
}
```

### 367. `ci-headless-test-execution`
- **Regla:** Ejecutar las baterías de pruebas en instancias de Roblox Studio sin cabecera gráfica (*headless*) para validar comportamientos de runtime en el pipeline.
```bash
# Ejecución automatizada con run-in-roblox
run-in-roblox --place default.project.json --script tests/runner.server.luau
```

### 368. `test-code-coverage-measurement`
- **Regla:** Recolectar cobertura de código en los módulos críticos de negocio (combate, inventario, transacciones) asegurando un umbral mínimo de cobertura del 80%.
```luau
--!strict
-- Estándar: Registrar ramas cubiertas mediante TestEZ TextReporter
local function reportTestCompletion(results: any)
    if results.failureCount > 0 then
        error(`[TestEZ] Fallaron {results.failureCount} pruebas unitarias.`)
    end
end
```

### 369. `ci-build-rbxl-artifact-generation`
- **Regla:** Compilar el archivo de experiencia binario `.rbxl` listo para despliegue mediante el comando `rojo build`.
```bash
rojo build default.project.json --output build/experience.rbxl
```

### 370. `ci-open-cloud-deployment-publish`
- **Regla:** Publicar versiones de producción hacia Roblox utilizando la API de Open Cloud con claves seguras configuradas en los secretos del repositorio.
```yaml
# Despliegue seguro en GitHub Actions
- name: Publish to Roblox via Open Cloud
  env:
    ROBLOX_API_KEY: ${{ secrets.ROBLOX_API_KEY }}
  run: |
    curl -X POST "https://apis.roblox.com/universes/v1/${{ secrets.UNIVERSE_ID }}/places/${{ secrets.PLACE_ID }}/versions?versionType=Published" \
      -H "x-api-key: $ROBLOX_API_KEY" \
      -H "Content-Type: application/octet-stream" \
      --data-binary @build/experience.rbxl
```

---

## Reglas Inviolables

1. **Aislamiento Absoluto en Tests Unitarios:** Ninguna prueba unitaria puede comunicarse con endpoints reales de DataStoreService o realizar llamadas HTTP externas. Es mandatorio usar mocks.
2. **Cero Tolerancia a Errores de Tipado:** El pipeline de CI DEBE fallar inmediatamente si `luau-lsp analyze` detecta cualquier discrepancia de tipos o advertencia no resuelta.
3. **Formateo Idempotente Obligatorio:** Todo archivo `.luau` debe pasar la verificación `stylua --check` en CI. El código desalineado bloquea la fusión de ramas.
4. **Protección de Credenciales y Secretos:** Jamás commitear claves de Open Cloud, Universe IDs privados o tokens en el repositorio git; usar exclusivamente variables secretas cifradas.
5. **Cobertura en Lógica Crítica:** Las funciones de cálculo económico, daño y transacciones deben contar con cobertura de pruebas unitarias verificadas con TestEZ.
