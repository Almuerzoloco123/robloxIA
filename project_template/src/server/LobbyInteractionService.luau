--!strict
--[[
    LobbyInteractionService.luau
    RAASE 2.1 — Harry Potter Citadel Medieval Magic Lobby Interactive Controller (V3)
    
    Coordinates the 5 functional zones directly from MagicLobby_V3 and MagicLobby_V3_Interactions:
      1. Matchmaking Portal Queue (Zone 1)
      2. Crates & Key Vault Opening with Loot Drops (Zone 2)
      3. Potion Shop & Apothecary Alchemy Drinking Effects (Zone 3)
      4. Spell Testing Range & Reactive Combat Mannequins with Damage Popups (Zone 4)
      5. Elf-Dwarf Blacksmith ("Thistlebeard") Armor & Ring Enhancements (Zone 5)
--]]

local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local LobbyInteractionService = {}
LobbyInteractionService.__index = LobbyInteractionService

export type LobbyService = typeof(setmetatable({} :: {
	queuedPlayers: { [Player]: boolean },
	playerKeys: { [Player]: { common: number, rare: number, legendary: number } },
	dummyHealths: { [string]: { current: number, max: number } },
}, LobbyInteractionService))

function LobbyInteractionService.new(): LobbyService
	local self = setmetatable({
		queuedPlayers = {},
		playerKeys = {},
		dummyHealths = {
			["Apprentice"] = { current = 100, max = 100 },
			["Battle"] = { current = 500, max = 500 },
			["Archmage"] = { current = 2000, max = 2000 },
		},
	}, LobbyInteractionService)

	return self
end

