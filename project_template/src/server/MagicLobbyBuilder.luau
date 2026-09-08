--!strict
-- MagicLobbyBuilder.luau
-- Lobby Mágico estilo Castillo de Hogwarts / Fantasía Medieval Arcana
-- Versión Refinada: Vegetación rica (césped, piedras bajo árboles), antorchas con punta negra y fuego VFX,
-- bajo neón en general (excepto pociones), dianas reales en maniquís, fuego de forja ardiente,
-- fuente de piedra gótica legible y carteles medievales flotantes discretos.

local Lighting = game:GetService("Lighting")

local MagicLobbyBuilder = {}

-- Paleta refinada: Tonos naturales, maderas nobles, piedra antigua, sin neón estridente
local PALETTE = {
	CobbleFloor = Color3.fromRGB(75, 80, 92),
	StoneTileLight = Color3.fromRGB(115, 122, 138),
	CastleStone = Color3.fromRGB(92, 98, 112),
	TrimStone = Color3.fromRGB(130, 136, 150),
	DarkWood = Color3.fromRGB(65, 42, 28),
	WarmWood = Color3.fromRGB(110, 72, 44),
	LightWood = Color3.fromRGB(160, 115, 75),
	RoofSlate = Color3.fromRGB(48, 56, 75),
	GoldRune = Color3.fromRGB(235, 185, 55),
	RunicBlue = Color3.fromRGB(70, 150, 200),
	PotionPurple = Color3.fromRGB(175, 80, 255),
	PotionGreen = Color3.fromRGB(60, 235, 120),
	PotionRed = Color3.fromRGB(245, 60, 80),
	PotionAmber = Color3.fromRGB(255, 160, 40),
	WarmTorch = Color3.fromRGB(255, 175, 85),
	TorchBlackTip = Color3.fromRGB(24, 24, 26),
	IronDark = Color3.fromRGB(42, 45, 50),
	GrassForest = Color3.fromRGB(52, 90, 44),
	MossDense = Color3.fromRGB(40, 72, 35),
	ForestRock = Color3.fromRGB(90, 95, 105),
	TreeBark = Color3.fromRGB(58, 40, 28),
	TreeNeedles = Color3.fromRGB(36, 62, 40),
	VelvetRed = Color3.fromRGB(155, 32, 42),
	WaterTurquoise = Color3.fromRGB(95, 190, 225),
	DwarfSkin = Color3.fromRGB(245, 200, 165),
	DwarfBeard = Color3.fromRGB(185, 78, 28),
	TargetWhite = Color3.fromRGB(230, 225, 215),
	TargetRed = Color3.fromRGB(180, 35, 35),
	TargetBullseye = Color3.fromRGB(30, 30, 32),
}

local function part(parent: Instance, name: string, size: Vector3, cf: CFrame, color: Color3, mat: Enum.Material?, shape: Enum.PartType?): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	if shape then
		p.Shape = shape
	end
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

-- Cartel flotante medieval sutil y discreto (que no estorbe la vista)
local function createMedievalSign(parent: Instance, title: string, subtitle: string?, offset: Vector3)
	local bb = Instance.new("BillboardGui")
	bb.Name = "ZoneLabel"
	bb.Size = UDim2.new(0, 180, 0, 40)
	bb.StudsOffset = offset or Vector3.new(0, 4.5, 0)
	bb.AlwaysOnTop = true
	bb.MaxDistance = 85
	bb.Parent = parent

	local frame = Instance.new("Frame")
	frame.Size = UDim2.new(1, 0, 1, 0)
	frame.BackgroundColor3 = Color3.fromRGB(25, 22, 20)
	frame.BackgroundTransparency = 0.45
	frame.BorderSizePixel = 0
	frame.Parent = bb

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(180, 150, 90)
	stroke.Thickness = 1.2
	stroke.Transparency = 0.3
	stroke.Parent = frame

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 6)
	corner.Parent = frame

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, -8, subtitle and 0.58 or 1, 0)
	label.Position = UDim2.new(0, 4, 0, 2)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.Antique -- Tipografía medieval clásica
	label.Text = title
	label.TextColor3 = Color3.fromRGB(250, 230, 185)
	label.TextSize = 15
	label.TextStrokeTransparency = 0.4
	label.TextStrokeColor3 = Color3.fromRGB(15, 15, 18)
	label.Parent = frame

	if subtitle then
		local sub = Instance.new("TextLabel")
		sub.Size = UDim2.new(1, -8, 0.4, 0)
		sub.Position = UDim2.new(0, 4, 0.56, 0)
		sub.BackgroundTransparency = 1
		sub.Font = Enum.Font.Antique
		sub.Text = subtitle
		sub.TextColor3 = Color3.fromRGB(180, 175, 160)
		sub.TextSize = 11
		sub.TextStrokeTransparency = 0.5
		sub.TextStrokeColor3 = Color3.fromRGB(15, 15, 18)
		sub.Parent = frame
	end

	return bb
end

