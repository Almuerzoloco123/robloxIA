---
name: roblox-14-npc-ai-pathfinding
description: "Rige la inteligencia artificial de NPCs, sistemas de navegación y máquinas de estados finitos (skills 281-295): PathfindingService, waypoints con detección de salto, percepción sensorial de campo de visión (FOV), raycasting autoritativo de línea de visión, FSM desacopladas y Network Ownership server-side obligatorio para prevenir exploits. Úsala al programar enemigos, aliados, monstruos, sistemas de patrulla y combate autónomo en Roblox."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "NPC AI, Pathfinding & State Machines"
  range: "281-295"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-14-npc-ai-pathfinding — NPC AI, Pathfinding y Máquinas de Estado (Skills 281 - 295)

Este módulo establece los estándares técnicos para la implementación de entidades no jugables (NPCs) inteligentes, navegación fluida en mallas 3D complejas y arquitecturas de máquinas de estados finitos (FSM) de alto rendimiento en Roblox Studio bajo Luau estricto.

## Principio Fundamental: Simulación Servidor y Cero Confianza Física
Toda decisión táctica, detección sensorial, cálculo de ruta y aplicación de daño reside exclusivamente en el servidor. El cliente es únicamente un receptor pasivo de animación y renderizado. Para evitar lag-switching y manipulación física por atacantes, la propiedad de red (*Network Ownership*) de cada parte del NPC debe anclarse incondicionalmente al servidor (`part:SetNetworkOwner(nil)`).

---

## Catálogo de Habilidades Técnicas

### 281. `ai-pathfinding-agent-parameters-configuration`
- **Regla:** Configurar parámetros de agente acordes a la geometría del rig antes de crear rutas de navegación con `PathfindingService:CreatePath()`.
- **Estándar:**
```luau
--!strict
local PathfindingService = game:GetService("PathfindingService")

export type AgentConfig = {
    AgentRadius: number,
    AgentHeight: number,
    AgentCanJump: boolean,
    AgentCanClimb: boolean,
    WaypointSpacing: number,
    Costs: { [string]: number }?,
}

local function createNpcPath(config: AgentConfig): Path
    local agentParams: { [string]: any } = {
        AgentRadius = config.AgentRadius,
        AgentHeight = config.AgentHeight,
        AgentCanJump = config.AgentCanJump,
        AgentCanClimb = config.AgentCanClimb,
        WaypointSpacing = config.WaypointSpacing,
    }
    if config.Costs then
        agentParams.Costs = config.Costs
    end

    return PathfindingService:CreatePath(agentParams)
end
```

### 282. `ai-navmesh-compute-async-status-validation`
- **Regla:** Computar rutas de forma asíncrona dentro de un bloque `pcall` y validar que `path.Status == Enum.PathStatus.Success` antes de acceder a waypoints.
```luau
--!strict
local function computeSafePath(path: Path, startPos: Vector3, targetPos: Vector3): boolean
    local success, err = pcall(function()
        path:ComputeAsync(startPos, targetPos)
    end)

    if not success then
        warn("[Pathfinding] Fallo en cómputo:", err)
        return false
    end

    return path.Status == Enum.PathStatus.Success
end
```

### 283. `ai-waypoint-traversal-humanoid-navigation`
- **Regla:** Iterar waypoints secuencialmente mediante `Humanoid:MoveTo()`, detectando saltos automáticos (`Enum.PathWaypointAction.Jump`) y gestionando tiempos de expiración de llegada.
```luau
--!strict
local function followWaypoints(humanoid: Humanoid, waypoints: { PathWaypoint }, maxTimePerWaypoint: number)
    for index, waypoint in ipairs(waypoints) do
        if index == 1 then
            continue -- Saltar posición inicial actual
        end

        if waypoint.Action == Enum.PathWaypointAction.Jump then
            humanoid.Jump = true
        end

        humanoid:MoveTo(waypoint.Position)

        local reached = false
        local connection: RBXScriptConnection?
        connection = humanoid.MoveToFinished:Connect(function(status: boolean)
            reached = true
        end)

        local elapsed = 0
        while not reached and elapsed < maxTimePerWaypoint and humanoid.Health > 0 do
            local dt = task.wait(0.1)
            elapsed += dt
        end

        if connection then
            connection:Disconnect()
        end

        if not reached then
            -- NPC atascado; abortar para recalcular
            break
        end
    end
end
```

