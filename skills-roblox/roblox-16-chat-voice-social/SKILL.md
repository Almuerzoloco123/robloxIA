---
name: roblox-16-chat-voice-social
description: "Rige la comunicación social, chat de texto moderno y voz espacial (skills 311-325): TextChatService con canales personalizados y comandos de chat, filtrado de texto autoritativo obligatorio en servidor con TextService, BubbleChat estilizado, Voice Chat espacial con AudioDeviceInput, AudioEmitter y Wire, e integraciones sociales con SocialService para invitaciones y amigos. Úsala al implementar sistemas de chat, comunicación de escuadrón, voz por proximidad y funciones sociales en Roblox."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Chat, Voice & Social Systems"
  range: "311-325"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-16-chat-voice-social — Chat de Texto, Voz Espacial y Sistemas Sociales (Skills 311 - 325)

Este módulo establece los estándares técnicos para la implementación de comunicación segura, canales de chat dinámicos, audio espacial de voz por proximidad y mecánicas sociales en Roblox bajo Luau estricto.

## Principio Fundamental: Filtrado Obligatorio y Seguridad de Jugadores
En cumplimiento estricto con los Términos de Servicio y Normas de la Comunidad de Roblox, todo texto generado o transmitido por usuarios hacia otros jugadores DEBE ser procesado exclusivamente por las APIs de filtrado oficiales de Roblox en el servidor. Omitir el filtrado o ejecutarlo en el cliente es motivo de sanción inmediata y suspensión de la experiencia.

---

## Catálogo de Habilidades Técnicas

### 311. `chat-text-chat-service-modern-setup`
- **Regla:** Configurar el sistema moderno `TextChatService` con canales base (`RBXGeneral`, `RBXSystem`) y descartar de forma definitiva el sistema legado de carpetas `ChatModules`.
- **Estándar:**
```luau
--!strict
local TextChatService = game:GetService("TextChatService")

local function configureModernChat()
    TextChatService.ChatVersion = Enum.ChatVersion.TextChatService
    local generalChannel = TextChatService:WaitForChild("TextChannels"):WaitForChild("RBXGeneral") :: TextChannel
    return generalChannel
end
```

### 312. `chat-custom-text-channels`
- **Regla:** Crear y gestionar programáticamente canales de texto aislados (`TextChannel`) para chats de facción, gremios, escuadras o susurros privados en el servidor.
```luau
--!strict
local TextChatService = game:GetService("TextChatService")

local function createSquadChannel(squadId: string): TextChannel
    local textChannels = TextChatService:FindFirstChild("TextChannels")
    if not textChannels then
        textChannels = Instance.new("Folder")
        textChannels.Name = "TextChannels"
        textChannels.Parent = TextChatService
    end

    local channel = Instance.new("TextChannel")
    channel.Name = "Squad_" .. squadId
    channel.Parent = textChannels
    return channel
end
```

### 313. `chat-text-chat-commands-registration`
- **Regla:** Registrar comandos de chat tipados mediante `TextChatCommand` y capturar el evento `Triggered` en el servidor o cliente para acciones contextuales (/trade, /roll, /whisper).
```luau
--!strict
local TextChatService = game:GetService("TextChatService")

local function registerTradeCommand(): TextChatCommand
    local command = Instance.new("TextChatCommand")
    command.Name = "TradeCommand"
    command.PrimaryAlias = "/trade"
    command.SecondaryAlias = "/comerciar"
    command.Parent = TextChatService:WaitForChild("TextChatCommands")

    command.Triggered:Connect(function(originTextSource: TextSource, unfilteredText: string)
        local senderUserId = originTextSource.UserId
        -- Parsear argumentos del comando
        print(`[Comando] Solicitud de intercambio enviada por UserId: {senderUserId}`)
    end)

    return command
end
```