-- Antorcha medieval rediseñada: Mango de madera/hierro, punta negra carbonizada y fuego VFX realista
local function createTorchVFX(parent: Instance, cf: CFrame, lightRange: number?, brightness: number?)
	-- 1. Soporte de hierro anclado a la pared o poste
	part(parent, "TorchBracket", Vector3.new(0.6, 0.6, 1.4), cf * CFrame.new(0, -0.4, -0.5), PALETTE.IronDark, Enum.Material.Metal)

	-- 2. Mango de madera oscura
	local handle = part(parent, "TorchHandle", Vector3.new(0.6, 3.2, 0.6), cf * CFrame.Angles(math.rad(15), 0, 0), PALETTE.DarkWood, Enum.Material.Wood)

	-- 3. Aro de hierro reforzado bajo la punta
	part(parent, "TorchIronRing", Vector3.new(0.8, 0.3, 0.8), cf * CFrame.new(0, 1.2, 0.3), PALETTE.IronDark, Enum.Material.Metal)

	-- 4. PUNTA NEGRA CARBONIZADA (de aquí brota el fuego)
	local blackTip = part(parent, "TorchBlackTip", Vector3.new(0.7, 0.9, 0.7), cf * CFrame.new(0, 1.65, 0.4), PALETTE.TorchBlackTip, Enum.Material.Basalt)

	-- 5. Efecto VFX de Fuego Real
	local fire = Instance.new("Fire")
	fire.Color = Color3.fromRGB(255, 160, 45)
	fire.SecondaryColor = Color3.fromRGB(220, 50, 15)
	fire.Size = 3.5
	fire.Heat = 9
	fire.Parent = blackTip

	-- Chispas y pavesas ascendentes
	local embers = Instance.new("ParticleEmitter")
	embers.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 210, 80)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(220, 70, 20))
	})
	embers.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.45), NumberSequenceKeypoint.new(1, 0) })
	embers.LightEmission = 0.95
	embers.Rate = 14
	embers.Speed = NumberRange.new(2.5, 5.5)
	embers.Lifetime = NumberRange.new(0.8, 1.6)
	embers.SpreadAngle = Vector2.new(15, 15)
	embers.Parent = blackTip

	-- Luz cálida y acogedora
	local pl = Instance.new("PointLight")
	pl.Color = PALETTE.WarmTorch
	pl.Range = lightRange or 32
	pl.Brightness = brightness or 2.4
	pl.Shadows = true
	pl.Parent = blackTip

	return blackTip
end

-- Farola de hierro clásica con 2 antorchas
local function createStreetLamp(parent: Instance, cf: CFrame)
	part(parent, "LampPole", Vector3.new(1.2, 13, 1.2), cf * CFrame.new(0, 6.5, 0), PALETTE.IronDark, Enum.Material.Metal)
	part(parent, "LampCrossArm", Vector3.new(6.5, 0.6, 0.6), cf * CFrame.new(0, 12.5, 0), PALETTE.IronDark, Enum.Material.Metal)
	createTorchVFX(parent, cf * CFrame.new(2.8, 12.8, 0))
	createTorchVFX(parent, cf * CFrame.new(-2.8, 12.8, 0))
end

-- Brasero medieval con lecho de carbón y fuego VFX
local function createFireBrazier(parent: Instance, cf: CFrame, isBlue: boolean?)
	part(parent, "BrazierBase", Vector3.new(4, 2, 4), cf * CFrame.new(0, 1, 0), PALETTE.CastleStone, Enum.Material.Cobblestone)
	local bBowl = part(parent, "BrazierBowl", Vector3.new(5.2, 2.2, 5.2), cf * CFrame.new(0, 2.8, 0), PALETTE.IronDark, Enum.Material.Metal, Enum.PartType.Cylinder)
	bBowl.CFrame = cf * CFrame.new(0, 2.8, 0) * CFrame.Angles(0, 0, math.rad(90))

	-- Carbones ardientes negros/ceniza (sin neón cegador)
	local coals = part(parent, "BrazierCoals", Vector3.new(3.8, 0.6, 3.8), cf * CFrame.new(0, 3.7, 0), PALETTE.TorchBlackTip, Enum.Material.Basalt)
	coals.CanCollide = false

	local fire = Instance.new("Fire")
	if isBlue then
		fire.Color = Color3.fromRGB(90, 190, 255)
		fire.SecondaryColor = Color3.fromRGB(40, 70, 210)
	else
		fire.Color = Color3.fromRGB(255, 150, 40)
		fire.SecondaryColor = Color3.fromRGB(210, 50, 15)
	end
	fire.Size = 5.5
	fire.Heat = 12
	fire.Parent = coals

	local pl = Instance.new("PointLight")
	pl.Color = isBlue and Color3.fromRGB(100, 200, 255) or PALETTE.WarmTorch
	pl.Range = 45
	pl.Brightness = 3
	pl.Shadows = true
	pl.Parent = coals
end

-- Iluminación ambiental diurna/dorada nítida y clara (NO oscura)
local function applyAtmosphere()
	pcall(function()
		(Lighting :: any).Technology = Enum.Technology.Future
	end)
	Lighting.ClockTime = 16.5 -- Tarde dorada de Hogwarts con visibilidad cristalina
	Lighting.GeographicLatitude = 35
	Lighting.Brightness = 2.8
	Lighting.OutdoorAmbient = Color3.fromRGB(160, 155, 168)
	Lighting.Ambient = Color3.fromRGB(130, 125, 138)
	Lighting.GlobalShadows = true

	local existingAtm = Lighting:FindFirstChildOfClass("Atmosphere")
	local atm = existingAtm or Instance.new("Atmosphere")
	atm.Density = 0.16
	atm.Offset = 0.25
	atm.Color = Color3.fromRGB(220, 205, 235)
	atm.Decay = Color3.fromRGB(185, 140, 110)
	atm.Glare = 0.25
	atm.Haze = 0.4
	atm.Parent = Lighting

	local existingBloom = Lighting:FindFirstChildOfClass("BloomEffect")
	local bloom = existingBloom or Instance.new("BloomEffect")
	bloom.Intensity = 0.45 -- Reducido para evitar deslumbramientos
	bloom.Size = 18
	bloom.Threshold = 1.3
	bloom.Parent = Lighting

	local existingCc = Lighting:FindFirstChildOfClass("ColorCorrectionEffect")
	local cc = existingCc or Instance.new("ColorCorrectionEffect")
	cc.TintColor = Color3.fromRGB(255, 248, 238)
	cc.Saturation = 0.18
	cc.Contrast = 0.08
	cc.Parent = Lighting
end

-- =========================================================
-- CONSTRUCCIÓN DE LAS SECCIONES PERFECCIONADAS
-- =========================================================