-- Floating Notification Billboard Helper
local function showFloatingText(part: BasePart, text: string, color: Color3)
	local bb = Instance.new("BillboardGui")
	bb.Name = "FloatingNotice"
	bb.Size = UDim2.new(5, 0, 1.4, 0)
	bb.StudsOffset = Vector3.new(0, 3.0, 0)
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

	local tweenInfo = TweenInfo.new(1.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
	local tween = TweenService:Create(bb, tweenInfo, { StudsOffset = Vector3.new(0, 5.5, 0) })
	local textTween = TweenService:Create(label, tweenInfo, { TextTransparency = 1 })
	tween:Play()
	textTween:Play()

	task.delay(1.7, function()
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
	print("[LobbyInteractionService] 🏰 Initializing Harry Potter Citadel Lobby interactions (V3)...")

	Players.PlayerAdded:Connect(function(player: Player)
		self.playerKeys[player] = { common = 3, rare = 2, legendary = 1 }
	end)
	Players.PlayerRemoving:Connect(function(player: Player)
		self.playerKeys[player] = nil
		self.queuedPlayers[player] = nil
	end)

	-- Wait for interaction container or search workspace
	task.spawn(function()
		local interactions = Workspace:WaitForChild("MagicLobby_V3_Interactions", 10)
		self:SetupAllInteractions(interactions)
	end)

	print("[LobbyInteractionService] ✅ All 5 functional magic zones wired to server logic!")
end

function LobbyInteractionService:SetupAllInteractions(container: Instance?)
	self:SetupZone1Portal(container)
	self:SetupZone2Crates(container)
	self:SetupZone3Potions(container)
	self:SetupZone4Dueling(container)
	self:SetupZone5Smithy(container)
end

--------------------------------------------------------------------------------
-- ZONE 1: MATCHMAKING PORTAL
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupZone1Portal(container: Instance?)
	local trigger = (container and container:FindFirstChild("Trigger_Zone1_Matchmaking"))
		or Workspace:FindFirstChild("Trigger_Zone1_Matchmaking", true) :: BasePart?

	if not trigger then return end

	local prompt = trigger:FindFirstChildOfClass("ProximityPrompt")
	if not prompt then return end

	prompt.Triggered:Connect(function(player: Player)
		if self.queuedPlayers[player] then
			self.queuedPlayers[player] = nil
			showFloatingText(trigger, string.format("❌ %s salió de la cola de batalla", player.DisplayName), Color3.fromRGB(255, 120, 120))
			playSoundAt(trigger, "rbxassetid://9114221804", 0.6)
		else
			self.queuedPlayers[player] = true
			showFloatingText(trigger, string.format("⚔️ %s se unió a la cola de duelo!", player.DisplayName), Color3.fromRGB(110, 230, 255))
			playSoundAt(trigger, "rbxassetid://9114223175", 0.9)
		end

		local count = 0
		for _ in pairs(self.queuedPlayers) do count += 1 end

		if count >= 4 then
			showFloatingText(trigger, "⚡ ¡PARTIDA ENCONTRADA! Teletransportando hechiceros...", Color3.fromRGB(255, 220, 80))
			task.delay(2.5, function()
				self.queuedPlayers = {}
			end)
		end
	end)
end

--------------------------------------------------------------------------------
-- ZONE 2: CRATES & KEYS VAULT
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupZone2Crates(container: Instance?)
	local crateConfigs = {
		{
			triggerName = "Trigger_Zone2_Crate_Common",
			keyType = "common",
			title = "Cofre de Roble",
			color = Color3.fromRGB(240, 200, 120),
			drops = { "Varita de Roble Rúnico", "100 Monedas de Plata", "Poción Menor de Salud" }
		},
		{
			triggerName = "Trigger_Zone2_Crate_Rare",
			keyType = "rare",
			title = "Bóveda de Hierro Rúnico",
			color = Color3.fromRGB(100, 220, 255),
			drops = { "Tomo de Fuego Valyrio", "Anillo de Zafiro del Viento", "Manto de Protección Arcana" }
		},
		{
			triggerName = "Trigger_Zone2_Crate_Legendary",
			keyType = "legendary",
			title = "Reliquia Real Arcana",
			color = Color3.fromRGB(255, 225, 75),
			drops = { "Varita de Fénix Legendaria", "Corona Rúnica del Archmago", "5000 Monedas de Oro" }
		}
	}

	for _, cfg in ipairs(crateConfigs) do
		local trigger = (container and container:FindFirstChild(cfg.triggerName))
			or Workspace:FindFirstChild(cfg.triggerName, true) :: BasePart?

		if trigger then
			local prompt = trigger:FindFirstChildOfClass("ProximityPrompt")
			if prompt then
				prompt.Triggered:Connect(function(player: Player)
					local keys = self.playerKeys[player]
					local keyCount = keys and (keys :: any)[cfg.keyType] or 1

					if keyCount > 0 then
						if keys then
							(keys :: any)[cfg.keyType] = keyCount - 1
						end
						local reward = cfg.drops[math.random(1, #cfg.drops)]
						playSoundAt(trigger, "rbxassetid://9114221528", 0.9)
						showFloatingText(trigger, string.format("✨ ¡Recompensa: %s!", reward), cfg.color)
					else
						showFloatingText(trigger, "🔒 ¡Necesitas más llaves para abrir este cofre!", Color3.fromRGB(255, 90, 90))
						playSoundAt(trigger, "rbxassetid://9114221804", 0.5)
					end
				end)
			end
		end
	end
end

--------------------------------------------------------------------------------
-- ZONE 3: POTIONS APOTHECARY & PORCH CAULDRON
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupZone3Potions(container: Instance?)
	-- Cauldron Trigger
	local cauldronTrigger = (container and container:FindFirstChild("Trigger_Zone3_Cauldron"))
		or Workspace:FindFirstChild("Trigger_Zone3_Cauldron", true) :: BasePart?

	if cauldronTrigger then
		local prompt = cauldronTrigger:FindFirstChildOfClass("ProximityPrompt")
		if prompt then
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
				playSoundAt(cauldronTrigger, "rbxassetid://9114223784", 0.9)
				showFloatingText(cauldronTrigger, "🍵 ¡Brebaje Mágico: Salud Restaurada & +50% Velocidad!", Color3.fromRGB(60, 255, 120))
			end)
		end
	end

	-- Potion Shop Shelf Trigger
	local shopTrigger = (container and container:FindFirstChild("Trigger_Zone3_PotionShop"))
		or Workspace:FindFirstChild("Trigger_Zone3_PotionShop", true) :: BasePart?

	if shopTrigger then
		local prompt = shopTrigger:FindFirstChildOfClass("ProximityPrompt")
		if prompt then
			prompt.Triggered:Connect(function(player: Player)
				playSoundAt(shopTrigger, "rbxassetid://9114223784", 0.7)
				showFloatingText(shopTrigger, "🧪 Adquiriste: Elixir de Celeridad y Maná Arcano", Color3.fromRGB(200, 160, 255))
			end)
		end
	end
end

--------------------------------------------------------------------------------
-- ZONE 4: COMBAT MANNEQUINS & SPELL PRACTICE
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupZone4Dueling(container: Instance?)
	local dummies = {
		{ name = "Trigger_Zone4_Dummy_Apprentice", key = "Apprentice", title = "Aprendiz", damage = 35 },
		{ name = "Trigger_Zone4_Dummy_Battle", key = "Battle", title = "Batalla", damage = 65 },
		{ name = "Trigger_Zone4_Dummy_Archmage", key = "Archmage", title = "Archimago", damage = 120 },
	}

	for _, d in ipairs(dummies) do
		local trigger = (container and container:FindFirstChild(d.name))
			or Workspace:FindFirstChild(d.name, true) :: BasePart?

		if trigger then
			local prompt = trigger:FindFirstChildOfClass("ProximityPrompt")
			if prompt then
				prompt.Triggered:Connect(function(player: Player)
					local stats = self.dummyHealths[d.key]
					if not stats then return end

					local dmg = math.random(d.damage - 10, d.damage + 15)
					stats.current = math.max(0, stats.current - dmg)

					-- Play hit sound
					playSoundAt(trigger, "rbxassetid://9114220194", 0.8)

					-- Show damage popup
					showFloatingText(trigger, string.format("💥 -%d HP (%d/%d)", dmg, stats.current, stats.max), Color3.fromRGB(255, 80, 80))

					-- Update BillboardGui if present
					local bb = trigger:FindFirstChildOfClass("BillboardGui")
					if bb then
						local lbl = bb:FindFirstChildOfClass("TextLabel")
						if lbl then
							lbl.Text = string.format("🎯 Maniquí de %s\nHP: %d/%d", d.title, stats.current, stats.max)
						end
					end

					-- Auto-regenerate dummy after delay
					task.delay(4.0, function()
						stats.current = stats.max
						if bb then
							local lbl = bb:FindFirstChildOfClass("TextLabel")
							if lbl then
								lbl.Text = string.format("🎯 Maniquí de %s\nHP: %d/%d", d.title, stats.max, stats.max)
							end
						end
					end)
				end)
			end
		end
	end
end

--------------------------------------------------------------------------------
-- ZONE 5: ELF-DWARF ARTIFICER SMITHY
--------------------------------------------------------------------------------
function LobbyInteractionService:SetupZone5Smithy(container: Instance?)
	-- Anvil Trigger
	local anvilTrigger = (container and container:FindFirstChild("Trigger_Zone5_Anvil_Repair"))
		or Workspace:FindFirstChild("Trigger_Zone5_Anvil_Repair", true) :: BasePart?

	if anvilTrigger then
		local prompt = anvilTrigger:FindFirstChildOfClass("ProximityPrompt")
		if prompt then
			prompt.Triggered:Connect(function(player: Player)
				playSoundAt(anvilTrigger, "rbxassetid://9114220194", 0.9)
				showFloatingText(anvilTrigger, "🛡️ ¡Armadura Reparada & Templada (+25% Protección)! 🔨", Color3.fromRGB(255, 190, 80))
			end)
		end
	end

	-- Rings Bench Trigger
	local ringsTrigger = (container and container:FindFirstChild("Trigger_Zone5_Rings_Bench"))
		or Workspace:FindFirstChild("Trigger_Zone5_Rings_Bench", true) :: BasePart?

	if ringsTrigger then
		local prompt = ringsTrigger:FindFirstChildOfClass("ProximityPrompt")
		if prompt then
			prompt.Triggered:Connect(function(player: Player)
				playSoundAt(ringsTrigger, "rbxassetid://9114221528", 0.9)
				showFloatingText(ringsTrigger, "💍 ¡Anillo Encantado: +15% Daño Mágico Arcana!", Color3.fromRGB(255, 140, 220))
			end)
		end
	end

	-- NPC Dialogue Trigger
	local npcTrigger = (container and container:FindFirstChild("Trigger_Zone5_ElfDwarf_NPC"))
		or Workspace:FindFirstChild("Trigger_Zone5_ElfDwarf_NPC", true) :: BasePart?

	if npcTrigger then
		local prompt = npcTrigger:FindFirstChildOfClass("ProximityPrompt")
		if prompt then
			prompt.Triggered:Connect(function(player: Player)
				playSoundAt(npcTrigger, "rbxassetid://9114221804", 0.7)
				local dialogs = {
					"«¡Saludos, joven mago! ¿Traes runas para templar?»",
					"«El fuego de esta fragua proviene del aliento de dragón.»",
					"«¡Mis anillos resisten cualquier maleficio oscuro!»"
				}
				local chosen = dialogs[math.random(1, #dialogs)]
				showFloatingText(npcTrigger, string.format("🧔 Thistlebeard: %s", chosen), Color3.fromRGB(150, 245, 170))
			end)
		end
	end
end

return LobbyInteractionService