### 314. `chat-bubble-chat-styling-configuration`
- **Regla:** Estilizar las burbujas de chat sobre los avatares mediante `BubbleChatConfiguration`, respetando contrastes de accesibilidad y límites de distancia de lectura.
```luau
--!strict
local TextChatService = game:GetService("TextChatService")

local function setupBubbleChat()
    local bubbleConfig = TextChatService:WaitForChild("BubbleChatConfiguration") :: BubbleChatConfiguration
    bubbleConfig.Enabled = true
    bubbleConfig.BackgroundColor3 = Color3.fromRGB(25, 25, 30)
    bubbleConfig.TextColor3 = Color3.fromRGB(240, 240, 245)
    bubbleConfig.Font = Enum.Font.GothamMedium
    bubbleConfig.TextSize = 16
    bubbleConfig.MaxDistance = 60
    bubbleConfig.BubbleDuration = 8
    bubbleConfig.CornerRadius = UDim.new(0, 10)
end
```

### 315. `chat-server-text-filtering-mandatory`
- **Regla:** Filtrar incondicionalmente cualquier texto libre escrito por un jugador mediante `TextService:FilterStringAsync()` en un `Script` del servidor antes de su difusión.
```luau
--!strict
local TextService = game:GetService("TextService")

local function filterUserString(rawText: string, authorUserId: number): TextFilterResult?
    local success, result = pcall(function()
        return TextService:FilterStringAsync(rawText, authorUserId)
    end)

    if success and result then
        return result
    else
        warn(`[Filtro] Error filtrando texto para UserId {authorUserId}`)
        return nil
    end
end
```

### 316. `chat-filter-result-broadcast-vs-recipient`
- **Regla:** Utilizar `GetNonChatStringForBroadcastAsync()` para textos que verán todos los jugadores de forma pública, o `GetNonChatStringForUserAsync(targetUserId)` para textos dirigidos a un destinatario específico con restricciones de edad.
```luau
--!strict
local function getSafeBroadcastText(filterResult: TextFilterResult): string
    local success, cleanText = pcall(function()
        return filterResult:GetNonChatStringForBroadcastAsync()
    end)

    return if success then cleanText else "###"
end

local function getSafeRecipientText(filterResult: TextFilterResult, recipientUserId: number): string
    local success, cleanText = pcall(function()
        return filterResult:GetNonChatStringForUserAsync(recipientUserId)
    end)

    return if success then cleanText else "###"
end
```

### 317. `voice-chat-audio-device-input-modern`
- **Regla:** Capturar la voz de los jugadores utilizando las APIs del moderno sistema de audio de Roblox con instancias `AudioDeviceInput`.
```luau
--!strict
local function setupPlayerVoiceInput(player: Player): AudioDeviceInput
    local audioInput = Instance.new("AudioDeviceInput")
    audioInput.Player = player
    audioInput.Muted = false
    audioInput.Volume = 1.0
    return audioInput
end
```

### 318. `voice-spatial-audio-emitter-wire`
- **Regla:** Conectar la entrada de voz capturada con `AudioEmitter` en el personaje del emisor y enlazar el flujo acústico mediante `Wire` hacia los oyentes.
```luau
--!strict
local function linkVoiceToCharacter(audioInput: AudioDeviceInput, character: Model): (AudioEmitter, Wire)?
    local rootPart = character:FindFirstChild("HumanoidRootPart") :: BasePart?
    if not rootPart then return nil end

    local emitter = Instance.new("AudioEmitter")
    emitter.Parent = rootPart

    local wire = Instance.new("Wire")
    wire.SourceInstance = audioInput
    wire.TargetInstance = emitter
    wire.Parent = rootPart

    return emitter, wire
end
```

### 319. `voice-proximity-distance-curves`
- **Regla:** Ajustar las propiedades de atenuación de proximidad en `AudioEmitter` (`DistanceAttenuation`) para evitar que las conversaciones sean audibles a distancias que invadan otras zonas de juego.
```luau
--!strict
local function configureVoiceRollOff(emitter: AudioEmitter, minDistance: number, maxDistance: number)
    emitter:SetDistanceAttenuation({
        [minDistance] = 1.0,
        [maxDistance * 0.5] = 0.5,
        [maxDistance] = 0.0,
    })
end
```

