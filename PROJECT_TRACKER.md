# 🗃️ PROJECT DATA LEDGER: robloxIA / RAASE 2.0

## 1. 📌 Project Identity
- **Name**: robloxIA (Roblox Autonomous Agent Studio Engine - RAASE 2.0)
- **Core Goal**: Convertir cualquier agente de IA (Antigravity, Claude Code, Codex, OpenCode) en un Ingeniero y Diseñador Autónomo de Roblox Studio de alto rendimiento capaz de construir, programar, auditar por visión computacional y desplegar experiencias completas sin intervención manual.
- **Tech Stack**:
  - **Lenguaje Motor**: Luau 2026 con modo estricto (`--!strict`), bibliotecas `task`, `buffer`, `vector`, `GeometryService`, `Audio API`.
  - **Sincronización**: Rojo 7.x (File-Sync bidireccional local a Studio).
  - **Puente RPC**: Servidor HTTP nativo en Node.js (Long-polling en puerto `34873`).
  - **Visión Computacional**: Python / Node (captura host-side del Viewport de Studio).
  - **Seguridad & Datos**: Token Bucket Rate Limiter, Honeypots, DataStore `UpdateAsync` con Session Locking, DevEx 2026 con avatares R15 estrictos.
  - **Metodología y Reglas**: skillsGV (197 skills de software e ingeniería) + RAASE (235 micro-habilidades técnicas Luau).
- **Aesthetic**: Código modular y desacoplado, arquitecturas Zero-Trust, interfaces adaptativas para móviles y consola, estética 3D con Future Lighting y alineación matemática de texturas.

## 2. 🚦 Strict Rules
- **RN-01 (Luau Strict)**: Todo script Luau (`.luau`) DEBE iniciar con la directiva `--!strict` y tipado nominal/estructural explícito (`export type ...`).
- **RN-02 (Zero Legacy Functions)**: Prohibidas las funciones obsoletas `spawn()`, `delay()`, `wait()`. Emplear exclusivamente la biblioteca nativa `task`.
- **RN-03 (Acceso a Servicios)**: Acceso a servicios únicamente mediante `game:GetService("NombreServicio")`.
- **RN-04 (Zero-Trust NetSec)**: El cliente es hostil; toda transacción, daño, inventario y validación espacial se calcula en el servidor.
- **RN-05 (Janitor Lifecycle)**: Todo objeto con eventos o promesas debe implementar `Janitor` para erradicar fugas de memoria (`RBXScriptConnection`).
- **RN-06 (Kinematics Rule)**: Toda cinemática procedural debe manipular `Motor6D.Transform` en hilos de render; prohibido alterar `C0/C1` en tiempo de ejecución.
- **RN-07 (DevEx 2026 & Idempotencia)**: `MarketplaceService.ProcessReceipt` debe persistir `PurchaseId` en DataStore antes de otorgar productos y retornar `NotProcessedYet` en fallos. Solo avatares R15 para calificar a tasa U.S. 18+ ($0.0054/R$).
- **RN-08 (Undo Safety)**: Todo comando de modificación de escena en el companion plugin debe registrarse con `ChangeHistoryService:TryBeginRecording()` y `FinishRecording()`.
- **RN-09 (SOLID / Clean Code)**: Funciones cortas (<40 líneas), principio de responsabilidad única, sin código muerto ni bypasses no documentados.

## 3. 🗺️ Roadmap & Phases
- `[x]` **Fase 1: Especificación Formal, Catálogo de Skills y Setup del Repositorio**
  - Blueprint RAASE 2.0 actualizado con rediseño.
  - Matriz indexada de las 235 micro-habilidades (`raase_skills.json`).
  - Instrucciones de agente (`CLAUDE.md`, `agent/system_prompt.md`).
- `[x]` **Fase 2: Infraestructura del Enlace Local (Host Bridge & Vision Worker)**
  - Servidor HTTP REST + Long-Polling (`bridge/server.mjs`).
  - Capturador host-side de Viewport de Studio (`bridge/screen_capture.py`).
  - Conector de subida de assets (`bridge/open_cloud.mjs`).
- `[x]` **Fase 3: Companion Plugin de Roblox Studio**
  - Script Luau con long-polling, ChangeHistoryService y actuadores de escena (`plugin/CompanionPlugin.server.luau`).
  - Configuración Rojo para compilar el plugin (`plugin/default.project.json`).
- `[x]` **Fase 4: Plantilla de Proyecto Luau de Producción con Rojo**
  - Configuración de Rojo (`default.project.json`), Wally, Selene y StyLua.
  - Módulos de seguridad de red, DataStore transaccional y DevEx 2026.
  - Controlador de cinemática procedural y HUD reactivo.