### 284. `ai-dynamic-path-blocked-repathing`
- **Regla:** Suscribirse al evento `path.Blocked` para abortar la trayectoria actual y computar una nueva ruta si un obstáculo móvil interrumpe el trayecto.
```luau
--!strict
local function monitorPathBlockage(path: Path, onBlocked: (blockedIndex: number) -> ()): RBXScriptConnection
    return path.Blocked:Connect(function(blockedWaypointIndex: number)
        onBlocked(blockedWaypointIndex)
    end)
end
```

### 285. `ai-custom-material-traversal-costs`
- **Regla:** Penalizar o bonificar superficies de terreno mediante la tabla `Costs` en `AgentParameters` para que los NPCs eviten peligros (agua, lava, pantanos) o prefieran carreteras de asfalto.
```luau
--!strict
local customCosts = {
    Water = 10.0,            -- Evitar cruzar masas de agua salvo necesidad extrema
    CrackedLava = math.huge, -- Intransitable (Enum.Material.CrackedLava)
    Cobblestone = 0.8,       -- Superficie preferida de patrulla
}
```

### 286. `ai-pathfinding-modifier-dynamic-doors`
- **Regla:** Utilizar instancias `PathfindingModifier` en puertas o barricadas dinámicas; modificar su propiedad `Passable` para recalcular o permitir el paso cuando una puerta se abre.
```luau
--!strict
local function setDoorPassable(doorModifier: PathfindingModifier, isPassable: boolean)
    doorModifier.Passable = isPassable
    doorModifier.Label = if isPassable then "OpenDoor" else "LockedDoor"
end
```

### 287. `ai-fov-dot-product-sensory-perception`
- **Regla:** Evaluar el cono de visión (FOV) del NPC mediante el producto escalar (`dot product`) entre el vector de dirección frontal del NPC y el vector hacia el objetivo.
```luau
--!strict
local function isTargetInFOV(npcRoot: BasePart, targetPos: Vector3, fovDegrees: number): boolean
    local lookVector = npcRoot.CFrame.LookVector
    local directionToTarget = (targetPos - npcRoot.Position).Unit
    local dotProduct = lookVector:Dot(directionToTarget)
    local minDot = math.cos(math.rad(fovDegrees / 2))

    return dotProduct >= minDot
end
```

### 288. `ai-raycast-server-line-of-sight`
- **Regla:** Confirmar visibilidad física directa hacia el objetivo mediante `workspace:Raycast()`, excluyendo el propio rig del NPC y accesorios transparentes.
```luau
--!strict
local function hasLineOfSight(npcModel: Model, targetPart: BasePart): boolean
    local origin = npcModel:GetPivot().Position
    local targetPos = targetPart.Position
    local direction = targetPos - origin

    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = { npcModel }
    params.IgnoreWater = true

    local result = workspace:Raycast(origin, direction, params)
    if result and result.Instance then
        return result.Instance:IsDescendantOf(targetPart.Parent)
    end

    return false
end
```

### 289. `ai-fsm-state-machine-architecture`
- **Regla:** Diseñar la IA desacoplada en estados discretos (`Idle`, `Patrol`, `Chase`, `Attack`, `Flee`) gobernados por un manejador de transiciones explícito.
```luau
--!strict
export type AIState = "Idle" | "Patrol" | "Chase" | "Attack" | "Flee"

export type FSM = {
    CurrentState: AIState,
    SetState: (self: FSM, newState: AIState) -> (),
    Update: (self: FSM, dt: number) -> (),
}

local function createFSM(initialState: AIState): FSM
    local self = {
        CurrentState = initialState,
    } :: FSM

    function self:SetState(newState: AIState)
        if self.CurrentState ~= newState then
            self.CurrentState = newState
        end
    end

    return self
end
```

### 290. `ai-patrol-waypoint-scheduler`
- **Regla:** Implementar patrullas cíclicas o aleatorias con pausas temporizadas en cada nodo (`Idle`) para generar un comportamiento natural y orgánico.
```luau
--!strict
local function getNextPatrolPoint(patrolNodes: { Vector3 }, currentIndex: number): (Vector3, number)
    local nextIndex = currentIndex + 1
    if nextIndex > #patrolNodes then
        nextIndex = 1
    end
    return patrolNodes[nextIndex], nextIndex
end
```

