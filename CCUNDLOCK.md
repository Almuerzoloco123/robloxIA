# 📜 CCUNDLOCK: Registro Histórico y Memoria Completa del Proyecto

**Proyecto**: EXPERIMENTO ROBLOX IA — Lobby Mágico Medieval Inspirado en Harry Potter  
**Entorno**: Roblox Studio + RAASE 2.1 Bridge (`127.0.0.1:34873`) + Rojo Daemon (`127.0.0.1:34872`)  
**Fecha de Actualización**: Septiembre 2026  

---

## 1. Cronología de Peticiones del Usuario

1. **Petición Inicial**:
   > *"haz un lobby de un juego de magia inspirado en harry potter, este tiene que tener una ambientacion del tema (particulas magicas, castillos, un bosque, antorchas) todo un estilo mediebal con 5 secciones importantes, la primera y la principal es donde se entra a las partidas, una zona de crates donde se podrab abrir las llaves que se obtengan jugando, una zona donde se podran comprar posciones, una zona especial para probar poderes nuevos donde estaran unos maniquis y por ultimo una zona donde se podran mejorar o reparar almaduras y anillos, donde estara un pequeño enano elfo. trata de ser lo mas detallista posible y no te abstengas de agregar algo que quede con la tematica, ambeintaliza bien con casas y las luces que sean solo antorchas o fogatas, todo muy natural pero que no sea oscuro, lo opuesto que este claro"*
   - **Resultado V1**: Implementación de 5 kioscos/pabellones con lógica interactiva Luau y prompts.

2. **Segunda Petición**:
   > *"genera un ccundlock en .md de toda la conversacion que acabamos de tener"*
   - Generación del documento histórico y memoria de trabajo.

3. **Tercera Petición**:
   > *"elimina todo el mapa, volvamos a empezar"*
   - Vaciado de workspace y reseteo de la escena.

4. **Cuarta Petición**:
   - Reiteración de los requisitos temáticos del lobby.

5. **Quinta Petición (Directriz Clave)**:
   > *"borralo y reimaginalo completamente, no copies lo que hiciste anteriormente"*
   - **Diagnóstico del Fallo Previo**: El modelo anterior colocaba pabellones aislados sobre un césped plano, pareciendo un mapa de pruebas genérico sin la densidad ni la personalidad de Harry Potter.
   - **Reimaginación Radical (V3)**: Se abandonan los kioscos dispersos. Se crea una **ciudadela medieval unificada y densa (The Arcane High Street & Castle Gate)** inspirada en el claustro gótico de Hogwarts y los callejones comerciales de Diagon Alley / Hogsmeade.

---

## 2. Arquitectura de la Reimaginación V3 ("The Arcane Citadel")

### Organización Espacial Urbana
- **Suelo Continuo**: Pavimentación integral en adoquines (`Cobblestone`) y paseos de pizarra (`Slate`), eliminando el césped vacío entre tiendas.
- **Plaza Central**: Gran hoguera comunal con leña, ascuas ardientes, humo y bancos de piedra para magos.
- **Bosque Perimetral**: Anillo verde denso que rodea las murallas con más de 20 pinos escalonados, robles y peñascos con musgo.

### Las 5 Secciones Reconstruidas
1. **Zona 1 (Norte) — Gran Puerta del Castillo & Portal de Partidas**:
   - Dos torres bastión góticas de 38 studs de altura con aspilleras, matacanes, almenas y chapiteles cónicos de pizarra azul rematados en agujas de oro.
   - Estandartes heráldicos de Gryffindor (carmesí y oro) y Slytherin (esmeralda y plata).
   - Arco monumental con rastrillo alzado de hierro forjado.
   - Vórtice Celestial de partículas estelares azules y cian con base rúnica.
   - `ProximityPrompt`: "Entrar en Cola".

