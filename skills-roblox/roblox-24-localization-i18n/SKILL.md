---
name: roblox-24-localization-i18n
description: "Rige la internacionalización y localización integral (skills 431-445) en Roblox 2026: LocalizationService, gestión de LocalizationTable (embebida y en la nube), parámetros dinámicos con Translator:FormatByKey, pluralización, autolocalización de UI, detección de idioma (RobloxLocaleId) y soporte de texto bidireccional (RTL). Úsala al adaptar interfaces, diálogos, notificaciones del servidor o formatos numéricos y temporales a una audiencia global sin romper la maquetación visual."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Localization & Internationalization (i18n)"
  range: "431-445"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-24-localization-i18n — Localización e Internacionalización (Skills 431 - 445)

Este módulo establece las directrices de ingeniería para la adaptación lingüística y cultural de experiencias en Roblox. Cubre el uso de `LocalizationService`, tablas de traducción embebidas y remotas, formateo de parámetros contextuales, soporte bidireccional (RTL), prevención de desbordamientos de texto y cumplimiento de normativas regionales.

## Catálogo de Habilidades Técnicas

### 431. `i18n-locale-detection-fallback`
- **Regla:** Para detectar el idioma preferido del jugador en el cliente, consultar `LocalizationService.RobloxLocaleId`.
- **Estándar:** Si el locale del usuario no cuenta con traducción completa, implementar un sistema de fallback estructurado hacia el idioma base del proyecto (`en-us` o `es-es`).
- **Ejemplo:**
  ```luau
  --!strict
  local LocalizationService = game:GetService("LocalizationService")

  local DEFAULT_LOCALE = "en-us"
  local SUPPORTED_LOCALES: { [string]: boolean } = {
      ["en-us"] = true,
      ["es-es"] = true,
      ["pt-br"] = true,
      ["ja-jp"] = true,
  }

  local function resolveActiveLocale(): string
      local currentLocale = LocalizationService.RobloxLocaleId:lower()
      if SUPPORTED_LOCALES[currentLocale] then
          return currentLocale
      end

      -- Intentar coincidencia de prefijo de idioma (e.g. "es-mx" -> "es-es")
      local langPrefix = string.split(currentLocale, "-")[1]
      for supported in SUPPORTED_LOCALES do
          if string.split(supported, "-")[1] == langPrefix then
              return supported
          end
      end

      return DEFAULT_LOCALE
  end
  ```

### 432. `i18n-embedded-localization-table`
- **Regla:** Todo proyecto profesional debe mantener una `LocalizationTable` local embebida en el repositorio para textos esenciales de arranque y mensajes del sistema fuera de línea.
- **Estándar:** Definir entradas con claves semánticas (`UI_LOBBY_PLAY_BUTTON`, `SYSTEM_DISCONNECTED_TITLE`) evitando el uso de cadenas crudas en inglés como claves.

### 433. `i18n-translator-player-instance`
- **Regla:** Para traducir cadenas de texto en el servidor para un jugador específico (e.g. notificaciones de chat o avisos del sistema), obtener su traductor mediante `LocalizationService:GetTranslatorForPlayerAsync(player)`.
- **Ejemplo:**
  ```luau
  --!strict
  local LocalizationService = game:GetService("LocalizationService")
  local Players = game:GetService("Players")

  local function getPlayerTranslator(player: Player): Translator?
      local success, translator = pcall(function()
          return LocalizationService:GetTranslatorForPlayerAsync(player)
      end)
      return if success then translator else nil
  end
  ```

### 434. `i18n-dynamic-parameter-substitution`
- **Regla:** La interpolación de variables en textos traducibles debe realizarse utilizando tokens delimitados (e.g. `{name}`, `{count}`) mediante `Translator:FormatByKey(key, argsTable)`.
- **Prohibido:** Concatenar cadenas con el operador `..` sobre textos traducidos, ya que el orden de las palabras difiere entre idiomas.
- **Ejemplo:**
  ```luau
  --!strict
  local function formatRewardMessage(translator: Translator, goldAmount: number): string
      return translator:FormatByKey("SYSTEM_REWARD_GOLD", {
          amount = tostring(goldAmount),
      })
  end
  ```

### 435. `i18n-plural-rules-formatting`
- **Regla:** Para cuantificadores (1 item vs 2 items), las tablas de localización deben contemplar claves diferenciadas para singular y plural (`KEY_ITEM_ONE`, `KEY_ITEM_OTHER`), adaptándose a las reglas gramaticales del locale destino.

### 436. `i18n-auto-localize-ui-binding`
- **Regla:** En elementos de interfaz estáticos (`TextLabel`, `TextButton`), activar `AutoLocalize = true` y asignar una clave válida en la propiedad `Text`.
- **Estándar:** Asegurar que la raíz de la UI cuente con acceso a la `RootLocalizationTable` asignada en el DataModel.