-- 1. PATIO CENTRAL Y FUENTE DE PIEDRA LEGIBLE
local function buildCourtyard(lobby: Model, origin: Vector3)
	part(lobby, "CourtyardFloor", Vector3.new(160, 2, 160), CFrame.new(origin + Vector3.new(0, -1, 0)), PALETTE.CobbleFloor, Enum.Material.Cobblestone)
	part(lobby, "Walkway_NS", Vector3.new(20, 0.4, 140), CFrame.new(origin + Vector3.new(0, 0.2, 0)), PALETTE.StoneTileLight, Enum.Material.Slate)
	part(lobby, "Walkway_EW", Vector3.new(140, 0.4, 20), CFrame.new(origin + Vector3.new(0, 0.2, 0)), PALETTE.StoneTileLight, Enum.Material.Slate)

	-- Plaza circular central de cantería
	part(lobby, "CentralPlaza_Circle", Vector3.new(42, 0.5, 42), CFrame.new(origin + Vector3.new(0, 0.3, 0)) * CFrame.Angles(0, 0, math.rad(90)), PALETTE.TrimStone, Enum.Material.Cobblestone, Enum.PartType.Cylinder)

	-- FUENTE MEDIEVAL DE PIEDRA LABRADA (Sin neón cegador, estética y perfectamente entendible)
	-- Tazón exterior octogonal de piedra antigua
	local fBasin = part(lobby, "Fountain_OuterBasin", Vector3.new(18, 2.4, 18), CFrame.new(origin + Vector3.new(0, 1.2, 0)), PALETTE.CastleStone, Enum.Material.Cobblestone)
	part(lobby, "Fountain_BasinRim", Vector3.new(19.2, 0.8, 19.2), CFrame.new(origin + Vector3.new(0, 2.4, 0)), PALETTE.TrimStone, Enum.Material.Slate)
	
	-- Agua cristalina suave y translúcida
	local water = part(lobby, "Fountain_Water", Vector3.new(16.5, 0.3, 16.5), CFrame.new(origin + Vector3.new(0, 2.1, 0)), PALETTE.WaterTurquoise, Enum.Material.Glass)
	water.Transparency = 0.4

	-- Pilar central de cantería clásica
	part(lobby, "Fountain_PillarBase", Vector3.new(5.5, 3.5, 5.5), CFrame.new(origin + Vector3.new(0, 3.5, 0)), PALETTE.TrimStone, Enum.Material.Cobblestone)
	-- Tazón superior más pequeño
	part(lobby, "Fountain_UpperBowl", Vector3.new(8.5, 1.4, 8.5), CFrame.new(origin + Vector3.new(0, 5.6, 0)), PALETTE.CastleStone, Enum.Material.Slate)
	local upperWater = part(lobby, "Fountain_UpperWater", Vector3.new(7.5, 0.2, 7.5), CFrame.new(origin + Vector3.new(0, 6.2, 0)), PALETTE.WaterTurquoise, Enum.Material.Glass)
	upperWater.Transparency = 0.4

	-- Aguja escultórica ornamental de piedra con gárgolas
	local spire = part(lobby, "Fountain_Spire", Vector3.new(2.8, 5.5, 2.8), CFrame.new(origin + Vector3.new(0, 8.8, 0)), PALETTE.TrimStone, Enum.Material.Slate)

	-- Partículas de agua suaves y elegantes
	local splash = Instance.new("ParticleEmitter")
	splash.Color = ColorSequence.new(Color3.fromRGB(220, 240, 255))
	splash.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 0.2) })
	splash.Rate = 22
	splash.Speed = NumberRange.new(2, 4)
	splash.Lifetime = NumberRange.new(0.8, 1.4)
	splash.SpreadAngle = Vector2.new(30, 30)
	splash.Parent = upperWater

	-- Cartel medieval flotante sutil
	createMedievalSign(spire, "🏰 Plaza del Castillo", "Academia Arcana", Vector3.new(0, 4.5, 0))

	-- 4 Spawns de piedra
	local spawnOffsets = { Vector3.new(16, 0, 0), Vector3.new(-16, 0, 0), Vector3.new(0, 0, 16), Vector3.new(0, 0, -16) }
	for i, sOff in ipairs(spawnOffsets) do
		local sp = Instance.new("SpawnLocation")
		sp.Name = "SpawnPad_" .. i
		sp.Size = Vector3.new(6, 0.4, 6)
		sp.CFrame = CFrame.new(origin + sOff + Vector3.new(0, 0.25, 0))
		sp.Anchored = true
		sp.Material = Enum.Material.Slate
		sp.Color = PALETTE.StoneTileLight
		sp.Duration = 0
		sp.Parent = lobby
	end

	-- 4 Braseros en las esquinas de la plaza
	createFireBrazier(lobby, CFrame.new(origin + Vector3.new(20, 0, 20)))
	createFireBrazier(lobby, CFrame.new(origin + Vector3.new(-20, 0, 20)))
	createFireBrazier(lobby, CFrame.new(origin + Vector3.new(20, 0, -20)))
	createFireBrazier(lobby, CFrame.new(origin + Vector3.new(-20, 0, -20)))

	-- Farolas dobles en los senderos
	createStreetLamp(lobby, CFrame.new(origin + Vector3.new(32, 0, 28)))
	createStreetLamp(lobby, CFrame.new(origin + Vector3.new(-32, 0, 28)))
	createStreetLamp(lobby, CFrame.new(origin + Vector3.new(32, 0, -28)))
	createStreetLamp(lobby, CFrame.new(origin + Vector3.new(-32, 0, -28)))
end

