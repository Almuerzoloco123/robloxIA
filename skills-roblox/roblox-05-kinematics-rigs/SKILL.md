---
name: roblox-05-kinematics-rigs
description: "Rige la cinemática, animación y rigs de personajes en Roblox (skills 116-140): procedural Motor6D, IKControl nativo, ragdolls físicos, capas de animación y amortiguación por resortes. Úsala al controladores de personajes, deformación de mallas o sincronización de animaciones."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Rigging & Kinematics"
  range: "116-140"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-05-kinematics-rigs — Cinemática, Rigs y Animación de Personajes (Skills 116 - 140)

Este módulo rige el ensamblaje de esqueletos, cinemática procedural y sistemas de animación para avatares y criaturas en 2026.

## Principios Fundamentales
- **Inmutabilidad de C0/C1:** Las propiedades `C0` y `C1` son estáticas; las mutaciones procedurales se aplican a `Transform`.
- **IKControl Nativo:** Utilización de la clase `IKControl` del motor para resolución cinemática de alta eficiencia.
- **Sincronización de Eventos:** Asociación de efectos de audio y partículas mediante marcadores de animación (`GetMarkerReachedSignal`).

## Catálogo de Habilidades Técnicas

### 116. `anim-motor6d-transform-procedural`
- **Regla:** Modificar Motor6D.Transform exclusivamente en RunService.PreSimulation o RunService.PreRender para cinemática procedural sin alterar C0/C1.

### 117. `anim-c0-c1-immutability-rule`
- **Regla:** Mantener inmutables C0 y C1 de las uniones articulares durante el juego para preservar el offset de calibración del rig original.

### 118. `anim-renderstepped-torso-aim`
- **Regla:** Calcular y aplicar rotaciones de apunte del torso o cabeza hacia el punto de mira de la cámara en el ciclo de renderizado.

### 119. `anim-bone-mesh-skinning-limits`
- **Regla:** Respetar los límites máximos de influencias por vértice (4 huesos) en mallas deformables de personajes.

### 120. `anim-blending-weight-transition`
- **Regla:** Utilizar Animator:Play() con FadeTime adecuado y pesos ponderados para transiciones suaves entre animaciones concurrentes.

### 121. `anim-marker-reached-event-sync`
- **Regla:** Escuchar GetMarkerReachedSignal() en AnimationTracks para sincronizar sonidos de pasos, efectos visuales y puntos de impacto de armas.

### 122. `anim-ragdoll-physics-transition`
- **Regla:** Deshabilitar estados de Humanoid y convertir Motor6D en BallSocketConstraints con límites angulares al entrar en modo ragdoll.

### 123. `anim-root-motion-replication`
- **Regla:** Sincronizar el movimiento físico de la raíz impulsado por animaciones evitando desajustes de posición entre cliente y servidor.

### 124. `anim-procedural-foot-ik`
- **Regla:** Implementar cinemática inversa en pies mediante raycasting hacia el suelo para adaptar las extremidades a desniveles del terreno.

### 125. `anim-humanoid-state-machine`
- **Regla:** Gestionar transiciones de estados de Humanoid (Running, Jumping, Freefall, Landed) mediante máquinas de estados finitas limpias.

### 126. `anim-spring-weapon-sway`
- **Regla:** Aplicar resortes matemáticos oscilatorios a la vista del arma en primera persona para simular inercia y peso de movimiento.

### 127. `anim-camera-recoil-shake`
- **Regla:** Implementar retroceso procedimental y sacudidas de cámara suaves amortiguadas por funciones de resorte.

### 128. `anim-facial-animation-curves`
- **Regla:** Controlar canales de animación facial en avatares R15 mediante curvas y perfiles FACS estándar.

### 129. `anim-custom-rig-assembly`
- **Regla:** Construir rigs personalizados conectando partes físicas con uniones Motor6D estructuradas y RootPart asignada.

### 130. `anim-procedural-climbing-ik`
- **Regla:** Ajustar la posición de manos y pies proceduralmente mediante IK al escalar salientes y escaleras.

### 131. `anim-priority-layer-stacking`
- **Regla:** Asignar AnimationPriority correcta (Core, Idle, Movement, Action, Action4) para superponer capas sin interferencias indebidas.

### 132. `anim-speed-multiplier-sync`
- **Regla:** Ajustar AnimationTrack:AdjustSpeed() en función de la velocidad real del personaje para evitar deslizamientos de pies sobre el suelo.

### 133. `anim-ik-control-constraint-use`
- **Regla:** Utilizar IKControl nativo configurando EndEffector, Target y Pole para resolver extremidades y cadenas cinemáticas en tiempo real.

### 134. `anim-hipheight-dynamic-offset`
- **Regla:** Ajustar dinámicamente Humanoid.HipHeight al cambiar la escala del avatar o al agacharse.

### 135. `anim-mesh-deformation-wind`
- **Regla:** Simular efecto de viento o balanceo en vegetación o ropa mediante deformación paramétrica de huesos (Bones).

### 136. `anim-procedural-spine-lean`
- **Regla:** Inclinar proceduralmente la columna vertebral del personaje al girar a alta velocidad o al navegar curvas cerradas.

### 137. `anim-look-at-camera-damping`
- **Regla:** Amortiguar la rotación del cuello para que el avatar mire a puntos de interés con retraso natural e inercia biológica.

### 138. `anim-footstep-event-sync`
- **Regla:** Emitir señales de pisada vinculadas a eventos clave de la animación para reproducir acústica de impacto según el material del suelo.

### 139. `anim-procedural-jump-squash`
- **Regla:** Aplicar deformación procedural de aplastamiento y estiramiento (squash & stretch) al despegar y aterrizar de saltos.

### 140. `anim-procedural-weapon-bobbing`
- **Regla:** Calcular balanceo sinusoidal del arma al caminar basado en la velocidad de desplazamiento del jugador.

---

## 🏃 Anexo: Ciclo de Simulación y Rigs: RunService 2026
En la arquitectura de simulación de Roblox 2026:
- **PreSimulation:** Modificaciones de fuerzas físicas, torques y preparación de datos antes del paso del solucionador físico (`Stepped`).
- **PostSimulation:** Lógica que reacciona a los resultados de colisiones y nueva posición integrada de las partes físicas (`Heartbeat`).
- **PreRender:** Cálculo de cinemática procedural visible y alineación de articulaciones de personajes en el cliente antes de pintar la escena.