### 437. `i18n-rtl-layout-mirroring`
- **Regla:** Al detectar idiomas de lectura de derecha a izquierda (RTL, como árabe `ar-001` o hebreo `he-il`), adaptar la interfaz visual espejando la alineación de texto (`TextXAlignment.Right`) y el orden de los iconos y botones.
- **Ejemplo:**
  ```luau
  --!strict
  local function applyRtlAdaptation(textLabel: TextLabel, isRtl: boolean)
      if isRtl then
          textLabel.TextXAlignment = Enum.TextXAlignment.Right
      else
          textLabel.TextXAlignment = Enum.TextXAlignment.Left
      end
  end
  ```

### 438. `i18n-datetime-locale-formatting`
- **Regla:** Las marcas de fecha y hora deben formatearse usando `DateTime:FormatLocalTime(formatString, localeId)`.
- **Prohibido:** Formatear fechas mediante cadenas manuales fijas tipo `DD/MM/YYYY` que desorientan a jugadores de regiones con convención `MM/DD/YYYY` o `YYYY-MM-DD`.

### 439. `i18n-number-currency-locale-delimiters`
- **Regla:** Los valores numéricos grandes (e.g. puntuaciones, monedas) deben formatearse respetando los delimitadores de miles y decimales del locale correspondiente (e.g. comas en inglés `1,000,000`, puntos en español `1.000.000`).

### 440. `i18n-rich-text-localization-safety`
- **Regla:** Al traducir textos con etiquetas `RichText` (`<font color="...">`, `<b>`), las etiquetas XML no deben formar parte del contenido traducible.
- **Estándar:** Sustituir las partes coloreadas mediante tokens de argumento parametrizados para impedir que los traductores o herramientas de auto-traducción corrompan el markup.

### 441. `i18n-server-push-localized-notifications`
- **Regla:** Cuando el servidor envíe alertas globales o eventos a los clientes mediante `RemoteEvent`, debe enviar la clave semántica (`messageKey`) y los argumentos en lugar del texto formateado en el idioma del servidor.
- **Propósito:** Permitir que cada cliente traduzca el mensaje en su propio hilo y con su propio locale local.

### 442. `i18n-font-fallback-cjk-compatibility`
- **Regla:** Las fuentes tipográficas seleccionadas para la experiencia deben incluir soporte nativo para glifos CJK (chino, japonés, coreano) o estar configuradas con fuentes con fallback automático del motor (como `BuilderSans` o `SourceSansPro`).
- **Prohibido:** Emplear fuentes estilizadas de terceros que reemplacen caracteres no latinos por cajas cuadradas o caracteres invisibles ("tofu").

### 443. `i18n-text-bounds-overflow-prevention`
- **Regla:** Las traducciones en ciertos idiomas (e.g. alemán, ruso) suelen ser entre un 30% y un 50% más extensas que en inglés. Los contenedores de texto deben tener `TextWrapped = true` y utilizar `AutomaticSize = Enum.AutomaticSize.Y` o `TextScaled` restringido con `UISizeConstraint`.

### 444. `i18n-country-region-compliance`
- **Regla:** Para mecánicas de juego sujetas a regulaciones legales por país (como cajas de botín aleatorias pagadas o restricciones de chat), consultar `LocalizationService:GetCountryRegionForPlayerAsync(player)` para condicionar la visibilidad de dichas funciones según la política aplicable.

### 445. `i18n-cloud-table-sync-automation`
- **Regla:** La sincronización de las traducciones aprobadas en el Creator Dashboard de Roblox debe integrarse con el repositorio mediante pipelines CI/CD automatizados, actualizando los archivos de localización del proyecto sin intervención manual propensa a desincronizaciones.

## Reglas Inviolables

1. **Nunca concatenar cadenas traducibles con el operador `..`:** Todo texto traducible con variables debe utilizar tokens semánticos formateados con `Translator:FormatByKey`.
2. **Nunca traducir mensajes en el servidor para broadcast global:** El servidor debe enviar la clave de localización y los parámetros en el `RemoteEvent`; la traducción final DEBE ejecutarse en el cliente según su propio locale.
3. **No hardcodear textos visibles en el código:** Todos los títulos, botones, descripciones de ítems y mensajes deben residir en la tabla de localización bajo claves estructuradas.
4. **Prohibido asumir longitud de texto fija:** Las cajas de texto de la UI deben poder expandirse o envolverse sin romperse cuando un idioma requiera más caracteres que el idioma original.
5. **Siempre verificar soporte de glifos en fuentes:** Antes de publicar, validar que las fuentes de la interfaz rendericen correctamente caracteres cirílicos, tildes y kanji/kana.