-- 2. PORTAL DE ENTRADA A PARTIDAS / MAZMORRAS (NORTE)
local function buildDungeonPortal(lobby: Model, origin: Vector3)
	local pZ = -64
	part(lobby, "PortalPlaza", Vector3.new(42, 1.5, 32), CFrame.new(origin + Vector3.new(0, 0.75, pZ)), PALETTE.TrimStone, Enum.Material.Cobblestone)
	part(lobby, "PortalCarpet", Vector3.new(10, 0.2, 30), CFrame.new(origin + Vector3.new(0, 1.55, pZ + 1)), PALETTE.VelvetRed, Enum.Material.Fabric)

	for s = 1, 3 do
		part(lobby, "PortalStep_" .. s, Vector3.new(24, 0.8, 3), CFrame.new(origin + Vector3.new(0, s * 0.8, pZ - 4 - s * 2)), PALETTE.CastleStone, Enum.Material.Slate)
	end

	local archZ = pZ - 12
	part(lobby, "GatePillarL", Vector3.new(5, 32, 5), CFrame.new(origin + Vector3.new(-12, 16, archZ)), PALETTE.CastleStone, Enum.Material.Cobblestone)
	part(lobby, "GatePillarR", Vector3.new(5, 32, 5), CFrame.new(origin + Vector3.new(12, 16, archZ)), PALETTE.CastleStone, Enum.Material.Cobblestone)
	local archTop = part(lobby, "GateArchTop", Vector3.new(29, 5, 6), CFrame.new(origin + Vector3.new(0, 32, archZ)), PALETTE.TrimStone, Enum.Material.Slate)

	part(lobby, "SpireL", Vector3.new(6, 12, 6), CFrame.new(origin + Vector3.new(-12, 40, archZ)), PALETTE.RoofSlate, Enum.Material.Slate)
	part(lobby, "SpireR", Vector3.new(6, 12, 6), CFrame.new(origin + Vector3.new(12, 40, archZ)), PALETTE.RoofSlate, Enum.Material.Slate)

	-- Vórtice etéreo con ForceField místico (sin neón plano cegador)
	local vortex = part(lobby, "PortalVortex", Vector3.new(18, 24, 1.5), CFrame.new(origin + Vector3.new(0, 16, archZ)), Color3.fromRGB(45, 35, 75), Enum.Material.ForceField)
	vortex.CanCollide = false

	local pe = Instance.new("ParticleEmitter")
	pe.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(110, 200, 255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(160, 80, 220))
	})
	pe.LightEmission = 0.85
	pe.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.5), NumberSequenceKeypoint.new(1, 0) })
	pe.Rate = 35
	pe.Speed = NumberRange.new(3, 7)
	pe.SpreadAngle = Vector2.new(360, 360)
	pe.Lifetime = NumberRange.new(1.2, 2.0)
	pe.Parent = vortex

	-- Antorchas de pared flanqueando el pórtico
	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(-13, 14, archZ + 3)))
	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(13, 14, archZ + 3)))

	-- Cartel medieval discreto
	createMedievalSign(archTop, "⚔️ Portal de Mazmorras", "Entrar a la Partida", Vector3.new(0, 4.5, 0))
end

-- 3. ZONA DE CRATES / COFRES MÁGICOS (NOROESTE)
local function buildCratesSanctuary(lobby: Model, origin: Vector3)
	local cPos = Vector3.new(-48, 0.75, -46)
	local pad = part(lobby, "CratesPlatform", Vector3.new(28, 1.5, 26), CFrame.new(origin + cPos), PALETTE.TrimStone, Enum.Material.Cobblestone)

	local cratesData = {
		{ name = "Cofre de Aprendiz", body = PALETTE.DarkWood, trim = PALETTE.IronDark, x = -7 },
		{ name = "Cofre de Hechicero", body = Color3.fromRGB(35, 55, 90), trim = PALETTE.RunicBlue, x = 0 },
		{ name = "Cofre del Archimago", body = Color3.fromRGB(85, 25, 40), trim = PALETTE.GoldRune, x = 7 }
	}

	for _, cr in ipairs(cratesData) do
		part(lobby, "Pedestal_" .. cr.name, Vector3.new(5, 2.2, 5), CFrame.new(origin + cPos + Vector3.new(cr.x, 2.1, 0)), PALETTE.CastleStone, Enum.Material.Slate)
		local box = part(lobby, "CrateBody_" .. cr.name, Vector3.new(3.8, 2.8, 2.8), CFrame.new(origin + cPos + Vector3.new(cr.x, 4.5, 0)), cr.body, Enum.Material.WoodPlanks)
		-- Herrajes de metal noble (NO neón)
		part(lobby, "CrateTrim_" .. cr.name, Vector3.new(4, 0.6, 3), CFrame.new(origin + cPos + Vector3.new(cr.x, 4.5, 0)), cr.trim, Enum.Material.Metal)
	end

	-- Brasero con llama azul ceremonial
	createFireBrazier(lobby, CFrame.new(origin + cPos + Vector3.new(0, 0, 8)), true)

	-- Cartel medieval discreto
	createMedievalSign(pad, "🗝️ Santuario de Cofres", "Abrir con Llaves", Vector3.new(0, 8.5, 0))
end

