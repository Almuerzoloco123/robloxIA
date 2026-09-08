---
name: roblox-10-tooling-automation
description: "Rige el pipeline de tooling y automatización de Studio (skills 226-235): sincronización Rojo, RPC del Companion Plugin (puerto 34873), captura host-side del viewport, detección visual de Z-fighting y publicación vía Open Cloud. Úsala al configurar el flujo agente→Studio, la publicación desatendida o el análisis visual de escenas."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Tooling & Studio Automation"
  range: "226-235"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-10-tooling-automation — Herramientas, Rojo, Visión y Automatización (Skills 226 - 235)

Este módulo rige el pipeline de enlace entre agentes de IA autónomos y el motor Roblox Studio en ejecución.

## Catálogo de Habilidades Técnicas

### 226. `tools-rojo-project-json-config`
- **Regla:** Mantenimiento riguroso del archivo `default.project.json` sincronizando scripts y carpetas locales con el DataModel de Studio en menos de 50 ms.

### 227. `tools-studio-companion-plugin-rpc`
- **Regla:** Servidor HTTP local en el puerto `34873` con long-polling para el despacho de comandos de escena (`SPAWN_PART`, `CREATE_ISLAND`, `SET_LIGHTING`) y telemetría de Studio.
- **Protección de Historial y Deshacer (`tools-change-history-undo-protection`):** Toda mutación de escena en el companion plugin debe registrarse con `ChangeHistoryService:TryBeginRecording()` y `FinishRecording()` para permitir deshacer atómicamente con *Ctrl+Z*.

### 228. `tools-viewport-screen-capture`
- **Regla:** Extracción programada del framebuffer del Viewport de Roblox Studio a nivel de host en el SO (usando Win32 API / MSS) y guardado en `viewport_latest.png`.

### 229. `tools-vision-symmetry-error-checker`
- **Regla:** Análisis visual con IA multimodal para detectar piezas flotantes, rotaciones disonantes o desalineación en islas y edificaciones.

### 230. `tools-vision-zfighting-detector`
- **Regla:** Detección visual de parpadeo de polígonos por superposición coplanar de partes. Emisión inmediata de micro-desplazamiento de `0.005 studs` para erradicar el artefacto.

### 231. `tools-vision-texture-alignment-audit`
- **Regla:** Comprobación de escala y continuidad de texturas cuadriculadas (*checkerboards*) verificando que `StudsPerTileU` y `StudsPerTileV` coincidan en superficies adyacentes.

### 232. `tools-open-cloud-publish-experience`
- **Regla:** Publicación desatendida del lugar (`.rbxl`) y subida de assets (GLB, audio, texturas) mediante las APIs REST de Roblox Open Cloud.

### 233. `tools-open-cloud-datastore-query`
- **Regla:** Inspección, consulta y depuración de registros en DataStores de producción vía Open Cloud DataStore API sin requerir una sesión activa de Studio.

### 234. `tools-wally-package-management`
- **Regla:** Instalación y versionado de librerías Luau (`Janitor`, `GoodSignal`, `Promise`) mediante Wally (`wally.toml`).

### 235. `tools-telegram-bridge-notification`
- **Regla:** Emisión de alertas de telemetría crítica, fallos en compilación o capturas visuales de hitos directamente a canales de supervisión remota vía bot de Telegram.
