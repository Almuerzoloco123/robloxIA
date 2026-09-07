---
name: roblox-09-economy-devex
description: "Skills 211-225: Monetización DevEx 2026, Idempotencia ProcessReceipt, Tasa Preferencial U.S. 18+ ($0.0054/R), Avatares R15 y Compliance."
license: MIT
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

### 211. `economy-dev-product-process-receipt`
- **Regla:** Implementación OBLIGATORIA de la callback `MarketplaceService.ProcessReceipt`.

### 212. `economy-receipt-purchase-id-dedup`
- **Regla:** Registrar de forma transaccional el `PurchaseId` en DataStore mediante `UpdateAsync()` antes de otorgar beneficios (*Idempotencia*). Si el `PurchaseId` ya existe, retornar de inmediato `Enum.ProductPurchaseDecision.PurchaseGranted`.

### 213. `economy-not-processed-failover`
- **Regla:** Si la persistencia en base de datos falla o el jugador no está conectado, retornar SIEMPRE `Enum.ProductPurchaseDecision.NotProcessedYet`.

### 214. `economy-r15-strict-avatar-enforcement`
- **Regla:** Excluir avatares R6 legados e imponer personajes R15 modernos en `StarterPlayer.GameSettings` para calificar a la tasa preferencial U.S. 18+ ($0.0054/R).

### 215. `economy-lootbox-probability-disclosure`
- **Regla:** En mecánicas de recompensas aleatorias o cajas de botín, mostrar de forma obligatoria y pública en la UI los porcentajes de probabilidad exactos antes de comprar.

### 216. `economy-sink-and-faucet-balance`
- **Regla:** Equilibrar matemáticamente las fuentes de emisión de moneda (*faucets*) con sumideros de gasto permanente (*sinks*) para evitar hiperinflación en la economía del juego.

### 217. `economy-tos-gambling-ban-compliance`
- **Regla:** Prohibir cualquier mecánica monetizada que permita intercambios de moneda de pago con probabilidades de pérdida neta o apuestas directas, en cumplimiento con los Términos de Servicio de Roblox.