-- 4. BOTICA DE POCIONES (ESTE) - Pociones mantienen Neón vibrante
local function buildPotionShop(lobby: Model, origin: Vector3)
	local pX = 64
	local shopBase = part(lobby, "ShopBase", Vector3.new(34, 1.5, 38), CFrame.new(origin + Vector3.new(pX, 0.75, 0)), PALETTE.TrimStone, Enum.Material.Cobblestone)
	part(lobby, "ShopWallBack", Vector3.new(2, 18, 34), CFrame.new(origin + Vector3.new(pX + 14, 10, 0)), PALETTE.DarkWood, Enum.Material.WoodPlanks)
	part(lobby, "ShopWallSide1", Vector3.new(16, 18, 2), CFrame.new(origin + Vector3.new(pX + 6, 10, 17)), PALETTE.DarkWood, Enum.Material.WoodPlanks)
	part(lobby, "ShopWallSide2", Vector3.new(16, 18, 2), CFrame.new(origin + Vector3.new(pX + 6, 10, -17)), PALETTE.DarkWood, Enum.Material.WoodPlanks)
	part(lobby, "ShopRoof", Vector3.new(20, 1.8, 38), CFrame.new(origin + Vector3.new(pX + 5, 20, 0)), PALETTE.RoofSlate, Enum.Material.WoodPlanks)

	-- Mostrador de alquimia
	local counter = part(lobby, "AlchemyCounter", Vector3.new(3.5, 4, 24), CFrame.new(origin + Vector3.new(pX - 2, 2.7, 0)), PALETTE.WarmWood, Enum.Material.Wood)

	-- Gran caldero humeante de hierro
	part(lobby, "WitchCauldron", Vector3.new(5.5, 4, 5.5), CFrame.new(origin + Vector3.new(pX + 5, 2.8, -6)), PALETTE.IronDark, Enum.Material.Metal, Enum.PartType.Cylinder)
	-- Líquido de poción MÁGICO NEÓN (permitido según instrucción)
	local cLiquid = part(lobby, "PotionLiquid", Vector3.new(4.8, 0.5, 4.8), CFrame.new(origin + Vector3.new(pX + 5, 4.6, -6)), PALETTE.PotionGreen, Enum.Material.Neon, Enum.PartType.Cylinder)
	cLiquid.CFrame = CFrame.new(origin + Vector3.new(pX + 5, 4.6, -6)) * CFrame.Angles(0, 0, math.rad(90))

	local bubbles = Instance.new("ParticleEmitter")
	bubbles.Color = ColorSequence.new(PALETTE.PotionGreen, PALETTE.PotionPurple)
	bubbles.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 2) })
	bubbles.Rate = 16
	bubbles.Speed = NumberRange.new(2, 4)
	bubbles.Lifetime = NumberRange.new(1.4, 2.2)
	bubbles.SpreadAngle = Vector2.new(20, 20)
	bubbles.Parent = cLiquid

	-- Estantes con pociones de colores NEÓN brillantes
	part(lobby, "ShelfFrame", Vector3.new(1.5, 14, 20), CFrame.new(origin + Vector3.new(pX + 12, 9, 4)), PALETTE.WarmWood, Enum.Material.WoodPlanks)
	local potionColors = { PALETTE.PotionRed, PALETTE.PotionGreen, PALETTE.PotionPurple, PALETTE.PotionAmber, PALETTE.RunicBlue }
	for lvl = 1, 3 do
		part(lobby, "ShelfPlank_" .. lvl, Vector3.new(2, 0.4, 18), CFrame.new(origin + Vector3.new(pX + 11.5, 3 + lvl * 3.2, 4)), PALETTE.WarmWood, Enum.Material.Wood)
		for b = -2, 2 do
			local col = potionColors[(math.abs(b + lvl) % #potionColors) + 1]
			part(lobby, "PotionBottle_" .. lvl .. "_" .. b, Vector3.new(0.9, 1.4, 0.9), CFrame.new(origin + Vector3.new(pX + 11.5, 4 + lvl * 3.2, 4 + b * 3)), col, Enum.Material.Neon)
		end
	end

	-- NPC Boticaria / Bruja
	local npcModel = Instance.new("Model")
	npcModel.Name = "PotionWitchNPC"
	part(npcModel, "WitchRobe", Vector3.new(2.6, 4.2, 2.2), CFrame.new(origin + Vector3.new(pX + 5, 3.2, 4)), PALETTE.PotionPurple, Enum.Material.Fabric)
	local wHead = part(npcModel, "WitchHead", Vector3.new(1.8, 1.8, 1.8), CFrame.new(origin + Vector3.new(pX + 5, 6.2, 4)), Color3.fromRGB(245, 210, 185), Enum.Material.SmoothPlastic)
	part(npcModel, "WitchHatRim", Vector3.new(3.8, 0.3, 3.8), CFrame.new(origin + Vector3.new(pX + 5, 7.2, 4)), PALETTE.IronDark, Enum.Material.Fabric)
	part(npcModel, "WitchHatCone", Vector3.new(2, 3, 2), CFrame.new(origin + Vector3.new(pX + 5, 8.7, 4)), PALETTE.IronDark, Enum.Material.Fabric)
	npcModel.Parent = lobby

	-- Antorchas en la entrada de la tienda
	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(pX - 3, 7, 12)))
	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(pX - 3, 7, -12)))

	-- Cartel medieval discreto
	createMedievalSign(counter, "🧪 Botica de Madame Raven", "Elixires & Pociones", Vector3.new(0, 5, 0))
end

