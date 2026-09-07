---
name: roblox-engineer
description: "Master Skill para Desarrollo Autónomo en Roblox Studio. Orquesta los 10 dominios técnicos (235 micro-habilidades RAASE) combinados con Rojo, Companion Plugin y Visión Computacional."
license: MIT
metadata:
  domain: "Master Roblox Autonomous Engineering"
  totalSkills: 235
  author: "RAASE 2.0 / robloxIA"
---

# roblox-engineer — Ingeniero de Software y Diseñador Autónomo para Roblox Studio

Esta es la habilidad maestra que guía al agente en la construcción, auditoría, programación y despliegue de experiencias profesionales en Roblox Studio bajo los estándares de ingeniería Luau 2026.

## 🧭 Mapa de los 10 Dominios Técnicos (235 Habilidades)

| Dominio | Rango | Nombre del Módulo | Habilidades Clave |
|---|---|---|---|
| **01** | `001-025` | [roblox-01-luau-core](../roblox-01-luau-core/SKILL.md) | `--!strict`, genéricos, buffer binario, task library, Selene linting. |
| **02** | `026-060` | [roblox-02-netsec](../roblox-02-netsec/SKILL.md) | Redes Zero-Trust, Token Bucket Rate Limiting, Honeypots, validación espacial. |
| **03** | `061-085` | [roblox-03-persistence-datastores](../roblox-03-persistence-datastores/SKILL.md) | `UpdateAsync`, Session Locking, MemoryStore, guardado en `BindToClose`. |
| **04** | `086-115` | [roblox-04-3d-world-csg](../roblox-04-3d-world-csg/SKILL.md) | GeometryService (CSGv3), terreno voxel Perlin, iluminación Future, PBR. |
| **05** | `116-140` | [roblox-05-kinematics-rigs](../roblox-05-kinematics-rigs/SKILL.md) | `Motor6D.Transform` en hilo de render, inmutabilidad de C0/C1, IKControl. |
| **06** | `141-165` | [roblox-06-ui-ux-gui](../roblox-06-ui-ux-gui/SKILL.md) | UI reactiva, `UIAspectRatioConstraint`, CanvasGroup, safe zones móviles. |
| **07** | `166-185` | [roblox-07-audio-dsp](../roblox-07-audio-dsp/SKILL.md) | SoundGroups, ecualizadores, zonas acústicas, ducking compressor. |
| **08** | `186-210` | [roblox-08-memory-lifecycle](../roblox-08-memory-lifecycle/SKILL.md) | Patrón Janitor, erradicación de fugas, PartCache pooling, 60 FPS estables. |
| **09** | `211-225` | [roblox-09-economy-devex](../roblox-09-economy-devex/SKILL.md) | `ProcessReceipt` idempotente, DevEx 2026 U.S. 18+ ($0.0054/R), avatares R15. |
| **10** | `226-235` | [roblox-10-tooling-automation](../roblox-10-tooling-automation/SKILL.md) | Rojo file-sync, Companion Plugin RPC, captura host-side, auto-corrección Z-fighting. |

## ⚙️ Reglas Inviolables
1. **Nunca mutar `C0` o `C1` en bucles de tiempo de ejecución.** Manipular únicamente `Motor6D.Transform`.
2. **Nunca omitir `--!strict` en ningún script `.luau`.**
3. **Nunca confiar en datos enviados por el cliente.**
4. **Nunca dejar eventos sin limpiar.** Emplear siempre `Janitor`.
5. **Siempre registrar waypoints con `ChangeHistoryService` al editar escenas.**
