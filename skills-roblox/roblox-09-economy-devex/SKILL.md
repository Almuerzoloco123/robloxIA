---
name: roblox-09-economy-devex
description: "Cubre monetización y DevEx 2026 (skills 211-225): ProcessReceipt idempotente con persistencia previa del PurchaseId, tasa preferencial U.S. 18+ ($0.0054/R), avatares R15, gamepasses y compliance de compras. Úsala al implementar Developer Products, Gamepasses, validar recibos o planificar cash-out por DevEx."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Economy & DevEx 2026"
  range: "211-225"
  author: "RAASE 2.0 / robloxIA"
---

# roblox-09-economy-devex — Economía, Monetización y DevEx 2026 (Skills 211 - 225)

Este módulo rige las políticas de monetización y diseño económico auditadas bajo el programa Roblox Developer Exchange (DevEx 2026).

## Marco de Tasas DevEx 2026
- **Tasa Estándar 2026:** $0.0038 USD por Robux (umbral mínimo de retiro: 30.000 R$ = $114.00 USD).
- **Tasa Preferencial U.S. 18+:** $0.0054 USD por Robux (30.000 R$ = $162.00 USD). Requiere avatares estrictamente en formato R15 y verificación de identidad.
- **Tasa Legada:** $0.0035 USD por Robux para balances generados antes de septiembre de 2025.

## Catálogo de Habilidades Técnicas

### 211. `economy-gamepass-service-wrapper`
- **Regla:** Consultar propiedad de gamepasses en el servidor mediante `MarketplaceService:UserOwnsGamePassAsync()` cacheando resultados para no saturar la API.

### 212. `economy-dev-product-process-receipt`
- **Regla:** Implementación OBLIGATORIA y exclusiva del callback `MarketplaceService.ProcessReceipt` en el servidor.

### 213. `economy-receipt-purchase-id-dedup`
- **Regla:** Registrar de forma transaccional el `PurchaseId` en DataStore mediante `UpdateAsync()` antes de otorgar beneficios (*Idempotencia*). Si el `PurchaseId` ya existe, retornar de inmediato `Enum.ProductPurchaseDecision.PurchaseGranted`.

### 214. `economy-not-processed-failover`
- **Regla:** Si la persistencia en base de datos falla o el jugador no está conectado, retornar SIEMPRE `Enum.ProductPurchaseDecision.NotProcessedYet`.

### 215. `economy-prompt-purchase-cooldown`
- **Regla:** Limitar la frecuencia con la que se disparan prompts de compra al usuario para prevenir spam y compras involuntarias.

### 216. `economy-devex-rate-standard-tier`
- **Regla:** Modelar pronósticos de ingresos calculando a la tasa estándar de $0.0038 USD por Robux para creadores generales.

### 217. `economy-devex-rate-legacy-tier`
- **Regla:** Manejar contabilidad retrocompatible para Robux históricos calculados a $0.0035 USD por Robux.

### 218. `economy-devex-us-18-plus-qualifier`
- **Regla:** Auditar y certificar que la experiencia califique para la tasa preferencial U.S. 18+ de $0.0054 USD por Robux cumpliendo los requisitos de identidad y formato de juego.

### 219. `economy-r15-strict-avatar-enforcement`
- **Regla:** Excluir avatares R6 legados e imponer personajes R15 modernos en `StarterPlayer.GameSettings` para calificar a la tasa preferencial U.S. 18+ ($0.0054/R).

### 220. `economy-devex-threshold-audit`
- **Regla:** Verificar que la cuenta de desarrollo supere el umbral mínimo oficial de 30.000 Robux ganados legítimamente antes de solicitar DevEx.

### 221. `economy-lootbox-probability-disclosure`
- **Regla:** En mecánicas de recompensas aleatorias o cajas de botín, mostrar de forma obligatoria y pública en la UI los porcentajes de probabilidad exactos antes de comprar.
- **Cumplimiento Anti-Apuestas:** Prohibido implementar mecánicas de casino o apuestas con ganancia/pérdida de moneda de pago (cross-reference: consultar directivas completas en [roblox-20-moderation-compliance](../roblox-20-moderation-compliance/SKILL.md) para políticas de contenido maduro y ToS).

### 222. `economy-premium-payouts-design`
- **Regla:** Diseñar ciclos de engagement y retención para maximizar el tiempo de juego de suscriptores Roblox Premium (Premium Payouts).

### 223. `economy-in-game-shop-layout`
- **Regla:** Organizar tiendas en el juego con categorías claras, precios visibles y confirmaciones de compra seguras.
- **Balance de Moneda:** Para el equilibrio matemático de fuentes (*faucets*) y sumideros (*sinks*), ver análisis de economía en [roblox-17-analytics-liveops](../roblox-17-analytics-liveops/SKILL.md) (`analytics-economy-sink-source-tracking`).

### 224. `economy-cross-sell-teleport-portal`
- **Regla:** Implementar portales de teletransporte a otras experiencias del mismo creador o universo para tracción cruzada de usuarios.

### 225. `economy-ugc-limiteds-resale-hub`
- **Regla:** Gestionar compra y venta de ítems UGC Limited dentro de la experiencia respetando tarifas de creador y comisiones oficiales.