- `[x]` **Fase 5: Herramientas del Agente Autónomo y CLI Orquestador**
  - Script CLI (`agent/orchestrator_cli.mjs`) para canalizar intenciones, bridge y visión.
  - Documentación maestra (`README.md`).
- `[x]` **Fase 6: Verificación de Calidad (DoD Gatekeeper & Pruebas)**
  - Auditoría DoD Checker: SOLID, seguridad, integridad funcional `[ 🟢 PASS ]`.
  - Pruebas unitarias y de integración del bridge verificadas exitosamente.
  - Doble juicio ciego (Judgment Day: Red SHIP / Blue SHIP).

## 4. 🧠 Decision Log
- `[2026-09-07]` **Resolución Final del 360° QA Audit & Judgment Day**:
  1. `Janitor.luau`: Eliminado el sombreado de variable `task` en el bucle `for item in pairs(tasks)` para que `task.cancel()` cancele hilos reales sin silenciar errores en `pcall`.
  2. `MonetizationService.luau`: Verificación del jugador conectado e invocación exitosa del handler de producto antes de registrar la compra cumplida (`granted = true`) en DataStore, evitando la pérdida irreversible de compras en retintento.
  3. `CompanionPlugin.server.luau`: Desenpaquetado e iteración correcta sobre el array `{BasePart}` devuelto por `GeometryService:UnionAsync`, `SubtractAsync` e `IntersectAsync` para nombrarlas y emparentarlas correctamente en `workspace`.
  4. `bridge/server.mjs`: Añadido guard `responded` en `/api/capture` para erradicar llamadas duplicadas a `sendJson()` y el error fatal de proceso `ERR_HTTP_HEADERS_SENT`.
  5. `DataPersistenceService.luau`: Protección de lease en `saveData` (`sessionLockJobId == CURRENT_JOB_ID`) y cola atómica de guardados en vuelo (`activeSavingCount`) para evitar salidas prematuras en `game:BindToClose`.
  6. `CharacterController.client.luau`: Asignación directa de `waistJoint.Transform` y `neckJoint.Transform` con ángulos acotados para prevenir la acumulación multiplicativa y el giro centrífugo continuo del personaje.
  7. `bridge/open_cloud.mjs`: Lanzamiento de error explícito ante timeout en polling en lugar de inyectar un UUID de operación en formato `rbxassetid://`.
  8. `NetworkSecurityService.luau`: Detección y rechazo de valores `NaN` en coordenadas de `targetPosition` en la validación de proximidad espacial.
- `[2026-09-07]` **Resolución Adversarial de Judgment Day Inicial**: Corrección de 8 fallas críticas detectadas por los jueces Red y Blue:
  1. Jerarquía de `require` en `init.server.luau` para Rojo (`script:WaitForChild(...)`).
  2. Serialización de payloads en `postReport` (eliminado `JSONDecode` redundante).
  3. Soporte de actuadores `CSG_OPERATION` (`GeometryService`) y `SET_TERRAIN_VOXELS` en el Companion Plugin.
  4. Session locking con `JobId` y detección de adquisición de lease en `DataPersistenceService`.
  5. Deduplicación atómica con `UpdateAsync` en `MonetizationService` antes de entregar productos.
  6. Corrección de articulación `Neck` en `UpperTorso` y transformación de puntería a espacio objeto en `CharacterController`.
  7. Captura de pantalla enfocada en el rect de la ventana de Roblox Studio.
  8. Protecciones con `pcall` en `Janitor:Cleanup()` y middleware `listenGuarded` en `NetworkSecurityService`.
- `[2026-09-07]` **Decisión de Rediseño de Protocolo**: Reemplazo de supuestos WebSockets en Studio por Servidor HTTP Long-Polling en Node.js debido a restricciones del motor de Luau (`HttpService` no tiene cliente WebSocket).
- `[2026-09-07]` **Decisión de Visión Host-Side**: El recorte de pantalla se ejecuta a nivel de host en el SO porque Roblox Studio no permite a los plugins escribir imágenes PNG a disco.
- `[2026-09-07]` **Decisión de Integración con skillsGV**: Se adopta el estándar de 197 skills como meta-orquestador (DoD checker, Decision Gate, Router, Project Tracker), integrando las 235 habilidades de RAASE como catálogo de dominio técnico Luau.

## 5. 🐞 Deferred Issues
- *Ninguno registrado al inicio de la Fase 1.*
