--!strict
--[[
    LobbyInteractionService.luau
    RAASE 2.0 / robloxIA — Harry Potter Medieval Magic Lobby Interactive Controller
    
    Coordinates the 5 key functional zones:
      1. Matchmaking Portal Queue (Zone 1)
      2. Crates & Key Vault Opening with Loot Drops (Zone 2)
      3. Potion Shop & Apothecary Alchemy Drinking Effects (Zone 3)
      4. Spell Testing Range & Reactive Combat Mannequins (Zone 4)
      5. Elf-Dwarf Blacksmith Armor & Ring Enhancer (Zone 5)
--]]

local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local LobbyInteractionService = {}
LobbyInteractionService.__index = LobbyInteractionService

export type LobbyService = typeof(setmetatable({} :: {
	queuedPlayers: { [Player]: boolean },
	playerKeys: { [Player]: { common: number, ancient: number, relic: number } },
	dummyHealths: { [string]: { current: number, max: number } },
}, LobbyInteractionService))

function LobbyInteractionService.new(): LobbyService
	local self = setmetatable({
		queuedPlayers = {},
		playerKeys = {},
		dummyHealths = {
			["Dummy_Apprentice"] = { current = 100, max = 100 },
			["Dummy_BattleMage"] = { current = 250, max = 250 },
			["Dummy_ArchMage"] = { current = 500, max = 500 },
		},
	}, LobbyInteractionService)

	return self
end

