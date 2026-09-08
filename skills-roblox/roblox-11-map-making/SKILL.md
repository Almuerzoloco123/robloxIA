---
name: roblox-11-map-making
description: "Cubre level design y construcción de mapas (skills 236-250): macro-zonificación, biomas procedurales, clearance espacial AABB, integración de terreno voxel y presupuestos de streaming. Úsala al diseñar o generar niveles completos, islas o mundos con límites de rendimiento por plataforma."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Level Design & Map Making"
  range: "236-250"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-11-map-making — Level Design, Zonificación y Map Making (Skills 236 - 250)

Este módulo rige la arquitectura de entornos de juego masivos, nivelación topográfica, flujo de jugadores, zonificación y optimización espacial en Roblox Studio.

## Catálogo de Habilidades Técnicas

### 236. `map-zoning-macro-layout`
- **Regla:** La distribución del mapa debe estructurarse en anillos concéntricos o cuadrantes cardinales claramente delimitados (Spawn / Hub Central -> Zonas de Juego -> Perímetro de Contención).
- **Estándar:** Mantener líneas de visión desobstruidas hacia los hitos principales (*landmarks*) desde cualquier punto del mapa para facilitar la orientación espacial del jugador.

### 237. `map-spatial-aabb-clearance`
- **Regla:** Antes de colocar cualquier prop o estructura secundaria, el agente DEBE calcular la caja delimitadora AABB:
  $$|C_{1, i} - C_{2, i}| \ge \frac{S_{1, i} + S_{2, i}}{2} + \text{margin}$$
- **Estándar:** Margen mínimo de despeje de 2 studs para caminos peatonales y 4 studs para accesos a puertas y portales.

```luau
--!strict
local function checkAABBClearance(cf: CFrame, size: Vector3, margin: number?): boolean
    local searchMargin = margin or 2
    local querySize = size + Vector3.new(searchMargin, searchMargin, searchMargin)
    local overlapParams = OverlapParams.new()
    overlapParams.FilterType = Enum.RaycastFilterType.Exclude
    overlapParams.FilterDescendantsInstances = { workspace.Terrain }

    local partsInBox = workspace:GetPartBoundsInBox(cf, querySize, overlapParams)
    return #partsInBox == 0
end
```

### 238. `map-terrain-voxel-biome-blending`
- **Regla:** La transición entre diferentes biomas de Terreno (Hierba a Arena o Roca a Nieve) debe tener un gradiente de mezcla de mínimo 16 studs (4 voxels de resolución de Terreno). Prohibidos cortes rectilíneos abruptos en el grid voxel.

### 239. `map-streaming-budget-allocation`
- **Regla:** En mapas mayores a 512x512 studs, `Workspace.StreamingEnabled` es mandatorio.
- **Configuración:**
  - `StreamingMinRadius = 64`
  - `StreamingTargetRadius = 128`
  - `StreamOutBehavior = Enum.StreamOutBehavior.LowMemory`
  - Modelos masivos deben configurarse con `ModelStreamingMode = Enum.ModelStreamingMode.Atomic` o `PersistentPerPlayer`.

### 240. `map-occlusion-culling-portals`
- **Regla:** Dividir mapas densos con elementos oclusores naturales (montañas, murallas, edificios altos) para activar el culling del motor de Roblox y evitar que la GPU procese geometrías fuera del campo de visión.

### 241. `map-player-circulation-chokepoints`
- **Regla:** Las avenidas de circulación principal deben tener una anchura mínima de 12 studs. Los cuellos de botella (*chokepoints*) tácticos nunca deben ser menores a 6 studs para evitar bloqueo de colisión entre avatares R15.

### 242. `map-foliage-raycast-scatter`
- **Regla:** La colocación procedural de vegetación debe realizarse mediante raycasting descendente, orientando la base del modelo con la normal del impacto (`RaycastResult.Normal`):

```luau
--!strict
local function placeFoliageOnSurface(model: Model, dropPos: Vector3): boolean
    local rayOrigin = dropPos + Vector3.new(0, 50, 0)
    local rayDir = Vector3.new(0, -100, 0)
    local rayParams = RaycastParams.new()
    rayParams.FilterType = Enum.RaycastFilterType.Include
    rayParams.FilterDescendantsInstances = { workspace.Terrain, workspace:FindFirstChild("MapGeometry") }

    local result = workspace:Raycast(rayOrigin, rayDir, rayParams)
    if result then
        local upVector = result.Normal
        local forwardVector = Vector3.new(0, 0, -1)
        if math.abs(upVector:Dot(forwardVector)) > 0.9 then
            forwardVector = Vector3.new(1, 0, 0)
        end
        local rightVector = forwardVector:Cross(upVector).Unit
        local correctedForward = upVector:Cross(rightVector).Unit

        local surfaceCF = CFrame.fromMatrix(result.Position, rightVector, upVector, -correctedForward)
        model:PivotTo(surfaceCF)
        return true
    end
    return false
end
```

### 243. `map-verticality-ladder-stair-ratios`
- **Regla:** Escaleras peatonales deben construirse con un ratio contrahuella/huella canónico: contrahuella $\le 0.8$ studs, huella $\ge 1.4$ studs. Pendientes mayores a 45° deben incorporar una parte invisible con cuña (`WedgePart`) con `CanCollide = true` y `Transparency = 1` para permitir ascenso fluido sin saltos bruscos de la cámara.

### 244. `map-water-volume-terrain-integration`
- **Regla:** Cuerpos de agua (ríos, lagos, fuentes) deben implementarse con `Terrain:FillBlock(..., Enum.Material.Water)` o `Glass` traslúcido (`Transparency = 0.35`). Prohibido terminantemente el material `Neon` para agua.

### 245. `map-acoustic-reverb-zones`
- **Regla:** Cada zona cerrada del mapa (cueva, catedral, mazmorra) debe poseer un `Part` no colisionable delimitando su AABB con un script detector de entrada que modifique `SoundService.AmbientReverb` (ej. `Enum.ReverbType.Cave` o `ConcertHall`).

### 246. `map-safe-spawn-distribution`
- **Regla:** Configurar un mínimo de 4 instancias `SpawnLocation` distribuidas con separación $\ge 10$ studs, `Enabled = true`, `Duration = 0`, y verificando elevación de +1 stud sobre el piso para erradicar el bug de caída al vacío tras respawn.

### 247. `map-boundary-soft-kill-barriers`
- **Regla:** El borde del mapa debe contar con barreras invisibles amortiguadoras (`CanCollide = true`) y zonas de advertencia visual antes del límite del abismo, seguido de un volumen de `Touched` que aplique `Humanoid:TakeDamage(Humanoid.MaxHealth)` de forma determinista.

### 248. `map-landmark-sightline-verification`
- **Regla:** Al menos un hito visual principal (torre, volcán, castillo) debe ser visible desde el 80% de las zonas transitables del mapa.

### 249. `map-lod-distance-mesh-swapping`
- **Regla:** Modelos decorativos distantes (>150 studs) deben simplificar geometrías y apagar colisiones (`CanCollide = false`) y sombras (`CastShadow = false`) para optimizar el rendimiento.

### 250. `map-memory-draw-call-budget-audit`
- **Regla:** La suma total de partes no instanciadas por streaming en la zona central no debe exceder los 2.500 primitives y 1.200 draw calls para garantizar 60 FPS estables en dispositivos móviles gama media.
