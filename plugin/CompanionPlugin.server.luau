--!strict
--[[
    RAASE 2.0 Companion Plugin for Roblox Studio
    Autonomous Agent Studio Bridge with ChangeHistoryService, Procedural Generation,
    CSGv3, Lighting Presets, and Real-Time Telemetry.
--]]

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local RunService = game:GetService("RunService")
local Selection = game:GetService("Selection")
local Lighting = game:GetService("Lighting")
local Stats = game:GetService("Stats")

local BRIDGE_PORT = 34873
local BRIDGE_BASE_URL = "http://127.0.0.1:" .. tostring(BRIDGE_PORT)
local POLL_URL = BRIDGE_BASE_URL .. "/api/poll"
local REPORT_URL = BRIDGE_BASE_URL .. "/api/report"

-- Plugin State
local isEnabled = true
local isBusy = false

-- Create Plugin UI Toolbar
local toolbar = plugin:CreateToolbar("RAASE 2.0 Bridge")
local toggleButton = toolbar:CreateButton(
	"RAASE_Toggle",
	"Toggle Autonomous Agent Studio Bridge",
	"rbxassetid://15124976727" -- Generic robot/terminal icon
)
toggleButton.ClickableWhenViewportHidden = true

toggleButton.Click:Connect(function()
	isEnabled = not isEnabled
	toggleButton:SetActive(isEnabled)
	print(string.format("[RAASE 2.0] Autonomous Bridge %s", isEnabled and "ACTIVATED" or "PAUSED"))
end)
toggleButton:SetActive(isEnabled)

-- Telemetry Collector
local function getStudioTelemetry(): { memoryMb: number, primitives: number, instances: number }
	local mem = Stats:GetTotalMemoryUsageMb()
	local primitives = Stats.PrimitivesCount
	local totalInstances = #workspace:GetDescendants()
	return {
		memoryMb = math.floor(mem * 10) / 10,
		primitives = primitives,
		instances = totalInstances,
	}
end

-- Post report back to Host Bridge
local function postReport(commandId: string, status: "SUCCESS" | "ERROR", details: { [string]: any }, errMessage: string?)
	local payload = {
		commandId = commandId,
		status = status,
		details = details,
		error = errMessage,
		telemetry = getStudioTelemetry(),
	}

	pcall(function()
		HttpService:PostAsync(
			REPORT_URL,
			HttpService:JSONDecode(HttpService:JSONEncode(payload)),
			Enum.HttpContentType.ApplicationJson
		)
	end)
end

--------------------------------------------------------------------------------
-- ACTUATORS & COMMAND HANDLERS
--------------------------------------------------------------------------------

-- Handler: Spawn Basic Part
local function handleSpawnPart(args: { [string]: any }): { [string]: any }
	local part = Instance.new("Part")
	part.Name = args.name or "RAASE_GeneratedPart"
	
	local size = args.size or { 4, 1, 4 }
	part.Size = Vector3.new(size[1], size[2], size[3])

	local pos = args.position or { 0, 5, 0 }
	part.Position = Vector3.new(pos[1], pos[2], pos[3])

	if args.color then
		part.Color = Color3.fromRGB(args.color[1], args.color[2], args.color[3])
	end

	if args.material then
		local matEnum = (Enum.Material :: any)[args.material]
		if matEnum then
			part.Material = matEnum
		end
	end

	part.Anchored = args.anchored ~= false
	part.CanCollide = args.canCollide ~= false
	part.Parent = workspace

	Selection:Set({ part })
	return { partName = part.Name, position = pos }
end

-- Handler: Create Procedural Island
local function handleCreateIsland(args: { [string]: any }): { [string]: any }
	local islandName = args.name or "ProceduralIsland"
	local biome = args.biome or "Grass" -- Grass, Desert, Ice, Volcanic
	local radius = args.radius or 24
	local centerPos = args.position or { 0, 20, 0 }
	local center = Vector3.new(centerPos[1], centerPos[2], centerPos[3])

	local model = Instance.new("Model")
	model.Name = islandName
	model.Parent = workspace

	-- Biome definitions
	local primaryColor = Color3.fromRGB(76, 153, 0)
	local primaryMaterial = Enum.Material.Grass
	local baseColor = Color3.fromRGB(110, 80, 50)
	local baseMaterial = Enum.Material.Slate

	if biome == "Desert" then
		primaryColor = Color3.fromRGB(220, 190, 130)
		primaryMaterial = Enum.Material.Sand
		baseColor = Color3.fromRGB(180, 140, 90)
		baseMaterial = Enum.Material.Sandstone
	elseif biome == "Ice" then
		primaryColor = Color3.fromRGB(210, 240, 255)
		primaryMaterial = Enum.Material.Ice
		baseColor = Color3.fromRGB(140, 180, 210)
		baseMaterial = Enum.Material.Glacier
	elseif biome == "Volcanic" then
		primaryColor = Color3.fromRGB(30, 30, 30)
		primaryMaterial = Enum.Material.Basalt
		baseColor = Color3.fromRGB(180, 40, 20)
		baseMaterial = Enum.Material.CrackedLava
	end

	-- 1. Main Island Surface Disk
	local topPart = Instance.new("Part")
	topPart.Name = "TopSurface"
	topPart.Shape = Enum.PartType.Cylinder
	topPart.Size = Vector3.new(4, radius * 2, radius * 2)
	topPart.CFrame = CFrame.new(center) * CFrame.Angles(0, 0, math.rad(90))
	topPart.Color = primaryColor
	topPart.Material = primaryMaterial
	topPart.Anchored = true
	topPart.Parent = model

	-- 2. Inverted Conical Base (Modular Blocks)
	local basePart = Instance.new("Part")
	basePart.Name = "UnderBase"
	basePart.Shape = Enum.PartType.Ball
	basePart.Size = Vector3.new(radius * 1.8, radius * 1.2, radius * 1.8)
	basePart.Position = center - Vector3.new(0, radius * 0.4, 0)
	basePart.Color = baseColor
	basePart.Material = baseMaterial
	basePart.Anchored = true
	basePart.Parent = model

	-- 3. Center Checkpoint / Spawn Platform
	local spawnPad = Instance.new("SpawnLocation")
	spawnPad.Name = "SpawnCheckpoint"
	spawnPad.Size = Vector3.new(6, 0.5, 6)
	spawnPad.Position = center + Vector3.new(0, 2.25, 0)
	spawnPad.Color = Color3.fromRGB(255, 255, 255)
	spawnPad.Material = Enum.Material.Neon
	spawnPad.Anchored = true
	spawnPad.Parent = model

	Selection:Set({ model })
	return { island = islandName, biome = biome, radius = radius, center = centerPos }