-- Floating Notification Billboard Helper
local function showFloatingText(part: BasePart, text: string, color: Color3)
	local bb = Instance.new("BillboardGui")
	bb.Name = "FloatingNotice"
	bb.Size = UDim2.new(4, 0, 1.2, 0)
	bb.StudsOffset = Vector3.new(0, 2.5, 0)
	bb.AlwaysOnTop = true

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = color
	label.Font = Enum.Font.GothamBold
	label.TextSize = 16
	label.TextScaled = true
	label.Parent = bb
	bb.Parent = part

	-- Float and fade tween
	local tweenInfo = TweenInfo.new(1.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
	local tween = TweenService:Create(bb, tweenInfo, { StudsOffset = Vector3.new(0, 5.0, 0) })
	local textTween = TweenService:Create(label, tweenInfo, { TextTransparency = 1 })
	tween:Play()
	textTween:Play()

	task.delay(1.5, function()
		bb:Destroy()
	end)
end

-- Sound Spawner Helper
local function playSoundAt(part: BasePart, soundId: string, volume: number?)
	local sound = Instance.new("Sound")
	sound.SoundId = soundId
	sound.Volume = volume or 0.7
	sound.RollOffMode = Enum.RollOffMode.InverseTapered
	sound.RollOffMinDistance = 5
	sound.RollOffMaxDistance = 50
	sound.Parent = part
	sound:Play()
	Debris:AddItem(sound, 3.5)
end

function LobbyInteractionService:Init()
	print("[LobbyInteractionService] Initializing Harry Potter Magic Lobby interactions...")

	-- Setup player keys default state
	Players.PlayerAdded:Connect(function(player: Player)
		self.playerKeys[player] = { common = 3, ancient = 2, relic = 1 }
	end)
	Players.PlayerRemoving:Connect(function(player: Player)
		self.playerKeys[player] = nil
		self.queuedPlayers[player] = nil
	end)

	-- 1. Setup Zone 1: Matchmaking Portal Queue
	self:SetupMatchmakingPortal()

	-- 2. Setup Zone 2: Crates & Key Vault
	self:SetupCratesVault()

	-- 3. Setup Zone 3: Potion Shop
	self:SetupPotionShop()

	-- 4. Setup Zone 4: Combat Mannequins
	self:SetupCombatMannequins()

	-- 5. Setup Zone 5: Elf-Dwarf Blacksmith
	self:SetupElfBlacksmith()

	print("[LobbyInteractionService] ✅ All 5 functional magic zones are fully interactive!")
end

--------------------------------------------------------------------------------
-- ZONE 1: MATCHMAKING PORTAL
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupMatchmakingPortal()
	local portalModel = Workspace:FindFirstChild("MagicLobby_Zone1_Matchmaking")
	if not portalModel then return end

	local queuePad = portalModel:FindFirstChild("Portal_Queue_Pad") :: BasePart?
	if not queuePad then return end

	-- Overhead Status Display
	local bb = Instance.new("BillboardGui")
	bb.Name = "PortalStatusGui"
	bb.Size = UDim2.new(7, 0, 2.5, 0)
	bb.StudsOffset = Vector3.new(0, 5, 0)
	bb.AlwaysOnTop = true
	bb.Parent = queuePad

	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.Size = UDim2.new(1, 0, 0.5, 0)
	title.BackgroundTransparency = 1
	title.Text = "🔮 PORTAL DE DUELOS MÁGICOS"
	title.TextColor3 = Color3.fromRGB(110, 215, 255)
	title.Font = Enum.Font.GothamBold
	title.TextSize = 18
	title.Parent = bb

	local queueCountLabel = Instance.new("TextLabel")
	queueCountLabel.Name = "CountLabel"
	queueCountLabel.Size = UDim2.new(1, 0, 0.45, 0)
	queueCountLabel.Position = UDim2.new(0, 0, 0.52, 0)
	queueCountLabel.BackgroundTransparency = 1
	queueCountLabel.Text = "En cola: 0 / 4 Hechiceros"
	queueCountLabel.TextColor3 = Color3.fromRGB(240, 245, 255)
	queueCountLabel.Font = Enum.Font.GothamMedium
	queueCountLabel.TextSize = 14
	queueCountLabel.Parent = bb

	-- Proximity Prompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Entrar / Salir de Cola"
	prompt.ObjectText = "Portal de Batalla"
	prompt.HoldDuration = 0.5
	prompt.MaxActivationDistance = 14
	prompt.RequiresLineOfSight = false
	prompt.Parent = queuePad

	prompt.Triggered:Connect(function(player: Player)
		if self.queuedPlayers[player] then
			self.queuedPlayers[player] = nil
			showFloatingText(queuePad, string.format("❌ %s salió de la cola", player.DisplayName), Color3.fromRGB(255, 120, 120))
			playSoundAt(queuePad, "rbxassetid://9114221804", 0.5)
		else
			self.queuedPlayers[player] = true
			showFloatingText(queuePad, string.format("⚔️ %s se unió a la cola!", player.DisplayName), Color3.fromRGB(100, 255, 150))
			playSoundAt(queuePad, "rbxassetid://9114223175", 0.8)
		end

		local count = 0
		for _ in pairs(self.queuedPlayers) do count += 1 end
		queueCountLabel.Text = string.format("En cola: %d / 4 Hechiceros", count)

		if count >= 4 then
			title.Text = "⚡ INICIANDO PARTIDA..."
			title.TextColor3 = Color3.fromRGB(255, 220, 70)
			task.delay(3.0, function()
				title.Text = "🔮 PORTAL DE DUELOS MÁGICOS"
				title.TextColor3 = Color3.fromRGB(110, 215, 255)
				self.queuedPlayers = {}
				queueCountLabel.Text = "En cola: 0 / 4 Hechiceros"
			end)
		end
	end)
end

--------------------------------------------------------------------------------
-- ZONE 2: CRATES & KEYS VAULT
-- -----------------------------------------------------------------------------
function LobbyInteractionService:SetupCratesVault()
	local vaultModel = Workspace:FindFirstChild("MagicLobby_Zone2_CratesVault")
	if not vaultModel then return end

	local chestConfigs = {
		{
			bodyName = "Crate_Body_Common",
			keyType = "common",
			title = "Cofre Común de Madera",
			color = Color3.fromRGB(120, 200, 255),
			drops = { "Varita de Roble Rúnico", "50 Monedas Mágicas", "Poción Menor de Salud" }
		},
		{
			bodyName = "Crate_Body_Ancient",
			keyType = "ancient",
			title = "Bóveda Ancestral de Hierro",
			color = Color3.fromRGB(190, 110, 255),
			drops = { "Tomo de Fuego Valyrio", "Anillo de Zafiro del Viento", "Manto de Protección Arcana" }
		},
		{
			bodyName = "Crate_Body_RelicGold",
			keyType = "relic",
			title = "Reliquia Sagrada de Oro",
			color = Color3.fromRGB(255, 220, 80),
			drops = { "Varita de Fénix Legendaria", "Corona Rúnica del Archmago", "5000 Monedas de Oro" }
		}
	}

	for _, cfg in ipairs(chestConfigs) do
		local chestPart = vaultModel:FindFirstChild(cfg.bodyName) :: BasePart?
		if chestPart then
			local prompt = Instance.new("ProximityPrompt")
			prompt.ActionText = "Abrir Cofre"
			prompt.ObjectText = cfg.title
			prompt.HoldDuration = 0.8
			prompt.MaxActivationDistance = 10
			prompt.RequiresLineOfSight = false
			prompt.Parent = chestPart

			prompt.Triggered:Connect(function(player: Player)
				local keys = self.playerKeys[player]
				local keyCount = keys and (keys :: any)[cfg.keyType] or 1

				if keyCount > 0 then
					if keys then
						(keys :: any)[cfg.keyType] = keyCount - 1
					end
					local reward = cfg.drops[math.random(1, #cfg.drops)]
					playSoundAt(chestPart, "rbxassetid://9114221528", 0.8)
					showFloatingText(chestPart, string.format("✨ ¡Recompensa: %s!", reward), cfg.color)
				else
					showFloatingText(chestPart, "🔒 ¡Necesitas más llaves!", Color3.fromRGB(255, 90, 90))
					playSoundAt(chestPart, "rbxassetid://9114221804", 0.5)
				end
			end)
		end
	end
end

--------------------------------------------------------------------------------
-- ZONE 3: POTIONS APOTHECARY SHOP
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupPotionShop()
	local potionModel = Workspace:FindFirstChild("MagicLobby_Zone3_PotionShop")
	if not potionModel then return end

	-- Cauldron Interaction
	local cauldron = potionModel:FindFirstChild("Cauldron_Liquid") :: BasePart?
	if cauldron then
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "Preparar Brebaje Mágico"
		prompt.ObjectText = "Gran Caldero Borboteante"
		prompt.HoldDuration = 1.0
		prompt.MaxActivationDistance = 10
		prompt.RequiresLineOfSight = false
		prompt.Parent = cauldron

		prompt.Triggered:Connect(function(player: Player)
			local char = player.Character
			if char then
				local hum = char:FindFirstChildOfClass("Humanoid")
				if hum then
					hum.Health = hum.MaxHealth
					hum.WalkSpeed = 24
					task.delay(15, function()
						if hum then hum.WalkSpeed = 16 end
					end)
				end
			end
			playSoundAt(cauldron, "rbxassetid://9114223784", 0.9)
			showFloatingText(cauldron, "🧪 ¡Brebaje consumido: Salud máxima y +50% Velocidad!", Color3.fromRGB(80, 255, 120))
		end)
	end

	-- Potion Flasks on Shelves
	local potionTypes = {
		{ name = "Flask_L1_0", title = "Poción de Vida", effect = "Cura instantánea", color = Color3.fromRGB(255, 80, 90) },
		{ name = "Flask_L1_1", title = "Elixir de Maná", effect = "Poder arcano +100%", color = Color3.fromRGB(80, 160, 255) },
		{ name = "Flask_L1_2", title = "Poción de Velocidad", effect = "Velocidad felina", color = Color3.fromRGB(80, 255, 100) },
		{ name = "Flask_L1_3", title = "Poción de Invisibilidad", effect = "Invisibilidad x 10s", color = Color3.fromRGB(200, 90, 255) },
	}

	for _, pt in ipairs(potionTypes) do
		local flask = potionModel:FindFirstChild(pt.name) :: BasePart?
		if flask then
			local prompt = Instance.new("ProximityPrompt")
			prompt.ActionText = "Tomar " .. pt.title
			prompt.ObjectText = "Estante de Pociones"
			prompt.HoldDuration = 0.4
			prompt.MaxActivationDistance = 8
			prompt.RequiresLineOfSight = false
			prompt.Parent = flask

			prompt.Triggered:Connect(function(player: Player)
				playSoundAt(flask, "rbxassetid://9114223784", 0.7)
				showFloatingText(flask, string.format("✨ Bebiste %s (%s)", pt.title, pt.effect), pt.color)
			end)
		end
	end
end

--------------------------------------------------------------------------------
-- ZONE 4: COMBAT MANNEQUINS & SPELL PRACTICE
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupCombatMannequins()
	local rangeModel = Workspace:FindFirstChild("MagicLobby_Zone4_SpellRange")
	if not rangeModel then return end

	local dummyNames = { "Dummy_Apprentice", "Dummy_BattleMage", "Dummy_ArchMage" }

	for _, dName in ipairs(dummyNames) do
		local torso = rangeModel:FindFirstChild(dName .. "_Torso") :: BasePart?
		if torso then
			-- Overhead Health Bar GUI
			local bb = Instance.new("BillboardGui")
			bb.Name = "DummyHealthGui"
			bb.Size = UDim2.new(4.5, 0, 1.4, 0)
			bb.StudsOffset = Vector3.new(0, 3.8, 0)
			bb.AlwaysOnTop = true
			bb.Parent = torso

			local nameLabel = Instance.new("TextLabel")
			nameLabel.Size = UDim2.new(1, 0, 0.45, 0)
			nameLabel.BackgroundTransparency = 1
			nameLabel.Text = dName:gsub("Dummy_", "Maniquí de ")
			nameLabel.TextColor3 = Color3.fromRGB(255, 235, 170)
			nameLabel.Font = Enum.Font.GothamBold
			nameLabel.TextSize = 13
			nameLabel.Parent = bb

			local barBg = Instance.new("Frame")
			barBg.Size = UDim2.new(0.9, 0, 0.35, 0)
			barBg.Position = UDim2.new(0.05, 0, 0.55, 0)
			barBg.BackgroundColor3 = Color3.fromRGB(40, 42, 48)
			barBg.BorderSizePixel = 0
			barBg.Parent = bb

			local barFill = Instance.new("Frame")
			barFill.Name = "Fill"
			barFill.Size = UDim2.new(1, 0, 1, 0)
			barFill.BackgroundColor3 = Color3.fromRGB(75, 225, 95)
			barFill.BorderSizePixel = 0
			barFill.Parent = barBg

			-- Proximity Prompt to Test Spells on Dummy
			local prompt = Instance.new("ProximityPrompt")
			prompt.ActionText = "Lanzar Hechizo de Prueba"
			prompt.ObjectText = nameLabel.Text
			prompt.HoldDuration = 0.2
			prompt.MaxActivationDistance = 16
			prompt.RequiresLineOfSight = false
			prompt.Parent = torso

			prompt.Triggered:Connect(function(player: Player)
				local damage = math.random(35, 85)
				local isCrit = math.random(1, 4) == 1
				if isCrit then damage = math.floor(damage * 1.8) end

				local dData = self.dummyHealths[dName]
				if dData then
					dData.current = math.max(0, dData.current - damage)
					local fraction = dData.current / dData.max
					barFill.Size = UDim2.new(fraction, 0, 1, 0)
					if fraction < 0.3 then
						barFill.BackgroundColor3 = Color3.fromRGB(255, 65, 65)
					elseif fraction < 0.6 then
						barFill.BackgroundColor3 = Color3.fromRGB(255, 195, 45)
					else
						barFill.BackgroundColor3 = Color3.fromRGB(75, 225, 95)
					end

					-- Damage Popup
					local dmgText = isCrit and string.format("💥 ¡CRÍTICO! -%d HP", damage) or string.format("⚡ -%d HP", damage)
					local dmgColor = isCrit and Color3.fromRGB(255, 190, 40) or Color3.fromRGB(255, 80, 80)
					showFloatingText(torso, dmgText, dmgColor)
					playSoundAt(torso, "rbxassetid://9114221804", 0.75)

					-- Auto-heal dummy after 3 seconds
					if dData.current <= 0 then
						task.delay(1.5, function()
							dData.current = dData.max
							barFill.Size = UDim2.new(1, 0, 1, 0)
							barFill.BackgroundColor3 = Color3.fromRGB(75, 225, 95)
							showFloatingText(torso, "♻️ ¡Maniquí Reparado!", Color3.fromRGB(120, 255, 150))
							playSoundAt(torso, "rbxassetid://9114223175", 0.5)
						end)
					end
				end
			end)
		end
	end
end

--------------------------------------------------------------------------------
-- ZONE 5: ELF-DWARF BLACKSMITH & ENCHANTER
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupElfBlacksmith()
	local forgeModel = Workspace:FindFirstChild("MagicLobby_Zone5_ElfForge")
	if not forgeModel then return end

	local anvil = forgeModel:FindFirstChild("Anvil_Iron_Base") :: BasePart?
	local elfHead = forgeModel:FindFirstChild("Elf_Head") :: BasePart?

	-- Nameplate above Elf Blacksmith
	if elfHead then
		local bb = Instance.new("BillboardGui")
		bb.Name = "ElfNameplate"
		bb.Size = UDim2.new(5, 0, 1.5, 0)
		bb.StudsOffset = Vector3.new(0, 2.4, 0)
		bb.AlwaysOnTop = true
		bb.Parent = elfHead

		local lbl = Instance.new("TextLabel")
		lbl.Size = UDim2.new(1, 0, 0.55, 0)
		lbl.BackgroundTransparency = 1
		lbl.Text = "🔨 Maestro Forjador Elfo"
		lbl.TextColor3 = Color3.fromRGB(255, 215, 100)
		lbl.Font = Enum.Font.GothamBold
		lbl.TextSize = 15
		lbl.Parent = bb

		local sub = Instance.new("TextLabel")
		sub.Size = UDim2.new(1, 0, 0.45, 0)
		sub.Position = UDim2.new(0, 0, 0.55, 0)
		sub.BackgroundTransparency = 1
		sub.Text = "«Herrería y Anillos Arcanos»"
		sub.TextColor3 = Color3.fromRGB(200, 220, 240)
		sub.Font = Enum.Font.GothamMedium
		sub.TextSize = 12
		sub.Parent = bb
	end

	-- Interaction Prompt on Anvil
	if anvil then
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "Mejorar Armadura y Anillos"
		prompt.ObjectText = "Yunque Rúnico del Elfo"
		prompt.HoldDuration = 0.8
		prompt.MaxActivationDistance = 12
		prompt.RequiresLineOfSight = false
		prompt.Parent = anvil

		prompt.Triggered:Connect(function(player: Player)
			local char = player.Character
			if char then
				-- Play anvil clinking sound
				playSoundAt(anvil, "rbxassetid://9114220194", 0.9)

				-- Armor sparks effect
				local sparks = Instance.new("ParticleEmitter")
				sparks.Rate = 40
				sparks.Speed = NumberRange.new(3, 8)
				sparks.Lifetime = NumberRange.new(0.4, 0.8)
				sparks.LightEmission = 1.0
				sparks.Color = ColorSequence.new(Color3.fromRGB(255, 180, 50))
				sparks.Parent = anvil

				task.delay(0.6, function()
					sparks.Enabled = false
					task.wait(1.0)
					sparks:Destroy()
				end)

				-- Dialog & Buff
				showFloatingText(anvil, "🛡️ ¡Armadura y Anillos Templados (+20% Resistencia)! 💍", Color3.fromRGB(255, 215, 90))
			end
		end)
	end
end

return LobbyInteractionService