-- 5. FORJA ARCANA DE BROKKR (SUR) - Fuego de forja real y brasas ardientes
local function buildArcaneForge(lobby: Model, origin: Vector3)
	local fZ = 64
	local forgeBase = part(lobby, "ForgeBase", Vector3.new(38, 1.5, 34), CFrame.new(origin + Vector3.new(0, 0.75, fZ)), PALETTE.TrimStone, Enum.Material.Cobblestone)

	-- Alto horno de piedra de cantería
	part(lobby, "FurnaceBody", Vector3.new(18, 16, 8), CFrame.new(origin + Vector3.new(0, 9, fZ + 10)), PALETTE.CastleStone, Enum.Material.Cobblestone)
	part(lobby, "FurnaceChimney", Vector3.new(5, 12, 5), CFrame.new(origin + Vector3.new(0, 21, fZ + 10)), PALETTE.CastleStone, Enum.Material.Cobblestone)

	-- FUEGO DE FORJA REAL (Sin neón plano detrás del enano)
	-- Cama de carbón ardiente
	local forgeHearth = part(lobby, "ForgeHearthCoals", Vector3.new(8, 2, 4), CFrame.new(origin + Vector3.new(0, 4, fZ + 6)), PALETTE.TorchBlackTip, Enum.Material.Basalt)
	forgeHearth.CanCollide = false

	local forgeFire = Instance.new("Fire")
	forgeFire.Color = Color3.fromRGB(255, 120, 25)
	forgeFire.SecondaryColor = Color3.fromRGB(240, 40, 10)
	forgeFire.Size = 6
	forgeFire.Heat = 14
	forgeFire.Parent = forgeHearth

	local forgeSparks = Instance.new("ParticleEmitter")
	forgeSparks.Color = ColorSequence.new(Color3.fromRGB(255, 190, 50), Color3.fromRGB(220, 60, 20))
	forgeSparks.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0) })
	forgeSparks.Rate = 26
	forgeSparks.Speed = NumberRange.new(4, 8)
	forgeSparks.Lifetime = NumberRange.new(1, 2)
	forgeSparks.SpreadAngle = Vector2.new(20, 20)
	forgeSparks.Parent = forgeHearth

	local fLight = Instance.new("PointLight")
	fLight.Color = Color3.fromRGB(255, 140, 50)
	fLight.Range = 45
	fLight.Brightness = 3.5
	fLight.Shadows = true
	fLight.Parent = forgeHearth

	-- Yunque de forja de hierro oscuro pulido
	local anvil = part(lobby, "AnvilBase", Vector3.new(4, 1.8, 3), CFrame.new(origin + Vector3.new(0, 1.8, fZ - 3)), PALETTE.IronDark, Enum.Material.Metal)
	part(lobby, "AnvilTop", Vector3.new(5.5, 1.4, 2.6), CFrame.new(origin + Vector3.new(0, 3.4, fZ - 3)), PALETTE.IronDark, Enum.Material.Metal)
	part(lobby, "AnvilHorn", Vector3.new(2.4, 1, 1.6), CFrame.new(origin + Vector3.new(3.5, 3.4, fZ - 3)), PALETTE.IronDark, Enum.Material.Metal)
	-- Runa de metal dorado (NO neón)
	part(lobby, "AnvilRuneMetal", Vector3.new(2.6, 0.1, 1.6), CFrame.new(origin + Vector3.new(0, 4.15, fZ - 3)), PALETTE.GoldRune, Enum.Material.Metal)

	-- Martillo de forja
	part(lobby, "HammerHandle", Vector3.new(0.4, 3, 0.4), CFrame.new(origin + Vector3.new(-1.5, 5.2, fZ - 3)), PALETTE.DarkWood, Enum.Material.Wood)
	part(lobby, "HammerHead", Vector3.new(1.6, 1.2, 1.2), CFrame.new(origin + Vector3.new(-2.2, 6.4, fZ - 3)), PALETTE.IronDark, Enum.Material.Metal)

	-- NPC ENANO HERRERO ("Brokkr el Forjador")
	local dwarfModel = Instance.new("Model")
	dwarfModel.Name = "BlacksmithDwarf"
	part(dwarfModel, "DwarfLegs", Vector3.new(2.2, 1.8, 1.8), CFrame.new(origin + Vector3.new(4, 1.8, fZ - 3)), Color3.fromRGB(50, 42, 34), Enum.Material.Fabric)
	part(dwarfModel, "DwarfTorso", Vector3.new(3, 2.4, 2.2), CFrame.new(origin + Vector3.new(4, 3.8, fZ - 3)), Color3.fromRGB(120, 55, 32), Enum.Material.Fabric)
	part(dwarfModel, "DwarfApron", Vector3.new(2.4, 2.2, 0.3), CFrame.new(origin + Vector3.new(4, 3.7, fZ - 4)), Color3.fromRGB(65, 45, 25), Enum.Material.Fabric)
	local dHead = part(dwarfModel, "DwarfHead", Vector3.new(1.8, 1.8, 1.8), CFrame.new(origin + Vector3.new(4, 5.7, fZ - 3)), PALETTE.DwarfSkin, Enum.Material.SmoothPlastic)
	part(dwarfModel, "DwarfBeard", Vector3.new(2.2, 2, 1.2), CFrame.new(origin + Vector3.new(4, 4.8, fZ - 3.8)), PALETTE.DwarfBeard, Enum.Material.Fabric)
	part(dwarfModel, "DwarfHelmet", Vector3.new(2.2, 1, 2.2), CFrame.new(origin + Vector3.new(4, 6.7, fZ - 3)), PALETTE.IronDark, Enum.Material.Metal)
	dwarfModel.Parent = lobby

	-- Tina de agua y mesa de trabajo
	part(lobby, "WaterTub", Vector3.new(4.2, 2.8, 4.2), CFrame.new(origin + Vector3.new(-7, 2.2, fZ + 2)), PALETTE.DarkWood, Enum.Material.WoodPlanks)
	part(lobby, "TubWater", Vector3.new(3.8, 0.3, 3.8), CFrame.new(origin + Vector3.new(-7, 3.2, fZ + 2)), Color3.fromRGB(70, 150, 210), Enum.Material.Glass)

	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(14, 7, fZ - 5)))
	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(-14, 7, fZ - 5)))

	-- Cartel medieval discreto
	createMedievalSign(anvil, "⚒️ Forja de Brokkr", "Armaduras & Anillos", Vector3.new(0, 5.5, 0))
end