### 291. `ai-chase-intercept-prediction`
- **Regla:** Durante la persecución de objetivos móviles de alta velocidad, calcular un punto de interceptación adelantado utilizando `targetRoot.AssemblyLinearVelocity`.
```luau
--!strict
local function calculateInterceptPoint(npcPos: Vector3, targetRoot: BasePart, npcSpeed: number): Vector3
    local targetPos = targetRoot.Position
    local targetVelocity = targetRoot.AssemblyLinearVelocity
    local distance = (targetPos - npcPos).Magnitude
    local timeToReach = if npcSpeed > 0 then distance / npcSpeed else 0

    return targetPos + (targetVelocity * math.clamp(timeToReach, 0, 1.5))
end
```

### 292. `ai-attack-cooldown-range-validator`
- **Regla:** Validar alcance y cooldowns de ataque exclusivamente en el servidor antes de disparar animaciones y deducir salud con `Humanoid:TakeDamage()`.
```luau
--!strict
local function executeServerAttack(npcRoot: BasePart, targetHumanoid: Humanoid, attackRange: number, damage: number): boolean
    local targetRoot = targetHumanoid.RootPart
    if not targetRoot then return false end

    local distance = (targetRoot.Position - npcRoot.Position).Magnitude
    if distance <= attackRange and targetHumanoid.Health > 0 then
        targetHumanoid:TakeDamage(damage)
        return true
    end

    return false
end
```

### 293. `ai-network-ownership-server-lock`
- **Regla:** Fijar incondicionalmente `primaryPart:SetNetworkOwner(nil)` en todos los NPCs con física activa para evitar que clientes hostiles congelen o teletransporten a las entidades.
```luau
--!strict
local function secureNpcNetworkOwnership(npcModel: Model)
    local primary = npcModel.PrimaryPart
    if primary and not primary.Anchored then
        primary:SetNetworkOwner(nil)
    end

    for _, descendant in ipairs(npcModel:GetDescendants()) do
        if descendant:IsA("BasePart") and not descendant.Anchored then
            descendant:SetNetworkOwner(nil)
        end
    end
end
```

### 294. `ai-performance-lod-throttling`
- **Regla:** Regular la frecuencia de actualización de la FSM según la proximidad del jugador más cercano para ahorrar tiempo de cómputo en el servidor:
  - $< 60$ studs: 10 Hz (cada 0.1s).
  - $60 - 150$ studs: 2 Hz (cada 0.5s).
  - $> 150$ studs: 0.5 Hz (cada 2.0s) o suspensión de IA.
```luau
--!strict
local function calculateLODInterval(npcPosition: Vector3, nearestPlayerDistance: number): number
    if nearestPlayerDistance < 60 then
        return 0.1
    elseif nearestPlayerDistance < 150 then
        return 0.5
    else
        return 2.0
    end
end
```

### 295. `ai-npc-death-cleanup-lifecycle`
- **Regla:** Al morir el NPC (`humanoid.Died`), desconectar de inmediato todos los bucles de IA y conexiones, desactivar colisiones (`CanCollide = false`) y programar la eliminación del modelo tras una pausa de desvanecimiento visual.
```luau
--!strict
local function handleNpcDeath(npcModel: Model, humanoid: Humanoid, cleanupDelay: number)
    humanoid.Died:Once(function()
        for _, part in ipairs(npcModel:GetDescendants()) do
            if part:IsA("BasePart") then
                part.CanCollide = false
            end
        end

        task.delay(cleanupDelay, function()
            if npcModel.Parent then
                npcModel:Destroy()
            end
        end)
    end)
end
```

---

## Reglas Inviolables

1. **Network Ownership en Servidor (`SetNetworkOwner(nil)`):** Todo NPC móvil DEBE tener sus partes físicas ancladas a simulación exclusiva del servidor. Jamás delegar simulación física de IA a clientes.
2. **Cómputo Protegido y Rate Limiting:** `path:ComputeAsync()` debe invocarse siempre dentro de `pcall` y con un intervalo mínimo de 0.2 segundos entre solicitudes para no saturar el hilo de navegación de Roblox.
3. **Verificación de Daño Autoritativa:** El daño infligido por o hacia el NPC debe verificarse en el servidor comprobando distancias euclidianas y líneas de visión físicas.
4. **Timeouts en Waypoints:** Toda espera de `humanoid.MoveToFinished` DEBE contar con un temporizador de escape para evitar que el NPC quede bloqueado indefinidamente ante obstáculos no registrados.
5. **Aislamiento Sensorial:** Las percepciones de raycast sensoriales deben excluir al propio modelo del NPC para prevenir auto-obstrucción.
