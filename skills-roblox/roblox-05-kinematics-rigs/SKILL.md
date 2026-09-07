---
name: roblox-05-kinematics-rigs
description: "Skills 116-140: Cinemática Procedural, Motor6D.Transform, IKControl, Rigging R15, Resortes de Arma y Ragdoll."
license: MIT
metadata:
  domain: "Rigging & Kinematics"
  range: "116-140"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-05-kinematics-rigs — Cinemática, Rigging y Animación Procedural (Skills 116 - 140)

Este módulo rige la manipulación biomecánica y cinemática de personajes sin comprometer el rendimiento del motor.

## Regla de Oro: Inmutabilidad de C0/C1
Modificar `JointInstance.C0` o `C1` en bucles de tiempo de ejecución (`RenderStepped`) fuerza la reconstrucción continua del grafo físico del motor, provocando caídas críticas de FPS. **Toda cinemática procedural debe manipular EXCLUSIVAMENTE `Motor6D.Transform`**.

## Catálogo de Habilidades Técnicas

### 116. `anim-motor6d-transform-procedural`
- **Regla:** Manipular `Motor6D.Transform` en el hilo de render local para apuntar la cabeza, torso o brazos hacia la cámara o el cursor del ratón.

### 117. `anim-c0-c1-immutability-rule`
- **Regla:** Prohibido alterar `C0` o `C1` en tiempo de ejecución. Dichas propiedades solo deben definirse al ensamblar el rig.

### 118. `anim-renderstepped-torso-aim`
- **Regla:** Cálculo suave de inclinación (*pitch*) y orientación (*yaw*) con amortiguamiento armónico:
  ```lua
  RunService.RenderStepped:Connect(function(dt)
      local lookDirection = camera.CFrame.LookVector
      local pitch = math.asin(lookDirection.Y)
      waist.Transform = waist.Transform * CFrame.Angles(pitch * 0.5, 0, 0)
  end)
  ```

### 119. `anim-bone-mesh-skinning-limits`
- **Regla:** Modelos con esqueletos deformables deben tener escala unitaria (1,1,1) y un límite estricto de máximo 4 huesos por vértice.

### 120. `anim-blending-weight-transition`
- **Regla:** Transiciones suaves entre estados de animación utilizando `AnimationTrack:AdjustWeight()` con cross-fade.

### 121. `anim-ragdoll-physics-transition`
- **Regla:** Transición instantánea a muñeco de trapo al morir: desactivar `Motor6D` y activar `BallSocketConstraints` preconfiguradas.

### 122. `anim-spring-weapon-sway`
- **Regla:** Simulación de peso y vaivén de armas en primera persona mediante ecuaciones diferenciales de resortes elásticos amortiguados.

### 123. `anim-ik-control-constraint-use`
- **Regla:** Emplear la clase nativa `IKControl` para sujeción precisa de armas en dos manos y ajuste de pies a desniveles del terreno (*Foot IK*).
