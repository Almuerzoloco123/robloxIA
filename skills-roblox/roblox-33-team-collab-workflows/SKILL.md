---
name: roblox-33-team-collab-workflows
description: "Rige los flujos de colaboración en equipo y automatización con Rojo en Roblox (skills 566-580): arquitectura multi-partición en default.project.json, resolución de conflictos en assets binarios, gobernanza de PackageLinks, gestión determinista de dependencias con Wally, pipelines de CI/CD (GitHub Actions, Selene, StyLua, TestEZ), versionado semántico de módulos compartidos y Feature Flags. Úsala al estructurar repositorios, coordinar equipos de desarrollo, automatizar compilaciones y aplicar revisión de código."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Team Collaboration & Rojo Workflows"
  range: "566-580"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-33-team-collab-workflows — Trabajo en Equipo, Rojo y Flujos Profesionales (Skills 566 - 580)

Este módulo establece los estándares de ingeniería de software para el desarrollo colaborativo a gran escala, integración de herramientas externas, sincronización bidireccional y control de versiones bajo Luau 2026.

## Catálogo de Habilidades Técnicas

### 566. `collab-rojo-multi-partition-project`
- **Regla:** Desacoplar la estructura del proyecto en `default.project.json` asignando rutas físicas independientes en disco para cada contenedor raíz del árbol de Roblox.
- **Ejemplo:**
  ```json
  {
    "name": "roblox-experience",
    "tree": {
      "$className": "DataModel",
      "ReplicatedStorage": {
        "Shared": {
          "$path": "src/shared"
        }
      },
      "ServerScriptService": {
        "Server": {
          "$path": "src/server"
        }
      },
      "StarterPlayer": {
        "StarterPlayerScripts": {
          "Client": {
            "$path": "src/client"
          }
        }
      }
    }
  }
  ```

### 567. `collab-git-branching-model`
- **Regla:** Adoptar un modelo de ramas cortas de características (*Trunk-Based Development*). Toda nueva funcionalidad debe desarrollarse en ramas con el prefijo `feat/`, `fix/` o `refactor/` y reintegrarse a `main` mediante Pull Request validada por CI.
- **Ejemplo:**
  ```bash
  git checkout -b feat/combat-parry-system
  git commit -m "feat(combat): implement parry timing window with linear velocity knockback"
  git push origin feat/combat-parry-system
  ```

### 568. `collab-binary-asset-conflict-resolution`
- **Regla:** Ningún archivo de código `.luau` debe almacenarse dentro de archivos binarios `.rbxl` o `.rbxm`. Todo script reside en texto plano en Git; los assets 3D se sincronizan como paquetes o modelos referenciados.
- **Ejemplo:**
  ```luau
  --!strict
  -- En lugar de incrustar lógica en un modelo binario .rbxm, enlazar por Tag / CollectionService
  local CollectionService = game:GetService("CollectionService")

  local function bindComponentToTag(tag: string, onInstanceAdded: (Instance) -> ())
      for _, inst in CollectionService:GetTagged(tag) do
          task.spawn(onInstanceAdded, inst)
      end
      CollectionService:GetInstanceAddedSignal(tag):Connect(onInstanceAdded)
  end
  ```

### 569. `collab-roblox-packagelinks-management`
- **Regla:** Al compartir modelos de construcción o componentes entre múltiples lugares del universo, emplear `PackageLink`. Toda actualización de paquete debe publicarse formalmente y documentarse con notas de versión.
- **Ejemplo:**
  ```luau
  --!strict
  local function isAssetPackage(instance: Instance): boolean
      return instance:FindFirstChildOfClass("PackageLink") ~= nil
  end
  ```

### 570. `collab-luau-pull-request-review-guidelines`
- **Regla:** Todo Pull Request debe cumplir con los 5 puntos de la lista de verificación Luau:
  1. Primera línea con `--!strict`.
  2. 0 advertencias y 0 errores en el linter Selene.
  3. Formateo estricto con StyLua.
  4. Exportación explícita de tipos públicos (`export type`).
  5. Desconexión de señales y limpieza con `Janitor`.

### 571. `collab-wally-dependency-management`
- **Regla:** La instalación de dependencias externas debe gestionarse a través de `wally.toml`. El archivo de bloqueo `wally.lock` DEBE incluirse en el repositorio de Git para garantizar builds deterministas.
- **Ejemplo:**
  ```toml
  [package]
  name = "equipo/core-gameplay"
  version = "1.2.0"
  registry = "https://github.com/UpliftGames/wally-index"
  realm = "shared"

  [dependencies]
  Janitor = "howmun/janitor@^1.16.1"
  Signal = "sleitnick/signal@^2.0.1"
  ```

### 572. `collab-semantic-versioning-contracts`
- **Regla:** Los módulos de servicio y bibliotecas compartidas deben respetar Versionado Semántico (`MAJOR.MINOR.PATCH`). Cualquier cambio que rompa la firma de una función pública exige un incremento en `MAJOR`.
- **Ejemplo:**
  ```luau
  --!strict
  export type Version = { major: number, minor: number, patch: number }

  local MODULE_VERSION: Version = { major = 2, minor = 1, patch = 0 }

  local function getVersionString(): string
      return `{MODULE_VERSION.major}.{MODULE_VERSION.minor}.{MODULE_VERSION.patch}`
  end
  ```