-- 6. CAMPO DE TIRO CON DIANAS REALES (OESTE) - Sin neón en maniquís
local function buildTrainingRange(lobby: Model, origin: Vector3)
	local tX = -64
	local rangeBase = part(lobby, "TrainingBase", Vector3.new(34, 1.5, 42), CFrame.new(origin + Vector3.new(tX, 0.75, 0)), PALETTE.GrassForest, Enum.Material.Grass)
	local rail = part(lobby, "ShootingRail", Vector3.new(2, 3.5, 34), CFrame.new(origin + Vector3.new(tX + 10, 2.6, 0)), PALETTE.DarkWood, Enum.Material.WoodPlanks)

	local dummyZ = { -11, 0, 11 }
	for idx, z in ipairs(dummyZ) do
		local dummy = Instance.new("Model")
		dummy.Name = "SpellDummy_" .. idx

		-- Postes de soporte de madera
		part(dummy, "Post", Vector3.new(0.8, 6.5, 0.8), CFrame.new(origin + Vector3.new(tX - 6, 4, z)), PALETTE.DarkWood, Enum.Material.Wood)
		part(dummy, "Arms", Vector3.new(0.8, 0.8, 4), CFrame.new(origin + Vector3.new(tX - 6, 5.2, z)), PALETTE.DarkWood, Enum.Material.Wood)

		-- Cuerpo y cabeza de saco de tela de arpillera
		part(dummy, "Body", Vector3.new(2.4, 3.6, 1.8), CFrame.new(origin + Vector3.new(tX - 6, 4.8, z)), Color3.fromRGB(190, 165, 115), Enum.Material.Fabric)
		local head = part(dummy, "Head", Vector3.new(1.6, 1.8, 1.6), CFrame.new(origin + Vector3.new(tX - 6, 7.2, z)), Color3.fromRGB(200, 175, 120), Enum.Material.Fabric, Enum.PartType.Ball)

		-- DIANA DE TIRO MEDIEVAL CON ANILLOS CONCÉNTRICOS (Sin Neón)
		-- 1. Base circular de madera
		part(dummy, "TargetWoodBack", Vector3.new(0.2, 2.4, 2.4), CFrame.new(origin + Vector3.new(tX - 4.7, 4.8, z)) * CFrame.Angles(0, 0, math.rad(90)), PALETTE.DarkWood, Enum.Material.WoodPlanks, Enum.PartType.Cylinder)
		-- 2. Anillo exterior blanco
		part(dummy, "TargetRingOuter", Vector3.new(0.25, 2.1, 2.1), CFrame.new(origin + Vector3.new(tX - 4.6, 4.8, z)) * CFrame.Angles(0, 0, math.rad(90)), PALETTE.TargetWhite, Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
		-- 3. Anillo intermedio rojo
		part(dummy, "TargetRingMid", Vector3.new(0.3, 1.4, 1.4), CFrame.new(origin + Vector3.new(tX - 4.5, 4.8, z)) * CFrame.Angles(0, 0, math.rad(90)), PALETTE.TargetRed, Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
		-- 4. Centro (Bullseye) negro
		part(dummy, "TargetBullseye", Vector3.new(0.35, 0.6, 0.6), CFrame.new(origin + Vector3.new(tX - 4.4, 4.8, z)) * CFrame.Angles(0, 0, math.rad(90)), PALETTE.TargetBullseye, Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)

		local hum = Instance.new("Humanoid")
		hum.MaxHealth = 1000
		hum.Health = 1000
		hum.Name = "Humanoid"
		hum.Parent = dummy

		dummy.Parent = lobby
	end

	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(tX + 11, 6.5, 14)))
	createTorchVFX(lobby, CFrame.new(origin + Vector3.new(tX + 11, 6.5, -14)))

	-- Cartel medieval discreto
	createMedievalSign(rail, "🎯 Campo de Pruebas", "Dianas de Hechizos", Vector3.new(0, 4.5, 0))
end

-- 7. BOSQUE ENCANTADO CON VEGETACIÓN RICA (Césped orgánico, rocas y piedras bajo los árboles)
local function buildEnchantedForest(lobby: Model, origin: Vector3)
	local function createPineWithDetails(cf: CFrame, scale: number)
		local basePos = cf.Position

		-- 1. Parche orgánico de césped elevado y musgo bajo el árbol
		part(lobby, "TreeGrassMound", Vector3.new(14 * scale, 0.6, 14 * scale), CFrame.new(basePos + Vector3.new(0, 0.2, 0)), PALETTE.GrassForest, Enum.Material.Grass)
		part(lobby, "TreeMossPatch", Vector3.new(9 * scale, 0.4, 9 * scale), CFrame.new(basePos + Vector3.new(1 * scale, 0.5, -1 * scale)), PALETTE.MossDense, Enum.Material.Grass)

		-- 2. Rocas y piedras naturales esparcidas bajo el árbol
		part(lobby, "Rock_Large", Vector3.new(3.2 * scale, 1.8 * scale, 2.6 * scale), CFrame.new(basePos + Vector3.new(4 * scale, 0.8 * scale, 3 * scale)) * CFrame.Angles(math.rad(15), math.rad(30), 0), PALETTE.ForestRock, Enum.Material.Slate)
		part(lobby, "Rock_Small1", Vector3.new(1.8 * scale, 1.2 * scale, 1.6 * scale), CFrame.new(basePos + Vector3.new(-3.5 * scale, 0.6 * scale, 3.5 * scale)) * CFrame.Angles(0, math.rad(45), math.rad(20)), PALETTE.ForestRock, Enum.Material.Cobblestone)
		part(lobby, "Rock_Small2", Vector3.new(1.4 * scale, 0.9 * scale, 1.4 * scale), CFrame.new(basePos + Vector3.new(2.5 * scale, 0.45 * scale, -4 * scale)), PALETTE.TrimStone, Enum.Material.Slate)

		-- 3. Tronco robusto de pino nórdico
		part(lobby, "PineTrunk", Vector3.new(2.2 * scale, 13 * scale, 2.2 * scale), cf * CFrame.new(0, 6.5 * scale, 0), PALETTE.TreeBark, Enum.Material.Wood)

		-- 4. Tres capas de agujas cónicas tupidas
		part(lobby, "PineNeedles1", Vector3.new(12 * scale, 4.5 * scale, 12 * scale), cf * CFrame.new(0, 10 * scale, 0), PALETTE.TreeNeedles, Enum.Material.Grass)
		part(lobby, "PineNeedles2", Vector3.new(9 * scale, 4 * scale, 9 * scale), cf * CFrame.new(0, 13.5 * scale, 0), PALETTE.TreeNeedles, Enum.Material.Grass)
		part(lobby, "PineNeedles3", Vector3.new(5.5 * scale, 3.5 * scale, 5.5 * scale), cf * CFrame.new(0, 16.5 * scale, 0), PALETTE.TreeNeedles, Enum.Material.Grass)
	end

	local treeLocations = {
		Vector3.new(46, 0, -46), Vector3.new(56, 0, -48), Vector3.new(42, 0, -58), Vector3.new(62, 0, -36),
		Vector3.new(-42, 0, -42), Vector3.new(-56, 0, -36), Vector3.new(-36, 0, -56), Vector3.new(-60, 0, -56),
		Vector3.new(46, 0, 46), Vector3.new(58, 0, 40), Vector3.new(42, 0, 56), Vector3.new(60, 0, 52),
		Vector3.new(-46, 0, 46), Vector3.new(-56, 0, 40), Vector3.new(-42, 0, 56), Vector3.new(-60, 0, 52),
	}

	for i, pos in ipairs(treeLocations) do
		local s = 0.85 + (i % 3) * 0.18
		createPineWithDetails(CFrame.new(origin + pos), s)
	end