### 320. `voice-service-permissions-verification`
- **Regla:** Verificar la elegibilidad y permisos de chat de voz del usuario antes de instanciar componentes de audio con `VoiceChatService:IsVoiceEnabledForUserIdAsync()`.
```luau
--!strict
local VoiceChatService = game:GetService("VoiceChatService")

local function checkVoiceEligibility(userId: number): boolean
    local success, isEnabled = pcall(function()
        return VoiceChatService:IsVoiceEnabledForUserIdAsync(userId)
    end)

    return success and isEnabled == true
end
```

### 321. `social-service-game-invite-prompt`
- **Regla:** Comprobar `SocialService:CanSendGameInviteAsync()` antes de abrir el modal nativo de invitación de amigos con `SocialService:PromptGameInvite()`.
```luau
--!strict
local SocialService = game:GetService("SocialService")

local function promptInviteModal(player: Player)
    local success, canInvite = pcall(function()
        return SocialService:CanSendGameInviteAsync(player)
    end)

    if success and canInvite then
        SocialService:PromptGameInvite(player)
    else
        warn(`[SocialService] El jugador {player.Name} no puede enviar invitaciones actualmente.`)
    end
end
```

### 322. `social-service-invite-payload-telemetry`
- **Regla:** Manejar el evento `SocialService.GameInvitePromptClosed` y registrar recompensas sociales seguras cuando el jugador invite con éxito a sus amigos.
```luau
--!strict
local SocialService = game:GetService("SocialService")

local function listenToInviteResults(player: Player, onInvitesSent: (recipientIds: { number }) -> ())
    SocialService.GameInvitePromptClosed:Connect(function(senderPlayer: Player, recipientIds: { number })
        if senderPlayer == player and #recipientIds > 0 then
            onInvitesSent(recipientIds)
        end
    end)
end
```

### 323. `social-friends-status-query`
- **Regla:** Consultar el estado de amigos conectados de forma asíncrona y segura mediante `player:GetFriendsOnline()` para listas de amigos dentro del juego.
```luau
--!strict
local function queryOnlineFriends(player: Player): { [string]: any }
    local success, friendsData = pcall(function()
        return player:GetFriendsOnline(50)
    end)

    return if success and friendsData then friendsData else {}
end
```

### 324. `social-avatar-inspect-menu-toggle`
- **Regla:** Permitir que los jugadores inspeccionen y adquieran cosméticos del avatar de otros jugadores usando `GuiService:InspectPlayerFromUserId()`.
```luau
--!strict
local GuiService = game:GetService("GuiService")

local function openInspectMenu(targetUserId: number)
    pcall(function()
        GuiService:InspectPlayerFromUserId(targetUserId)
    end)
end
```

### 325. `social-privacy-block-list-respect`
- **Regla:** Respetar la privacidad del usuario verificando relaciones de amistad o bloqueo mediante `player:IsFriendsWith()` y silenciando el audio y chat entre jugadores bloqueados.
```luau
--!strict
local function arePlayersFriends(playerA: Player, playerBUserId: number): boolean
    local success, isFriend = pcall(function()
        return playerA:IsFriendsWith(playerBUserId)
    end)

    return success and isFriend == true
end
```

---

## Reglas Inviolables

1. **Filtrado Exclusivo en Servidor:** TODO texto ingresado por un jugador que pueda ser visto por otros DEBE filtrarse en el servidor utilizando `TextService:FilterStringAsync`. Nunca confiar en el cliente para filtrar.
2. **Uso Estricto de TextFilterResult:** No transformar ni omitir los métodos `GetNonChatStringForBroadcastAsync` o `GetNonChatStringForUserAsync`. Es ilegal almacenar o transmitir texto no filtrado por la red.
3. **Manejo Seguro de Excepciones Sociales:** Todas las llamadas a `SocialService` y `VoiceChatService` DEBEN estar envueltas en `pcall` ante caídas de red o restricciones parentales de la cuenta.
4. **Respeto a Preferencias de Silenciado y Voz:** Respetar las propiedades `Muted` y las directrices de privacidad acústica del motor; nunca transmitir audio de micrófonos de jugadores que hayan desactivado la voz.
5. **No Evasión de Filtro:** Está terminantemente prohibido implementar diccionarios propios o reordenamientos de cadenas para intentar eludir o reemplazar el filtro de moderación oficial de Roblox.
