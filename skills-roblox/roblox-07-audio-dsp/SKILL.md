---
name: roblox-07-audio-dsp
description: "Skills 166-185: Audio Dinámico, SoundGroups, Filtros DSP (Reverb, Equalizer), Zonas Acústicas 3D y Audio API Wiring."
license: MIT
metadata:
  domain: "Audio & DSP Effects"
  range: "166-185"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-07-audio-dsp — Audio Dinámico, DSP y Espacialización (Skills 166 - 185)

Este módulo rige la arquitectura acústica, espacialización sonora y mezcla dinámica en Roblox.

## Catálogo de Habilidades Técnicas

### 166. `audio-sound-service-master-bus`
- **Regla:** Toda fuente de sonido debe enrutarse a un `SoundGroup` específico (Música, SFX, Ambiente, Diálogo) para control independiente de volumen y mute.

### 167. `audio-spatial-roll-off-calibration`
- **Regla:** Calibrar curvas de atenuación física `RollOffMode.LinearSquareRoot` en sonidos 3D, acotando `RollOffMinDistance` y `RollOffMaxDistance` según la escala del entorno.

### 168. `audio-sound-regions-part-bounds`
- **Regla:** Delimitar zonas acústicas y música ambiental basadas en volúmenes físicos de partes sin bucles intensivos en scripts.

### 169. `audio-equalizer-muffled-effect`
- **Regla:** Utilizar `AudioEqualizer` bajando frecuencias altas dinámicamente para simular inmersión bajo agua, aturdimiento por explosión o estar fuera de una edificación cerrada.

### 170. `audio-compressor-side-chain`
- **Regla:** Configurar `AudioCompressor` para atenuar (*ducking*) automáticamente el volumen de la música cuando se reproduzcan diálogos o efectos de alto impacto.

### 171. `audio-pitch-shift-sound-variation`
- **Regla:** Aleatorizar levemente la propiedad `PlaybackSpeed` (+/- 5%) en cada disparo de efectos recurrentes (pisadas, disparos) para evitar fatiga auditiva monótona.

### 172. `audio-wire-wiring-node-graph`
- **Regla:** Emplear la nueva API de Audio de Roblox (`AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire`) para grafos de efectos en tiempo real.