end

-- 8. GRANDES MURALLAS Y 4 TORRES CON ANTORCHAS Y BRASEROS
local function buildCastleWalls(lobby: Model, origin: Vector3)
	local R = 78
	local H = 18

	part(lobby, "CastleWall_N", Vector3.new(156, H, 3), CFrame.new(origin + Vector3.new(0, H / 2, -R)), PALETTE.CastleStone, Enum.Material.Cobblestone)
	part(lobby, "CastleWall_S", Vector3.new(156, H, 3), CFrame.new(origin + Vector3.new(0, H / 2, R)), PALETTE.CastleStone, Enum.Material.Cobblestone)
	part(lobby, "CastleWall_E", Vector3.new(3, H, 156), CFrame.new(origin + Vector3.new(R, H / 2, 0)), PALETTE.CastleStone, Enum.Material.Cobblestone)
	part(lobby, "CastleWall_W", Vector3.new(3, H, 156), CFrame.new(origin + Vector3.new(-R, H / 2, 0)), PALETTE.CastleStone, Enum.Material.Cobblestone)

	-- Parapetos / almenas superiores
	part(lobby, "Parapet_N", Vector3.new(156, 2.5, 4), CFrame.new(origin + Vector3.new(0, H + 1.25, -R)), PALETTE.TrimStone, Enum.Material.Slate)
	part(lobby, "Parapet_S", Vector3.new(156, 2.5, 4), CFrame.new(origin + Vector3.new(0, H + 1.25, R)), PALETTE.TrimStone, Enum.Material.Slate)
	part(lobby, "Parapet_E", Vector3.new(4, 2.5, 156), CFrame.new(origin + Vector3.new(R, H + 1.25, 0)), PALETTE.TrimStone, Enum.Material.Slate)
	part(lobby, "Parapet_W", Vector3.new(4, 2.5, 156), CFrame.new(origin + Vector3.new(-R, H + 1.25, 0)), PALETTE.TrimStone, Enum.Material.Slate)

	-- 4 Torres cilíndricas en las esquinas con tejado de pizarra y braseros
	local corners = {
		Vector3.new(R, 0, -R), Vector3.new(-R, 0, -R), Vector3.new(R, 0, R), Vector3.new(-R, 0, R)
	}
	for idx, c in ipairs(corners) do
		part(lobby, "TowerBody_" .. idx, Vector3.new(12, 32, 12), CFrame.new(origin + c + Vector3.new(0, 16, 0)), PALETTE.CastleStone, Enum.Material.Cobblestone)
		part(lobby, "TowerBattlement_" .. idx, Vector3.new(14, 3, 14), CFrame.new(origin + c + Vector3.new(0, 33, 0)), PALETTE.TrimStone, Enum.Material.Slate)
		part(lobby, "TowerRoof_" .. idx, Vector3.new(15, 12, 15), CFrame.new(origin + c + Vector3.new(0, 40, 0)), PALETTE.RoofSlate, Enum.Material.Slate)
		createFireBrazier(lobby, CFrame.new(origin + c + Vector3.new(0, 47, 0)), false)
	end
end

-- =========================================================
-- FUNCIÓN PRINCIPAL DE CONSTRUCCIÓN & LIMPIEZA
-- =========================================================
function MagicLobbyBuilder.Build(centerPosition: Vector3?)
	local origin = centerPosition or Vector3.new(0, 5, 0)

	-- 1. Limpieza de cualquier instancia previa o partes sueltas anteriores
	local oldLobby = workspace:FindFirstChild("MagicLobby")
	if oldLobby then
		oldLobby:Destroy()
	end

	-- Limpieza de partes huérfanas en workspace
	for _, child in workspace:GetChildren() do
		if child.Name:match("^Lobby_") or child.Name:match("^Fountain_") or child.Name:match("^Portal_")
			or child.Name:match("^Crates_") or child.Name:match("^Shop_") or child.Name:match("^Forge_")
			or child.Name:match("^Training_") or child.Name:match("^Pine_") or child.Name:match("^CastleWall_")
			or child.Name:match("^Parapet_") or child.Name:match("^Tower_") or child.Name:match("^Dummy_")
			or child.Name:match("^Brazier") or child.Name:match("^StreetLamp") or child.Name:match("^ParkBench")
			or child.Name:match("^Guardian_") or child.Name:match("^Pedestal_") or child.Name:match("^Crate")
			or child.Name:match("^Potion") or child.Name:match("^NPC_") or child.Name:match("^PlayerSpawn")
			or child.Name == "CuadroDelMedio" or child.Name:match("^Test%d") or child.Name:match("^Rock_")
			or child.Name:match("^Tree") then
			child:Destroy()
		end
	end

	-- 2. Creación del Modelo agrupado
	local lobby = Instance.new("Model")
	lobby.Name = "MagicLobby"

	-- 3. Construcción de todas las áreas perfeccionadas
	buildCourtyard(lobby, origin)
	buildDungeonPortal(lobby, origin)
	buildCratesSanctuary(lobby, origin)
	buildPotionShop(lobby, origin)
	buildArcaneForge(lobby, origin)
	buildTrainingRange(lobby, origin)
	buildEnchantedForest(lobby, origin)
	buildCastleWalls(lobby, origin)

	lobby.Parent = workspace
	applyAtmosphere()

	print("✨ ¡Lobby Mágico perfeccionado construido con éxito! (Vegetación rica, antorchas VFX, dianas reales, forja ardiente, fuente limpia y carteles sutiles) ✨")
	return lobby
end

return MagicLobbyBuilder
