---
name: roblox-13-vfx-maker
description: "Cubre efectos visuales (skills 266-280): partículas con ParticleEmitter, curvas ColorSequence/NumberSequence, Beams, Trails, Highlights y luces dinámicas bajo presupuesto VFX. Úsala al crear magia, fuego, portales o cualquier dinámica visual sujeta a los límites del motor."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "VFX, Lighting & Visual Dynamics"
  range: "266-280"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-13-vfx-maker — Efectos Visuales, Partículas y Dinámicas (Skills 266 - 280)

Este módulo rige la creación de sistemas de partículas de alta fidelidad, dinámicas de haz (*Beams*), estelas (*Trails*), luces dinámicas con proyección de sombras y balance estético de postprocesamiento en Roblox Studio.

## Catálogo de Habilidades Técnicas

### 266. `vfx-particle-emitter-curves`
- **Regla:** Ningún `ParticleEmitter` debe tener tamaño o transparencia estática.
- **Estándar:** Emplear `NumberSequence` con curvas continuas de desvanecimiento para evitar que las partículas desaparezcan bruscamente ("popping"):

```luau
--!strict
local function configureFlameEmitter(emitter: ParticleEmitter)
    -- Nace pequeña (0.2), crece al elevarse (0.65) y se disipa en la punta (0.1)
    emitter.Size = NumberSequence.new({
        NumberSequenceKeypoint.new(0, 0.2),
        NumberSequenceKeypoint.new(0.4, 0.65),
        NumberSequenceKeypoint.new(1, 0.05),
    })

    -- Opaca al nacer, totalmente transparente al morir
    emitter.Transparency = NumberSequence.new({
        NumberSequenceKeypoint.new(0, 0.1),
        NumberSequenceKeypoint.new(0.7, 0.4),
        NumberSequenceKeypoint.new(1, 1.0),
    })
end
```

### 267. `vfx-color-temperature-sequence`
- **Regla:** El fuego y la combustión deben respetar el gradiente de radiación de cuerpo negro utilizando `ColorSequence`:
  - $t = 0$: Amarillo intenso incandescente `Color3.fromRGB(255, 230, 110)`
  - $t = 0.5$: Naranja cálido `Color3.fromRGB(240, 105, 25)`
  - $t = 1.0$: Rojo oscuro o gris ceniza `Color3.fromRGB(160, 40, 15)`

### 268. `vfx-rate-and-budget-policing`
- **Regla:** Presupuesto de partículas estricto para evitar saturación de GPU en dispositivos móviles:
  - Antorchas ambientales: `Rate <= 18`, `Lifetime = NumberRange.new(0.6, 1.2)`
  - Hogueras / forjas grandes: `Rate <= 45`
  - Efectos mágicos transitorios: `Rate <= 80` con apagado automático tras 1.5 segundos.

### 269. `vfx-pointlight-future-shadows`
- **Regla:** Fuentes de luz asociadas a fuego o farolas DEBEN configurarse con:
  - `PointLight.Shadows = true` (bajo `Technology.Future`)
  - `Brightness` calibrado entre 1.5 y 2.6 (jamás valores cegadores $> 5$)
  - `Range` calibrado al espacio físico del recinto (16 a 32 studs).

### 270. `vfx-beam-texture-scrolling-speed`
- **Regla:** Para crear cascadas, corrientes de agua o rayos de energía continua, utilizar `Beam` conectado entre dos `Attachment`:
  - Configurar `TextureSpeed` (desplazamiento continuo) y `TextureLength` adecuado para que la textura no se distorsione.
  - Habilitar `FaceCamera = true` en rayos cilíndricos para evitar que se vean como cintas planas desde ángulos oblicuos.

### 271. `vfx-trail-motion-persistence`
- **Regla:** Rastro cinético de proyectiles o armas cuerpo a cuerpo mediante `Trail`:
  - `Lifetime` acotado entre 0.15 y 0.35 segundos.
  - `MinLength = 0.1` para evitar artefactos en reposo.

### 272. `vfx-highlight-instance-budget`
- **Regla:** El motor de Roblox Studio solo renderiza hasta 31 instancias `Highlight` simultáneas en pantalla.
- **Límite RAASE:** Máximo de 20 `Highlight` activos para señalización o selección. Superar este límite causa parpadeo (*flickering*) y desactivación aleatoria de siluetas.

### 273. `vfx-light-emission-transparency-balance`
- **Regla:** Mantener `LightEmission` entre 0.35 y 0.75 para humo y niebla para que reciban la luz ambiental del entorno. Solo chispas, rayos láser y magia pura pueden usar `LightEmission = 1.0`.

### 274. `vfx-atmosphere-haze-decay-tuning`
- **Regla:** Parámetros atmosféricos estándar en `Lighting.Atmosphere`:
  - `Density`: entre 0.14 y 0.28 (evita niebla opaca que ciegue al jugador).
  - `Haze`: entre 0.1 y 0.3 para aportar profundidad visual.
  - `Decay`: tonos cálidos para puestas de sol o neutros azulados para noche medieval.

### 275. `vfx-bloom-threshold-suppression`
- **Regla:** El efecto `BloomEffect.Threshold` debe mantenerse $\ge 1.2$. Si se reduce por debajo de 0.8, todas las partes claras de la escena comenzarán a brillar como focos desenfocados.

### 276. `vfx-fire-procedural-smoke-layering`
- **Regla:** Una antorcha de calidad comercial debe componerse de 3 capas físicas:
  1. Punta negra carbonizada (`Basalt`, `[24, 24, 26]`).
  2. Emisor de llama cálida (`Fire` o `ParticleEmitter` rápido vertical).
  3. Emisor secundario de chispas y pavesas (*embers*) ascendentes con `SpreadAngle`.

### 277. `vfx-sound-emitter-3d-roll-off`
- **Regla:** Todo efecto visual de fuego, agua o magia debe estar emparejado con un `Sound` 3D:
  - `RollOffMode = Enum.RollOffMode.InverseTapered`
  - `RollOffMinDistance = 5`, `RollOffMaxDistance = 45`
  - `Looped = true` para fuentes continuas.

### 278. `vfx-surface-light-directional-cast`
- **Regla:** Emplear `SurfaceLight` en mostradores, escaparates o techos para proyectar luz direccional hacia abajo sin iluminar innecesariamente el techo en direcciones no físicas.

### 279. `vfx-depth-of-field-focal-distance`
- **Regla:** `DepthOfFieldEffect` solo debe activarse en cinemáticas o menús de interfaz, manteniendo `InFocusRadius >= 40` durante el gameplay para no inducir fatiga visual en los jugadores.

### 280. `vfx-janitor-cleanup-lifecycle`
- **Regla:** Todo efecto de partículas efímero (impactos, explosiones, auras temporales) DEBE gestionarse con `Janitor`:
  - Al completar la duración, invocar `emitter.Enabled = false`, esperar el tiempo de vida máximo (`task.wait(emitter.Lifetime.Max)`), y luego llamar a `emitter:Destroy()`.
