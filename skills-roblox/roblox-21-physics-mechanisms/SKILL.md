---
name: roblox-21-physics-mechanisms
description: "Rige la física moderna, constraints y mecanismos mecánicos articulados (skills 386-400) en Roblox 2026: PrismaticConstraint, HingeConstraint, BallSocketConstraint, CylindricalConstraint, resortes (Springs), varillas (Rods), CollisionGroups modernos y NoCollisionConstraint. Úsala al construir ensambles mecánicos móviles, puertas, ascensores, vehículos, suspensiones, ragdolls o al gestionar colisiones físicas sin recurrir a soldaduras obsoletas ni cálculos fuera del solver PGS."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Physics, Constraints & Mechanisms"
  range: "386-400"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-21-physics-mechanisms — Física, Constraints y Mecanismos (Skills 386 - 400)

Este módulo establece los estándares de ingeniería para la simulación física en Roblox Studio bajo el solver PGS (Projected Gauss-Seidel). Regula el diseño de mecanismos cinemáticos y dinámicos mediante Constraints modernas, resortes amortiguados, matrices de colisión sin solapamiento y la erradicación definitiva de soldaduras rígidas legadas.

## Catálogo de Habilidades Técnicas

### 386. `physics-prismatic-slider-mechanisms`
- **Regla:** Para mecanismos de traslación lineal (ascensores, compuertas, pistones corredizos), emplear exclusivamente `PrismaticConstraint` alineado entre dos `Attachment`.
- **Estándar:** Definir límites mecánicos estrictos (`LimitsEnabled = true`) y accionar mediante `ActuatorType.Servo` para posiciones exactas o `ActuatorType.Motor` para velocidad constante.
- **Ejemplo:**
  ```luau
  --!strict
  local function createElevatorSlider(railAttachment: Attachment, carAttachment: Attachment): PrismaticConstraint
      local slider = Instance.new("PrismaticConstraint")
      slider.Name = "ElevatorSlider"
      slider.Attachment0 = railAttachment
      slider.Attachment1 = carAttachment
      slider.ActuatorType = Enum.ActuatorType.Servo
      slider.ServoMaxForce = 50000
      slider.Speed = 12
      slider.LimitsEnabled = true
      slider.LowerLimit = 0
      slider.UpperLimit = 85
      slider.Parent = railAttachment.Parent
      return slider
  end
  ```

### 387. `physics-hinge-motor-servo`
- **Regla:** Puertas giratorias, ruedas vehiculares y hélices deben usar `HingeConstraint`.
- **Estándar:** Si la rotación es finita (puerta con bisagra), usar `ActuatorType.Servo` con `Restitution = 0` para evitar oscilaciones parásitas. Para hélices o ruedas, usar `ActuatorType.Motor` con `MotorMaxTorque` calibrado a la masa del ensamble.
- **Ejemplo:**
  ```luau
  --!strict
  local function configureDoorHinge(hinge: HingeConstraint, targetAngleDegrees: number)
      hinge.ActuatorType = Enum.ActuatorType.Servo
      hinge.LimitsEnabled = true
      hinge.LowerLimit = -90
      hinge.UpperLimit = 90
      hinge.ServoMaxForce = 15000
      hinge.AngularSpeed = math.rad(90)
      hinge.TargetAngle = targetAngleDegrees
  end
  ```

### 388. `physics-ball-socket-ragdoll`
- **Regla:** Las articulaciones multiaxiales de ragdolls o péndulos deben construirse con `BallSocketConstraint`.
- **Estándar:** Activar `LimitsEnabled = true` y `TwistLimitsEnabled = true` para delimitar los ángulos cono (`UpperAngle`) y torsión (`TwistUpperAngle`, `TwistLowerAngle`), evitando deformaciones anatómicas irreales.
- **Ejemplo:**
  ```luau
  --!strict
  local function setupRagdollJoint(parentPart: BasePart, childPart: BasePart, cframeOffset: CFrame): BallSocketConstraint
      local att0 = Instance.new("Attachment")
      att0.CFrame = cframeOffset
      att0.Parent = parentPart

      local att1 = Instance.new("Attachment")
      att1.CFrame = CFrame.identity
      att1.Parent = childPart

      local socket = Instance.new("BallSocketConstraint")
      socket.Attachment0 = att0
      socket.Attachment1 = att1
      socket.LimitsEnabled = true
      socket.UpperAngle = 45
      socket.TwistLimitsEnabled = true
      socket.TwistLowerAngle = -20
      socket.TwistUpperAngle = 20
      socket.Parent = parentPart
      return socket
  end
  ```

