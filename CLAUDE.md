# RAASE 2.0 / robloxIA — Reglas de Ingeniería para Agentes CLI

## Identidad y Alcance
Este proyecto implementa el sistema **RAASE 2.0 (robloxIA)**: una arquitectura autónoma para Roblox Studio basada en agentes de IA, sincronización de código con Rojo, manipulación de escena vía plugin RPC local (`127.0.0.1:34873`) y auditoría estética mediante visión computacional.

## Reglas Obligatorias de Luau 2026
1. Todo script Luau (`.luau`) DEBE comenzar con `--!strict`.
2. Prohibido el uso de `any` descontrolado. Usar tipos estrictos (`export type ...`).
3. Acceso canónico a servicios exclusivamente mediante `game:GetService("NombreServicio")`.
4. Comparaciones explícitas de nulidad (`valor == nil`).
5. Prohibidas las funciones obsoletas `spawn()`, `delay()` y `wait()`. Usar exclusivamente la biblioteca nativa `task`.
6. Formato de código: StyLua (tabulaciones físicas, límite de 100 caracteres por línea).

## Seguridad Zero-Trust
- El cliente es considerado comprometido y hostil.
- El servidor tiene autoridad absoluta sobre vida, daño, inventario, precios y distancias espaciales.
- Todo `RemoteEvent` debe validar tipos con `typeof()`, distancia euclidiana (`.Magnitude <= 15`) y pasar por un limitador de tasa *Token Bucket*.
- Desplegar remotos señuelo (*honeypots*) para expulsar automáticamente clientes que usen *RemoteSpy*.

## Ciclo de Vida y Memoria (Janitor)
- Todo componente que escuche señales o instancie partes debe implementar el patrón `Janitor`.
- Desconectar obligatoriamente todo `RBXScriptConnection` al morir el personaje o destruirse la entidad.
- Las instancias eliminadas deben desecharse formalmente con `:Destroy()`.

## Cinemática y Rigs
- En animaciones procedimentales (apuntado, giros de cabeza), manipular EXCLUSIVAMENTE `Motor6D.Transform` en hilos de render (`RenderStepped`).
- Prohibido terminantemente modificar `C0` o `C1` en bucles en tiempo de ejecución.

## DevEx 2026
- `MarketplaceService.ProcessReceipt` debe ser idempotente, guardando el `PurchaseId` en DataStore mediante `UpdateAsync()` antes de otorgar beneficios.
- Si la base de datos falla, retornar siempre `Enum.ProductPurchaseDecision.NotProcessedYet`.
- Configurar el juego exclusivamente con avatares R15 para calificar a la tasa preferencial U.S. 18+ ($0.0054 por Robux).

## Estructura del Repositorio
- `bridge/`: Servidor HTTP local (puerto `34873`) y capturador de viewport en el host.
- `plugin/`: Companion Plugin para Roblox Studio (gestión con `ChangeHistoryService`).
- `project_template/`: Estructura estándar de juego en Luau gestionada con Rojo.
- `agent/`: Catálogo JSON de 235 skills RAASE, CLI de orquestación y prompts de sistema.
- `docs/`: Especificación formal RAASE 2.0.