end

-- Handler: Apply Lighting Preset
local function handleSetLighting(args: { [string]: any }): { [string]: any }
	local preset = args.preset or "VibrantFuture"

	Lighting.Technology = Enum.Technology.Future
	Lighting.Brightness = 2
	Lighting.ClockTime = args.clockTime or 14
	Lighting.GeographicLatitude = 41.733
	Lighting.GlobalShadows = true

	-- Clear prior effects if requested
	for _, child in Lighting:GetChildren() do
		if child:IsA("PostEffect") or child:IsA("Atmosphere") or child:IsA("Sky") then
			child:Destroy()
		end
	end

	-- Atmosphere
	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = 0.3
	atmosphere.Offset = 0.25
	atmosphere.Haze = 0.1
	atmosphere.Color = Color3.fromRGB(199, 210, 220)
	atmosphere.Decay = Color3.fromRGB(106, 120, 140)
	atmosphere.Parent = Lighting

	-- Bloom
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.65
	bloom.Size = 24
	bloom.Threshold = 2
	bloom.Parent = Lighting

	-- ColorCorrection
	local colorCorrection = Instance.new("ColorCorrectionEffect")
	colorCorrection.Brightness = 0.05
	colorCorrection.Contrast = 0.1
	colorCorrection.Saturation = 0.15
	colorCorrection.Parent = Lighting

	-- SunRays
	local sunRays = Instance.new("SunRaysEffect")
	sunRays.Intensity = 0.1
	sunRays.Spread = 0.8
	sunRays.Parent = Lighting

	return { preset = preset, technology = "Future", clockTime = Lighting.ClockTime }
end

-- Handler: Focus Viewport Camera
local function handleFocusCamera(args: { [string]: any }): { [string]: any }
	local targetPos = args.position or { 0, 20, 0 }
	local distance = args.distance or 45
	local pitch = math.rad(args.pitch or -25)
	local yaw = math.rad(args.yaw or 45)

	local cam = workspace.CurrentCamera
	if cam then
		local center = Vector3.new(targetPos[1], targetPos[2], targetPos[3])
		local offset = CFrame.Angles(0, yaw, 0) * CFrame.Angles(pitch, 0, 0) * Vector3.new(0, 0, distance)
		cam.CFrame = CFrame.lookAt(center + offset, center)
	end

	return { cameraPosition = targetPos, distance = distance }
end

--------------------------------------------------------------------------------
-- MAIN EXECUTION DISPATCHER
--------------------------------------------------------------------------------

local function executeCommand(cmd: { id: string, action: string, args: { [string]: any } })
	print(string.format("[RAASE 2.0] Executing Action: %s (ID: %s)", cmd.action, cmd.id))

	local recording = ChangeHistoryService:TryBeginRecording("RAASE_" .. cmd.action)

	local success, result = pcall(function()
		if cmd.action == "SPAWN_PART" then
			return handleSpawnPart(cmd.args)
		elseif cmd.action == "CREATE_ISLAND" then
			return handleCreateIsland(cmd.args)
		elseif cmd.action == "SET_LIGHTING" then
			return handleSetLighting(cmd.args)
		elseif cmd.action == "FOCUS_CAMERA" then
			return handleFocusCamera(cmd.args)
		else
			error(string.format("Unknown action command: %s", cmd.action))
		end
	end)

	if recording then
		if success then
			ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
		else
			ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Cancel)
		end
	end

	if success then
		postReport(cmd.id, "SUCCESS", result :: { [string]: any })
		print(string.format("[RAASE 2.0] Action %s completed successfully.", cmd.action))
	else
		postReport(cmd.id, "ERROR", {}, tostring(result))
		warn(string.format("[RAASE 2.0] Action %s failed: %s", cmd.action, tostring(result)))
	end
end

--------------------------------------------------------------------------------
-- BACKGROUND LONG-POLLING LOOP
--------------------------------------------------------------------------------

task.spawn(function()
	print("[RAASE 2.0] Companion Plugin initialized. Listening to " .. POLL_URL)

	while true do
		task.wait(0.2)

		if isEnabled and not isBusy then
			local pollSuccess, response = pcall(function()
				return HttpService:GetAsync(POLL_URL)
			end)

			if pollSuccess and response and response ~= "" and response ~= "{}" then
				local decodeSuccess, data = pcall(function()
					return HttpService:JSONDecode(response)
				end)

				if decodeSuccess and type(data) == "table" and data.action and data.action ~= "NOOP" then
					isBusy = true
					pcall(executeCommand, data)
					isBusy = false
				end
			end
		end
	end
end)