### 389. `physics-cylindrical-piston`
- **Regla:** Mecanismos que requieren traslación y rotación simultáneas sobre un mismo eje (amortiguadores con giro libre, brocas) deben utilizar `CylindricalConstraint`.
- **Estándar:** No combinar un `PrismaticConstraint` y un `HingeConstraint` en paralelo sobre el mismo eje; esto satura los grados de libertad del solver generando inestabilidad numérica.

### 390. `physics-spring-suspension-tuning`
- **Regla:** Todo sistema de amortiguación o suspensión debe calibrar `SpringConstraint` mediante formulación crítica o subcrítica para evitar resonancia infinita.
- **Estándar:** Establecer `Stiffness` proporcional al peso soportado y `Damping` calculado según $c = 2 \zeta \sqrt{k \cdot m}$ con $\zeta \in [0.7, 1.2]$ (amortiguamiento crítico o ligeramente sobreamortiguado).
- **Ejemplo:**
  ```luau
  --!strict
  local function configureSuspensionSpring(spring: SpringConstraint, massKg: number, stiffness: number)
      spring.Stiffness = stiffness
      -- Coeficiente de amortiguamiento crítico (zeta = 0.85 para confort vehicular)
      spring.Damping = 2 * 0.85 * math.sqrt(stiffness * massKg)
      spring.FreeLength = 4.0
      spring.LimitsEnabled = true
      spring.MinLength = 1.5
      spring.MaxLength = 5.5
  end
  ```

### 391. `physics-rod-linkage-kinematics`
- **Regla:** Para mantener distancias geométricas invariantes entre dos cuerpos móviles en mecanismos de barras articuladas (paralelogramos deformables, puentes levadizos dobles), usar `RodConstraint`.
- **Estándar:** Definir `Length` idéntico a la distancia inicial calculada entre `Attachment0.WorldPosition` y `Attachment1.WorldPosition` para evitar tirones instantáneos en el primer fotograma.

### 392. `physics-modern-collision-groups`
- **Regla:** Prohibido el uso de APIs legadas de colisiones (`SetPartCollisionGroup`, máscaras de bits). Emplear las APIs modernas de `PhysicsService`.
- **Estándar:** Registrar grupos con `PhysicsService:RegisterCollisionGroup(name)`, definir relaciones con `PhysicsService:CollisionGroupSetCollidable(g1, g2, canCollide)` y asignar partes mediante la propiedad `BasePart.CollisionGroup`.
- **Ejemplo:**
  ```luau
  --!strict
  local PhysicsService = game:GetService("PhysicsService")

  local function initCollisionArchitecture()
      PhysicsService:RegisterCollisionGroup("Characters")
      PhysicsService:RegisterCollisionGroup("Debris")
      PhysicsService:RegisterCollisionGroup("Projectiles")

      -- Los proyectiles chocan con personajes pero los escombros no
      PhysicsService:CollisionGroupSetCollidable("Characters", "Debris", false)
      PhysicsService:CollisionGroupSetCollidable("Characters", "Characters", false)
      PhysicsService:CollisionGroupSetCollidable("Projectiles", "Characters", true)
  end
  ```

### 393. `physics-no-collision-constraint`
- **Regla:** Cuando dos piezas físicas conectadas por un mecanismo rozan entre sí y no deben chocar, utilizar `NoCollisionConstraint` entre el par específico.
- **Prohibido:** Crear un `CollisionGroup` nuevo únicamente para resolver la colisión entre dos partes de un único vehículo o ensamble.

### 394. `physics-custom-physical-properties`
- **Regla:** No alterar la fricción o restitución modificando materiales visuales. Configurar explícitamente `CustomPhysicalProperties`.
- **Estándar:** Para superficies resbaladizas (hielo), usar fricción $< 0.1$ y peso de fricción alto ($100$). Para neumáticos de alta tracción, usar fricción $> 1.5$.
- **Ejemplo:**
  ```luau
  --!strict
  local function setWheelTraction(wheel: BasePart, highTraction: boolean)
      wheel.CustomPhysicalProperties = if highTraction then
          PhysicalProperties.new(
              1.2, -- Density
              1.8, -- Friction (alta tracción)
              0.1, -- Elasticity
              100, -- FrictionWeight
              1    -- ElasticityWeight
          )
      else
          PhysicalProperties.new(0.8, 0.4, 0.2, 1, 1)
  end
  ```