2. **Zona 2 (Este) — Bóveda Arcana de Crates & Llaves (Gringotts)**:
   - Fachada clásica de mármol con 4 columnas estriadas, entablamento triangular y puerta acorazada de acero oscuro con timón de bronce.
   - 3 Pedestales con cofres medievales (Roble Antiguo, Hierro Rúnico y Reliquia Real Dorada).
   - Llaves mágicas 3D levitando y girando sobre cada cofre con auras de chispas.
   - `ProximityPrompt` para abrir cada tier con su respectiva llave.

3. **Zona 3 (Oeste) — Boticario Tudor "El Caldero Mágico"**:
   - Edificio de 2 plantas con entramado de madera oscura (*half-timbering*), revoco blanco, voladizo (*jettying*), mirador acristalado y chimenea con humo.
   - Porche delantero con un **gran caldero de hierro fundido** sobre ascuas con brebaje esmeralda translúcido, burbujas de vidrio y columnas de vapor.
   - Estantería exterior con 12 viales de cristal de colores vivos (Salud, Maná, Celeridad, Invisibilidad).
   - `ProximityPrompt`: Elaboración de pócimas y compra de elixires.

4. **Zona 4 (Sureste) — Arena Circular de Duelos & Maniquís**:
   - Foso de combate circular con balustrada de piedra, pebeteros de fuego sobre pilares de esquina y base de basalto oscuro con estrella rúnica inscrita.
   - 3 Maniquís vestidos con túnicas y sombreros puntiagudos de mago (Aprendiz Nv. 1, Batalla Nv. 25, Archimago Nv. 60).
   - Barras de vida flotantes (`BillboardGui`) y números de daño flotantes.

5. **Zona 5 (Suroeste) — Forja Arcana del Enano Elfo**:
   - Taller bajo arcada de piedra adosada a la muralla.
   - Fragua con brasas al rojo vivo, campana de cobre piramidal con bandas de hierro forjado y chimenea.
   - Yunque sobre tocón de roble milenario y cuba de templado con vapor.
   - Soporte de armadura con peto reluciente y yelmo de caballero.
   - Mesa de lapidario con tapete de terciopelo granate y 3 anillos mágicos (Rubí Ardiente, Zafiro Abisal, Esmeralda de Vida).
   - **PNJ Enano Elfo ("Thistlebeard")**: Modelo 3D compacto (3.4 studs), orejas puntiagudas, barba trenzada, delantal de cuero y martillo.

---

## 3. Iluminación y Visibilidad

- **Instrucción Estricta**: Sin lámparas modernas ni farolas eléctricas; luces exclusivamente de antorchas, pebeteros y fogatas.
- **Clara y Diurna**: La escena **NO es oscura**. Se configuró a las 15:40 (`ClockTime = 15.8`, `Brightness = 2.8`, `OutdoorAmbient` cálido y equilibrado).
- **Sombras Dinámicas**: Todas las antorchas y pebeteros cuentan con `PointLight.Shadows = true` para crear un juego de sombras rico y natural.
- **Control de Bloom**: `BloomEffect` balanceado (`Intensity = 0.12`, `Threshold = 2.2`) para evitar sobreexposiciones o brillos blancos cegadores.

---

## 4. Archivos Clave del Repositorio

- `agent/generators/build_magic_lobby.mjs`: Script procedural V3 que construye los 505 elementos de la ciudadela.
- `agent/generators/attach_prompts_and_guis.mjs`: Vincula los 12 `ProximityPrompt` y `BillboardGui` a las zonas interactivas.
- `agent/generators/capture_tour.mjs`: Sistema de recorrido fotográfico automatizado en 7 perspectivas.
- `project_template/src/server/LobbyInteractionService.luau`: Lógica de juego del servidor en Luau estricto 2026.
- `bridge/server.mjs` & `bridge/screen_capture.py`: Puente RAASE 2.1 y capturador de ventana de Roblox Studio.
- `walkthrough.md`: Galería visual completa y documentación interactiva.
