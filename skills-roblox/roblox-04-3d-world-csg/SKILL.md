---
name: roblox-04-3d-world-csg
description: "Skills 086-115: Modelado 3D, Geometrías CSGv3 con GeometryService, Terreno Voxel, Ruido Perlin, Iluminación Future y Optimización PBR."
license: MIT
metadata:
  domain: "3D World, CSGv3 & Procedural"
  range: "086-115"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-04-3d-world-csg — Mundo 3D, Entornos, Terreno y CSGv3 (Skills 086 - 115)

Este módulo rige la creación de entornos tridimensionales, modelado sólido y terreno procedural en Roblox Studio.

## Catálogo de Habilidades Técnicas

### 086. `3d-glb-pipeline-import`
- **Regla:** Priorizar formato GLB con texturas PBR integradas y escala unitaria (1,1,1).

### 087. `3d-triangle-budget-compliance`
- **Regla:** Máximo 20.000 triángulos por malla unitaria; props decorativos dinámicos por debajo de 5.000 triángulos.

### 088. `3d-building-mesh-fragmentation`
- **Regla:** Estructuras arquitectónicas grandes deben fragmentarse en submallas modulares para optimizar la oclusión y culling del renderizador.

### 089. `3d-pbr-material-authoring`
- **Regla:** Configurar `SurfaceAppearance` con mapas ColorMap, NormalMap, MetalnessMap y RoughnessMap.

### 090. `csg-watertight-mesh-assertion`
- **Regla:** Toda geometría sometida a operaciones booleanas dinámicas DEBE ser hermética (*watertight*), sin planos abiertos ni normales invertidas.

### 091-095. `csg-geometry-service-operations`
- `csg-geometry-service-union`: `GeometryService:UnionAsync()` en tiempo de ejecución.
- `csg-geometry-service-subtract`: `GeometryService:SubtractAsync()` para excavar cuevas o destrucción procedural.
- `csg-geometry-service-intersect`: `IntersectAsync()` para modelado booleano de intersecciones.
- `csg-geometry-service-sweeppart`: Generación procedural de túneles y zanjas con `SweepPartAsync()`.
- `csg-geometry-service-fragment`: Fragmentación de piezas ante impactos con `FragmentAsync()`.

### 096-100. `terrain-procedural-and-voxels`
- `terrain-procedural-perlin-islands`: Generación de archipiélagos flotantes con funciones fractales de Ruido Perlin 3D.
- `terrain-voxel-biomes-palette`: Transición suave entre biomas (Hielo, Arena, Roca, Basalto) manipulando el voxel grid.
- `terrain-smooth-write-voxels`: Empleo de `Terrain:WriteVoxels()` para modificaciones de alta velocidad sin bloqueos de render.
- `terrain-raycast-vegetation-scatter`: Dispersión de árboles y rocas proyectando rayos hacia abajo para alinear con la normal de la superficie.
- `3d-checkerboard-texture-styling`: Configuración uniforme de texturas cuadriculadas ajustando `StudsPerTileU` y `StudsPerTileV`.

### 101-115. `lighting-and-visual-effects`
- `3d-lighting-atmosphere-design`: Configuración de tecnología `Future`, `Atmosphere`, `Skyboxes` y dispersión Haze.
- `3d-depth-of-field-cinematics`: Enfoque dinámico con `DepthOfFieldEffect`.
- `3d-bloom-sunrays-postprocessing`: Calibración estética de `BloomEffect` y `SunRaysEffect`.
- `3d-content-streaming-optimization`: Configuración de `Workspace.StreamingEnabled` con radio mínimo de 64 studs.
- `3d-highlight-selection-rendering`: Señalización de objetivos con `Highlight` respetando el límite de 31 simultáneos.