### 395. `physics-network-ownership-arbitration`
- **Regla:** Todo ensamble físico gobernado por un jugador (vehículos terrestres, monturas, objetos transportables) debe tener su propiedad de red asignada explícitamente con `SetNetworkOwner(player)`.
- **Estándar:** En piezas que interactúan en el entorno global (proyectiles, puertas automáticas), asignar `SetNetworkOwner(nil)` (servidor) para erradicar el parpadeo de simulación (*physics stutter*) y prevenir manipulación de posición por clientes modificados.

### 396. `physics-assembly-linear-angular-velocity`
- **Regla:** Desterrar el uso de instancias legadas `BodyVelocity`, `BodyAngularVelocity` y `BodyThrust`.
- **Estándar:** Para impulsos instantáneos, aplicar directamente `AssemblyLinearVelocity` o `ApplyImpulse(impulse: Vector3)`. Para torques instantáneos, usar `ApplyAngularImpulse(torque: Vector3)`.
- **Ejemplo:**
  ```luau
  --!strict
  local function launchProjectile(rootPart: BasePart, direction: Vector3, speedStudsPerSec: number)
      local impulse = direction.Unit * (speedStudsPerSec * rootPart.AssemblyMass)
      rootPart:ApplyImpulse(impulse)
  end
  ```

### 397. `physics-vector-force-modern-propulsion`
- **Regla:** Para fuerzas continuas y propulsores espaciales o cohetes, utilizar `VectorForce`, `AlignPosition` y `AlignOrientation`.
- **Estándar:** Asociar `VectorForce` a un `Attachment`, configurando `RelativeTo = Enum.ActuatorRelativeTo.Attachment0` si la fuerza viaja con la orientación del cuerpo o `World` para gravedad artificial.

### 398. `physics-weld-constraint-dynamic-rigging`
- **Regla:** Para uniones rígidas entre partes que no requieren articulación cinemática, emplear exclusivamente `WeldConstraint`.
- **Prohibido:** Crear instancias legadas `Weld`, `ManualWeld` o depender de superficies pegajosas tipo `SurfaceType.Glue` o `SurfaceType.Weld`.

### 399. `physics-continuous-collision-ccd`
- **Regla:** Para proyectiles balísticos u objetos que se desplazan a más de 120 studs/s, complementar el solver PGS con barridos de raycast continuo (`WorldRoot:Raycast` o `WorldRoot:Shapecast`).
- **Propósito:** Erradicar el fenómeno de tunelización cuántica (*tunneling*), donde un objeto veloz atraviesa paredes en un solo fotograma sin disparar eventos de colisión.

### 400. `physics-sleeping-assembly-optimization`
- **Regla:** Todo mecanismo en reposo debe estabilizarse para permitir que el solver PGS ponga el ensamble en estado *Sleeping* (ahorrando ciclos de CPU).
- **Estándar:** Evitar aplicar micro-fuerzas constantes (`VectorForce` con valores residuales) en objetos estacionarios. Verificar que `part.AssemblyLinearVelocity.Magnitude < 0.05` antes de apagar actuadores de corrección.

## Reglas Inviolables

1. **Nunca usar instancias `BodyMover` legadas:** Quedan terminantemente prohibidos `BodyPosition`, `BodyGyro`, `BodyVelocity`, `BodyThrust`, `BodyAngularVelocity` y `RocketPropulsion`. Utilizar únicamente Constraints (`AlignPosition`, `AlignOrientation`, `LinearVelocity`, `AngularVelocity`, `VectorForce`).
2. **Nunca alterar `C0` o `C1` en tiempo de ejecución:** Las conexiones mecánicas en movimiento deben utilizar `Attachment.CFrame` o propiedades de las Constraints (`TargetAngle`, `TargetPosition`).
3. **No usar `CollisionGroups` para exclusiones locales:** Cuando dos piezas concretas deban ignorar colisión entre sí, usar siempre `NoCollisionConstraint`.
4. **Propiedad de red explícita en ensambles clave:** Todo objeto físico interactivo debe tener su propiedad de red asignada conscientemente (`SetNetworkOwner(player)` o `SetNetworkOwner(nil)`). Nunca dejarla en asignación automática en objetos con alta repercusión competitiva.
5. **Prohibido soldar ensambles con `Weld` obsoletos:** Usar exclusivamente `WeldConstraint`. Nunca crear `Weld` que requieran cálculo manual de offsets invertidos para rigs rígidos no cinemáticos.