### 573. `collab-ci-cd-github-actions-pipeline`
- **Regla:** Cada Pull Request debe ejecutar un flujo de CI automatizado con GitHub Actions que verifique Selene, StyLua y pruebas unitarias antes de autorizar la fusión.
- **Ejemplo:**
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    lint-and-format:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Run StyLua Check
          run: stylua --check src/
        - name: Run Selene Lint
          run: selene src/
  ```

### 574. `collab-shared-types-monorepo`
- **Regla:** Los tipos de datos compartidos entre cliente y servidor deben centralizarse en un módulo `SharedTypes.luau` para evitar discrepancias de contratos.
- **Ejemplo:**
  ```luau
  --!strict
  -- Archivo: src/shared/SharedTypes.luau
  export type PlayerProfile = {
      userId: number,
      level: number,
      coins: number,
      inventory: { [string]: number },
  }

  export type CombatActionRequest = {
      actionType: "LightAttack" | "HeavyAttack" | "Block",
      timestamp: number,
      targetId: number?,
  }
  ```

### 575. `collab-commit-message-conventional-commits`
- **Regla:** Todo commit del equipo debe seguir el formato Conventional Commits: `<tipo>(<alcance>): <descripción>`, facilitando la generación automatizada de notas de parche.
- **Ejemplo:**
  ```text
  feat(inventory): add slot dragging and item split stack
  fix(netsec): sanitize remote packet payload length for chat tags
  refactor(audio): migrate legacy Sound instances to 2026 Wire graph
  ```

### 576. `collab-rojo-meta-json-properties`
- **Regla:** Configurar propiedades de instancias del árbol de Roblox directamente en el sistema de archivos mediante `.meta.json` contiguo al script o carpeta.
- **Ejemplo:**
  ```json
  {
    "properties": {
      "Archivable": true,
      "Attributes": {
        "IsServerAuthoritative": true
      }
    }
  }
  ```

### 577. `collab-studio-live-scripting-isolation`
- **Regla:** Durante el trabajo en equipo con Team Create activo, prohibir la edición de scripts sincronizados por Rojo directamente en el editor interno de Studio para prevenir colisiones y sobrescrituras ciegas.
- **Ejemplo:**
  ```luau
  --!strict
  -- Regla de equipo: Todo archivo bajo /src se edita en IDE externo (VS Code / Cursor / Windsurf)
  -- Studio se utiliza exclusivamente para nivel design, posicionamiento de mallas y playtesting.
  ```

### 578. `collab-environment-feature-flags`
- **Regla:** Las mecánicas en desarrollo deben encapsularse detrás de interruptores de características (*Feature Flags*) controlados por configuración para permitir despliegues continuos sin habilitar funciones a medio terminar.
- **Ejemplo:**
  ```luau
  --!strict
  local FEATURE_FLAGS = table.freeze({
      ENABLE_VOICE_OCCLUSION = false,
      ENABLE_PVP_SEASON_2 = true,
      ENABLE_NEW_LOOT_SYSTEM = false,
  })

  local function isFeatureEnabled(flagName: "ENABLE_VOICE_OCCLUSION" | "ENABLE_PVP_SEASON_2" | "ENABLE_NEW_LOOT_SYSTEM"): boolean
      return FEATURE_FLAGS[flagName] == true
  end
  ```

### 579. `collab-automated-build-remodel`
- **Regla:** La compilación de archivos de lugar `.rbxl` para pruebas o publicación debe automatizarse mediante scripts CLI con Remodel o Lune, eliminando la intervención manual en Studio.
- **Ejemplo:**
  ```bash
  # Comando de compilación automatizada
  rojo build default.project.json --output build/experience.rbxl
  ```

### 580. `collab-post-mortem-telemetry-review`
- **Regla:** Tras cualquier caída de servidor o bug crítico en producción, generar un informe técnico documentando causa raíz, stack trace capturado en telemetría y el commit corrector de prevención.
- **Ejemplo:**
  ```luau
  --!strict
  local function logCriticalError(errMessage: string, callStack: string)
      warn(`[CRITICAL ALERT] Causa: {errMessage}\nTraza: {callStack}`)
      -- Despacho seguro a telemetría
  end
  ```

## Reglas Inviolables

1. **Git como única fuente de verdad:** Todo código Luau ejecutable debe existir en el repositorio Git. Ningún script en producción debe crearse localmente en Studio sin sincronización Rojo.
2. **CI bloqueante en PRs:** Queda prohibido realizar `merge` directo a ramas principales si fallan los linters (Selene) o chequeos de formato (StyLua).
3. **Bloqueo de dependencias obligatorio:** El archivo `wally.lock` debe estar bajo control de versiones y jamás omitirse en los commits de dependencias.
4. **Cero credenciales en repositorio:** Ningún token de API, clave de Open Cloud o webhook privado puede incluirse en archivos del repositorio; usar variables de entorno o `HttpService:GetSecret()`.
5. **Aislamiento de código respecto a binarios:** Mantener archivos `.rbxl` y `.rbxm` libres de scripts embebidos no sincronizados para erradicar conflictos binarios de merge.
