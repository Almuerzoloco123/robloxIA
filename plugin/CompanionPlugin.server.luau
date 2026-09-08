--!strict
--[[
    RAASE 2.1 Companion Plugin for Roblox Studio
    Autonomous Agent Studio Bridge with Bi-directional Scene Graph Introspection,
    AABB Spatial Checking, DockWidget Status Panel, Safe Type Serialization,
    and Atomic Batch Spawning.
--]]

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local RunService = game:GetService("RunService")
local Selection = game:GetService("Selection")
local Lighting = game:GetService("Lighting")
local Stats = game:GetService("Stats")
local CollectionService = game:GetService("CollectionService")

local BRIDGE_PORT = 34873
local BRIDGE_BASE_URL = "http://127.0.0.1:" .. tostring(BRIDGE_PORT)
local POLL_URL = BRIDGE_BASE_URL .. "/api/poll"
local REPORT_URL = BRIDGE_BASE_URL .. "/api/report"

-- Plugin State
local isEnabled = true
local isBusy = false
local connectionStatus: "ONLINE" | "BUSY" | "PAUSED" | "OFFLINE" = "OFFLINE"
local lastError: string? = nil
local commandCount = 0
local recentLogs: { string } = {}

--------------------------------------------------------------------------------
-- SAFE LUAU TYPE SERIALIZATION
--------------------------------------------------------------------------------

local function serializeValue(val: any): any
	local valType = typeof(val)
	if valType == "Vector3" then
		return { math.floor(val.X * 100) / 100, math.floor(val.Y * 100) / 100, math.floor(val.Z * 100) / 100 }
	elseif valType == "CFrame" then
		local pos = val.Position
		local look = val.LookVector
		return {
			position = { math.floor(pos.X * 100) / 100, math.floor(pos.Y * 100) / 100, math.floor(pos.Z * 100) / 100 },
			lookVector = { math.floor(look.X * 100) / 100, math.floor(look.Y * 100) / 100, math.floor(look.Z * 100) / 100 }
		}
	elseif valType == "Color3" then
		return { math.floor(val.R * 255), math.floor(val.G * 255), math.floor(val.B * 255) }
	elseif valType == "EnumItem" then
		return tostring(val.Name)
	elseif valType == "Instance" then
		return { name = val.Name, className = val.ClassName }
	elseif valType == "table" then
		local cleanTable = {}
		for k, v in pairs(val) do
			if typeof(k) == "string" or typeof(k) == "number" then
				cleanTable[k] = serializeValue(v)
			end
		end
		return cleanTable
	elseif valType == "number" or valType == "string" or valType == "boolean" then
		return val
	else
		return tostring(val)
	end
end

--------------------------------------------------------------------------------
-- TELEMETRY COLLECTOR
--------------------------------------------------------------------------------

local function getStudioTelemetry(): { memoryMb: number, primitives: number, instances: number, selectionCount: number }
	local mem = Stats:GetTotalMemoryUsageMb()
	local primitives = Stats.PrimitivesCount
	local totalInstances = #workspace:GetDescendants()
	local sel = #Selection:Get()
	return {
		memoryMb = math.floor(mem * 10) / 10,
		primitives = primitives,
		instances = totalInstances,
		selectionCount = sel,
	}
end

--------------------------------------------------------------------------------
-- LOGGING & DOCKWIDGET UI
--------------------------------------------------------------------------------

local statusGui: DockWidgetPluginGui? = nil
local statusIndicatorLabel: TextLabel? = nil
local telemetryLabel: TextLabel? = nil
local logScrollFrame: ScrollingFrame? = nil

local function addLog(msg: string)
	local timestamp = os.date("%H:%M:%S")
	local entry = string.format("[%s] %s", timestamp, msg)
	table.insert(recentLogs, 1, entry)
	if #recentLogs > 25 then
		table.remove(recentLogs)
	end

	if logScrollFrame then
		for _, child in ipairs(logScrollFrame:GetChildren()) do
			if child:IsA("TextLabel") then
				child:Destroy()
			end
		end

		for i, logText in ipairs(recentLogs) do
			local line = Instance.new("TextLabel")
			line.Size = UDim2.new(1, -8, 0, 18)
			line.Position = UDim2.new(0, 4, 0, (i - 1) * 20)
			line.BackgroundTransparency = 1
			line.Text = logText
			line.TextColor3 = Color3.fromRGB(200, 215, 230)
			line.TextSize = 11
			line.Font = Enum.Font.Code
			line.TextXAlignment = Enum.TextXAlignment.Left
			line.Parent = logScrollFrame
		end
		logScrollFrame.CanvasSize = UDim2.new(0, 0, 0, #recentLogs * 20 + 10)
	end
end

local function updateStatusUI()
	if not statusIndicatorLabel or not telemetryLabel then return end

	local telem = getStudioTelemetry()
	telemetryLabel.Text = string.format(
		"Memory: %.1f MB  |  Instances: %d  |  Prims: %d  |  Cmds: %d",
		telem.memoryMb, telem.instances, telem.primitives, commandCount
	)

	if not isEnabled then
		connectionStatus = "PAUSED"
		statusIndicatorLabel.Text = "🟡 PAUSED (Click to Activate)"
		statusIndicatorLabel.BackgroundColor3 = Color3.fromRGB(80, 70, 20)
		statusIndicatorLabel.TextColor3 = Color3.fromRGB(255, 220, 90)
	elseif isBusy then
		connectionStatus = "BUSY"
		statusIndicatorLabel.Text = "🟣 BUSY (Executing Actuator)"
		statusIndicatorLabel.BackgroundColor3 = Color3.fromRGB(60, 25, 80)
		statusIndicatorLabel.TextColor3 = Color3.fromRGB(220, 150, 255)
	elseif connectionStatus == "ONLINE" then
		statusIndicatorLabel.Text = string.format("🟢 ONLINE (Port %d)", BRIDGE_PORT)
		statusIndicatorLabel.BackgroundColor3 = Color3.fromRGB(20, 70, 35)
		statusIndicatorLabel.TextColor3 = Color3.fromRGB(110, 255, 150)
	else
		statusIndicatorLabel.Text = "🔴 OFFLINE (Bridge Disconnected)"
		statusIndicatorLabel.BackgroundColor3 = Color3.fromRGB(80, 25, 25)
		statusIndicatorLabel.TextColor3 = Color3.fromRGB(255, 110, 110)
	end
end

local function createDockWidget()
	local widgetInfo = DockWidgetPluginGuiInfo.new(
		Enum.InitialDockState.Right,
		false,
		false,
		320,
		420,
		240,
		300
	)
	local widget = plugin:CreateDockWidgetPluginGui("RAASE_Companion_Panel", widgetInfo)
	widget.Title = "RAASE 2.1 — Autonomous Studio Engine"
	statusGui = widget

	local root = Instance.new("Frame")
	root.Size = UDim2.new(1, 0, 1, 0)
	root.BackgroundColor3 = Color3.fromRGB(28, 30, 36)
	root.BorderSizePixel = 0
	root.Parent = widget

	-- Header Title
	local header = Instance.new("TextLabel")
	header.Size = UDim2.new(1, -16, 0, 28)
	header.Position = UDim2.new(0, 8, 0, 8)
	header.BackgroundTransparency = 1
	header.Text = "🤖 RAASE 2.1 Companion Bridge"
	header.TextColor3 = Color3.fromRGB(240, 245, 255)
	header.TextSize = 14
	header.Font = Enum.Font.GothamBold
	header.TextXAlignment = Enum.TextXAlignment.Left
	header.Parent = root

	-- Status Badge
	local statusBadge = Instance.new("TextLabel")
	statusBadge.Size = UDim2.new(1, -16, 0, 32)
	statusBadge.Position = UDim2.new(0, 8, 0, 40)
	statusBadge.BackgroundColor3 = Color3.fromRGB(40, 42, 50)
	statusBadge.Text = "🔴 INITIALIZING..."
	statusBadge.TextColor3 = Color3.fromRGB(200, 200, 200)
	statusBadge.TextSize = 13
	statusBadge.Font = Enum.Font.GothamMedium
	statusBadge.BorderSizePixel = 0
	statusBadge.Parent = root
	statusIndicatorLabel = statusBadge

	-- Toggle Click on Status Badge
	local toggleBtn = Instance.new("TextButton")
	toggleBtn.Size = UDim2.new(1, 0, 1, 0)
	toggleBtn.BackgroundTransparency = 1
	toggleBtn.Text = ""
	toggleBtn.Parent = statusBadge
	toggleBtn.MouseButton1Click:Connect(function()
		isEnabled = not isEnabled
		updateStatusUI()
		addLog(isEnabled and "Bridge RESUMED" or "Bridge PAUSED by user")
	end)

	-- Telemetry Bar
	local telem = Instance.new("TextLabel")
	telem.Size = UDim2.new(1, -16, 0, 22)
	telem.Position = UDim2.new(0, 8, 0, 78)
	telem.BackgroundColor3 = Color3.fromRGB(35, 38, 46)
	telem.BorderSizePixel = 0
	telem.Text = "Loading telemetry..."
	telem.TextColor3 = Color3.fromRGB(170, 185, 205)
	telem.TextSize = 10
	telem.Font = Enum.Font.Gotham
	telem.Parent = root
	telemetryLabel = telem

	-- Action Controls Row
	local actionsFrame = Instance.new("Frame")
	actionsFrame.Size = UDim2.new(1, -16, 0, 28)
	actionsFrame.Position = UDim2.new(0, 8, 0, 106)
	actionsFrame.BackgroundTransparency = 1
	actionsFrame.Parent = root

	local btnWipe = Instance.new("TextButton")
	btnWipe.Size = UDim2.new(0.5, -4, 1, 0)
	btnWipe.Position = UDim2.new(0, 0, 0, 0)
	btnWipe.BackgroundColor3 = Color3.fromRGB(90, 35, 40)
	btnWipe.BorderSizePixel = 0
	btnWipe.Text = "🧹 Clear Props"
	btnWipe.TextColor3 = Color3.fromRGB(255, 180, 180)
	btnWipe.TextSize = 11
	btnWipe.Font = Enum.Font.GothamBold
	btnWipe.Parent = actionsFrame
	btnWipe.MouseButton1Click:Connect(function()
		local count = 0
		for _, m in ipairs(workspace:GetChildren()) do
			if m:IsA("Model") and (m.Name == "MagicLobby" or m.Name:match("^RAASE_")) then
				m:Destroy()
				count += 1
			end
		end
		addLog(string.format("Cleared %d generated models", count))
		updateStatusUI()
	end)

	local btnPing = Instance.new("TextButton")
	btnPing.Size = UDim2.new(0.5, -4, 1, 0)
	btnPing.Position = UDim2.new(0.5, 4, 0, 0)
	btnPing.BackgroundColor3 = Color3.fromRGB(45, 65, 95)
	btnPing.BorderSizePixel = 0
	btnPing.Text = "📡 Ping Bridge"
	btnPing.TextColor3 = Color3.fromRGB(180, 215, 255)
	btnPing.TextSize = 11
	btnPing.Font = Enum.Font.GothamBold
	btnPing.Parent = actionsFrame
	btnPing.MouseButton1Click:Connect(function()
		task.spawn(function()
			local ok, res = pcall(function()
				return HttpService:GetAsync(BRIDGE_BASE_URL .. "/api/status", true)
			end)
			if ok then
				connectionStatus = "ONLINE"
				addLog("Bridge alive: " .. string.sub(res, 1, 35))
			else
				connectionStatus = "OFFLINE"
				addLog("Bridge ping failed: " .. tostring(res))
			end
			updateStatusUI()
		end)
	end)

	-- Live Log Section Header
	local logHeader = Instance.new("TextLabel")
	logHeader.Size = UDim2.new(1, -16, 0, 20)
	logHeader.Position = UDim2.new(0, 8, 0, 140)
	logHeader.BackgroundTransparency = 1
	logHeader.Text = "ACTIVITY STREAM:"
	logHeader.TextColor3 = Color3.fromRGB(140, 155, 175)
	logHeader.TextSize = 11
	logHeader.Font = Enum.Font.GothamBold
	logHeader.TextXAlignment = Enum.TextXAlignment.Left
	logHeader.Parent = root

	-- Scrollable Log Frame
	local scroll = Instance.new("ScrollingFrame")
	scroll.Size = UDim2.new(1, -16, 1, -168)
	scroll.Position = UDim2.new(0, 8, 0, 162)
	scroll.BackgroundColor3 = Color3.fromRGB(20, 22, 26)
	scroll.BorderSizePixel = 0
	scroll.ScrollBarThickness = 4
	scroll.CanvasSize = UDim2.new(0, 0, 0, 0)
	scroll.Parent = root
	logScrollFrame = scroll

	addLog("RAASE 2.1 Companion Plugin loaded.")
	updateStatusUI()
end

-- Toolbar Button
local toolbar = plugin:CreateToolbar("RAASE 2.1 Engine")
local ribbonButton = toolbar:CreateButton(
	"RAASE_Panel",
	"Open RAASE Autonomous Studio Engine Panel",
	"rbxassetid://15124976727"
)
ribbonButton.ClickableWhenViewportHidden = true
ribbonButton.Click:Connect(function()
	if statusGui then
		statusGui.Enabled = not statusGui.Enabled
		ribbonButton:SetActive(statusGui.Enabled)
	end
end)

createDockWidget()

-- Post report back to Host Bridge
local function postReport(commandId: string, status: "SUCCESS" | "ERROR", details: { [string]: any }, errMessage: string?)
	local sanitizedDetails = serializeValue(details)
	local payload = {
		commandId = commandId,
		status = status,
		details = sanitizedDetails,
		error = errMessage,
		telemetry = getStudioTelemetry(),
	}

	local success, err = pcall(function()
		HttpService:PostAsync(
			REPORT_URL,
			HttpService:JSONEncode(payload),
			Enum.HttpContentType.ApplicationJson
		)
	end)
	if not success then
		warn(string.format("[RAASE 2.1] Failed to post execution report: %s", tostring(err)))
	end
end

--------------------------------------------------------------------------------
-- ACTUATORS: SCENE GRAPH & INTROSPECTION
--------------------------------------------------------------------------------

local function resolveInstance(targetPath: string): Instance?
	if targetPath == "workspace" or targetPath == "Workspace" then
		return workspace
	end

	local cleanPath = targetPath:gsub("^workspace%.", ""):gsub("^Workspace%.", "")
	local parts = string.split(cleanPath, ".")
	local current: Instance? = workspace

	for _, name in ipairs(parts) do
		if not current then return nil end
		current = current:FindFirstChild(name)
	end
	return current
end

-- Handler: GET_SCENE_GRAPH
local function handleGetSceneGraph(args: { [string]: any }): { [string]: any }
	local rootName = args.rootPath or "workspace"
	local rootInst = resolveInstance(rootName) or workspace
	local maxDepth = math.clamp(args.maxDepth or 2, 1, 4)
	local limit = math.clamp(args.limit or 150, 1, 300)
	local count = 0

	local function traverse(inst: Instance, currentDepth: number): { [string]: any }?
		if count >= limit then return nil end
		count += 1

		local node: { [string]: any } = {
			name = inst.Name,
			className = inst.ClassName,
			path = inst:GetFullName(),
		}

		if inst:IsA("BasePart") then
			node.size = serializeValue(inst.Size)
			node.position = serializeValue(inst.Position)
			node.material = inst.Material.Name
			node.color = serializeValue(inst.Color)
			node.anchored = inst.Anchored
			node.canCollide = inst.CanCollide
		elseif inst:IsA("Model") then
			local cf, sz = inst:GetBoundingBox()
			node.cframe = serializeValue(cf)
			node.boundingBoxSize = serializeValue(sz)
			node.primaryPart = inst.PrimaryPart and inst.PrimaryPart.Name or nil
		end

		local childrenList = {}
		if currentDepth < maxDepth then
			for _, child in ipairs(inst:GetChildren()) do
				if count >= limit then break end
				if child ~= workspace.Terrain then
					local childNode = traverse(child, currentDepth + 1)
					if childNode then
						table.insert(childrenList, childNode)
					end
				end
			end
		end
		node.children = childrenList
		node.childrenCount = #inst:GetChildren()

		return node
	end

	local tree = traverse(rootInst, 0)
	return {
		root = rootName,
		scannedInstances = count,
		limitReached = count >= limit,
		sceneGraph = tree,
	}
end

-- Handler: INSPECT_OBJECT
local function handleInspectObject(args: { [string]: any }): { [string]: any }
	local path = args.targetPath
	if not path then error("Missing targetPath for INSPECT_OBJECT") end

	local inst = resolveInstance(path) or workspace:FindFirstChild(path, true)
	if not inst then
		error(string.format("Instance not found for path: %s", tostring(path)))
	end

	local info: { [string]: any } = {
		name = inst.Name,
		className = inst.ClassName,
		fullName = inst:GetFullName(),
		parent = inst.Parent and inst.Parent.Name or "None",
		childrenCount = #inst:GetChildren(),
		tags = CollectionService:GetTags(inst),
		attributes = serializeValue(inst:GetAttributes()),
	}

	if inst:IsA("BasePart") then
		info.size = serializeValue(inst.Size)
		info.cframe = serializeValue(inst.CFrame)
		info.position = serializeValue(inst.Position)
		info.color = serializeValue(inst.Color)
		info.material = inst.Material.Name
		info.transparency = inst.Transparency
		info.reflectance = inst.Reflectance
		info.anchored = inst.Anchored
		info.canCollide = inst.CanCollide
		info.mass = inst.Mass
	elseif inst:IsA("Model") then
		local cf, sz = inst:GetBoundingBox()
		info.boundingBoxCFrame = serializeValue(cf)
		info.boundingBoxSize = serializeValue(sz)
		info.primaryPart = inst.PrimaryPart and inst.PrimaryPart.Name or nil
	end

	local childNames = {}
	for i, c in ipairs(inst:GetChildren()) do
		if i <= 30 then
			table.insert(childNames, string.format("%s (%s)", c.Name, c.ClassName))
		end
	end
	info.sampleChildren = childNames

	return info
end

-- Handler: MODIFY_OBJECT
local function handleModifyObject(args: { [string]: any }): { [string]: any }
	local path = args.targetPath
	if not path then error("Missing targetPath for MODIFY_OBJECT") end

	local inst = resolveInstance(path) or workspace:FindFirstChild(path, true)
	if not inst then
		error(string.format("Instance not found: %s", tostring(path)))
	end

	local props = args.properties or {}
	local modified: { string } = {}

	for propName, propValue in pairs(props) do
		local success, err = pcall(function()
			if propName == "Color" and type(propValue) == "table" then
				(inst :: any).Color = Color3.fromRGB(propValue[1], propValue[2], propValue[3])
			elseif propName == "Size" and type(propValue) == "table" then
				(inst :: any).Size = Vector3.new(propValue[1], propValue[2], propValue[3])
			elseif propName == "Position" and type(propValue) == "table" then
				(inst :: any).Position = Vector3.new(propValue[1], propValue[2], propValue[3])
			elseif propName == "Material" and type(propValue) == "string" then
				local matEnum = (Enum.Material :: any)[propValue]
				if matEnum then
					(inst :: any).Material = matEnum
				end
			elseif propName == "CFrame" and type(propValue) == "table" then
				if propValue.position then
					local p = propValue.position
					(inst :: any).CFrame = CFrame.new(p[1], p[2], p[3])
				end
			else
				(inst :: any)[propName] = propValue
			end
			table.insert(modified, propName)
		end)
		if not success then
			warn(string.format("Failed to modify property %s on %s: %s", propName, inst.Name, tostring(err)))
		end
	end

	return {
		target = inst.Name,
		modifiedProperties = modified,
	}
end

-- Handler: DELETE_OBJECT
local function handleDeleteObject(args: { [string]: any }): { [string]: any }
	local path = args.targetPath
	if not path then error("Missing targetPath for DELETE_OBJECT") end

	local inst = resolveInstance(path) or workspace:FindFirstChild(path, true)
	if not inst then
		return { deleted = false, reason = "Instance not found (already destroyed)" }
	end

	local name = inst.Name
	local parent = inst.Parent and inst.Parent.Name or "nil"
	inst:Destroy()

	return { deleted = true, targetName = name, formerParent = parent }
end

-- Handler: CLEAR_ZONE
local function handleClearZone(args: { [string]: any }): { [string]: any }
	local zone = args.zoneAABB or { center = { 0, 10, 0 }, size = { 100, 50, 100 } }
	local center = Vector3.new(zone.center[1], zone.center[2], zone.center[3])
	local size = Vector3.new(zone.size[1], zone.size[2], zone.size[3])

	local filterModelName = args.filterModel
	local preserveClasses = { Terrain = true, SpawnLocation = true, Camera = true }

	local destroyedCount = 0
	local overlapParams = OverlapParams.new()
	overlapParams.FilterType = Enum.RaycastFilterType.Exclude
	overlapParams.FilterDescendantsInstances = { workspace.Terrain }

	local partsInZone = workspace:GetPartBoundsInBox(CFrame.new(center), size, overlapParams)

	for _, part in ipairs(partsInZone) do
		if not preserveClasses[part.ClassName] then
			if not filterModelName or part:IsDescendantOf(workspace:FindFirstChild(filterModelName) or workspace) then
				part:Destroy()
				destroyedCount += 1
			end
		end
	end

	return { clearedParts = destroyedCount, zoneCenter = zone.center, zoneSize = zone.size }
end

-- Handler: BATCH_SPAWN
local function handleBatchSpawn(args: { [string]: any }): { [string]: any }
	local parentName = args.parent or "workspace"
	local parentInst = resolveInstance(parentName) or workspace

	local modelName = args.modelName
	local container: Instance = parentInst

	if modelName then
		local existing = parentInst:FindFirstChild(modelName)
		if existing and existing:IsA("Model") then
			container = existing
		else
			local newModel = Instance.new("Model")
			newModel.Name = modelName
			newModel.Parent = parentInst
			container = newModel
		end
	end

	local instancesData = args.instances or {}
	local createdCount = 0

	for _, data in ipairs(instancesData) do
		local className = data.className or "Part"

		if className == "Part" or className == "WedgePart" or className == "CornerWedgePart" then
			local p = Instance.new(className) :: Part
			p.Name = data.name or "BatchPart"

			if data.size then
				p.Size = Vector3.new(data.size[1], data.size[2], data.size[3])
			end

			if data.cframe and type(data.cframe) == "table" and data.cframe.position then
				local pos = data.cframe.position
				p.CFrame = CFrame.new(pos[1], pos[2], pos[3])
			elseif data.position then
				p.Position = Vector3.new(data.position[1], data.position[2], data.position[3])
			end

			if data.color then
				p.Color = Color3.fromRGB(data.color[1], data.color[2], data.color[3])
			end

			if data.material then
				local m = (Enum.Material :: any)[data.material]
				if m then p.Material = m end
			end

			if data.transparency ~= nil then p.Transparency = data.transparency end
			if data.reflectance ~= nil then p.Reflectance = data.reflectance end
			p.Anchored = data.anchored ~= false
			p.CanCollide = data.canCollide ~= false

			if data.shape then
				local s = (Enum.PartType :: any)[data.shape]
				if s then p.Shape = s end
			end

			p.Parent = container
			createdCount += 1
		elseif className == "PointLight" or className == "SpotLight" or className == "SurfaceLight" then
			local light = Instance.new(className)
			light.Name = data.name or "Light"
			if data.color then light.Color = Color3.fromRGB(data.color[1], data.color[2], data.color[3]) end
			if data.brightness then (light :: any).Brightness = data.brightness end
			if data.range then (light :: any).Range = data.range end
			if data.shadows ~= nil then (light :: any).Shadows = data.shadows end
			local targetParent = data.parentPart and container:FindFirstChild(data.parentPart, true) or container
			light.Parent = targetParent
			createdCount += 1
		elseif className == "ParticleEmitter" then
			local emitter = Instance.new("ParticleEmitter")
			emitter.Name = data.name or "Emitter"
			if data.rate then emitter.Rate = data.rate end
			if data.lifetime then emitter.Lifetime = NumberRange.new(data.lifetime[1], data.lifetime[2]) end
			if data.speed then emitter.Speed = NumberRange.new(data.speed[1], data.speed[2]) end
			if data.lightEmission then emitter.LightEmission = data.lightEmission end
			if data.lightInfluence then emitter.LightInfluence = data.lightInfluence end
			local targetParent = data.parentPart and container:FindFirstChild(data.parentPart, true) or container
			emitter.Parent = targetParent
			createdCount += 1
		end
	end

	return {
		container = container.Name,
		createdCount = createdCount,
		requestedCount = #instancesData,
	}
end

-- Handler: SPAWN_PART
local function handleSpawnPart(args: { [string]: any }): { [string]: any }
	local part = Instance.new("Part")
	part.Name = args.name or "RAASE_Part"
	local size = args.size or { 4, 1, 4 }
	part.Size = Vector3.new(size[1], size[2], size[3])
	local pos = args.position or { 0, 5, 0 }
	part.Position = Vector3.new(pos[1], pos[2], pos[3])

	if args.color then part.Color = Color3.fromRGB(args.color[1], args.color[2], args.color[3]) end
	if args.material then
		local m = (Enum.Material :: any)[args.material]
		if m then part.Material = m end
	end
	if args.transparency ~= nil then part.Transparency = args.transparency end
	part.Anchored = args.anchored ~= false
	part.CanCollide = args.canCollide ~= false

	if args.parent then
		local p = resolveInstance(args.parent)
		part.Parent = p or workspace
	else
		part.Parent = workspace
	end

	return { name = part.Name, position = args.position, size = args.size }
end

-- Handler: CREATE_ISLAND
local function handleCreateIsland(args: { [string]: any }): { [string]: any }
	local islandName = args.name or "ProceduralIsland"
	local biome = args.biome or "Grass"
	local radius = args.radius or 35
	local height = args.height or 14
	local centerPos = args.position or { 0, 20, 0 }
	local origin = Vector3.new(centerPos[1], centerPos[2], centerPos[3])

	local islandModel = Instance.new("Model")
	islandModel.Name = islandName

	local topPart = Instance.new("Part")
	topPart.Name = "Island_Top"
	topPart.Shape = Enum.PartType.Cylinder
	topPart.Size = Vector3.new(4, radius * 2, radius * 2)
	topPart.CFrame = CFrame.new(origin) * CFrame.Angles(0, 0, math.rad(90))
	topPart.Anchored = true
	topPart.Material = Enum.Material.Grass
	topPart.Color = Color3.fromRGB(86, 150, 75)
	topPart.Parent = islandModel

	local coneHeight = height
	local stepCount = 6
	for i = 1, stepCount do
		local fraction = i / stepCount
		local layerR = radius * (1 - fraction * 0.75)
		local layerH = coneHeight / stepCount

		local rockLayer = Instance.new("Part")
		rockLayer.Name = string.format("Island_Cone_%d", i)
		rockLayer.Shape = Enum.PartType.Cylinder
		rockLayer.Size = Vector3.new(layerH + 0.5, layerR * 2, layerR * 2)
		rockLayer.CFrame = CFrame.new(origin - Vector3.new(0, fraction * coneHeight, 0)) * CFrame.Angles(0, 0, math.rad(90))
		rockLayer.Anchored = true
		rockLayer.Material = Enum.Material.Slate
		rockLayer.Color = Color3.fromRGB(90 - i * 5, 88 - i * 5, 85 - i * 5)
		rockLayer.Parent = islandModel
	end

	islandModel.Parent = workspace
	islandModel.PrimaryPart = topPart

	return { name = islandName, biome = biome, radius = radius, parts = #islandModel:GetChildren() }
end

-- Handler: CSG Operation
local function handleCsgOperation(args: { [string]: any }): { [string]: any }
	local operation = args.operation or "Union"
	local partAName = args.partA
	local partBName = args.partB

	local partA = workspace:FindFirstChild(partAName, true) :: BasePart?
	local partB = workspace:FindFirstChild(partBName, true) :: BasePart?

	if not partA or not partB then
		error(string.format("CSG parts not found: %s, %s", tostring(partAName), tostring(partBName)))
	end

	local GeometryService = game:GetService("GeometryService")
	local resultParts: { BasePart } = {}

	if operation == "Union" then
		resultParts = (GeometryService :: any):UnionAsync({ partA, partB })
	elseif operation == "Subtract" then
		resultParts = (GeometryService :: any):SubtractAsync(partA, { partB })
	elseif operation == "Intersect" then
		resultParts = (GeometryService :: any):IntersectAsync({ partA, partB })
	else
		error("Unsupported CSG operation: " .. tostring(operation))
	end

	local primaryResultName = "CSG_Failed"
	if resultParts and typeof(resultParts) == "table" and #resultParts > 0 then
		for index, part in ipairs(resultParts) do
			local name = args.resultName or (partAName .. "_" .. operation)
			if #resultParts > 1 then name = name .. "_" .. tostring(index) end
			part.Name = name
			part.Parent = workspace
		end
		primaryResultName = resultParts[1].Name
		Selection:Set(resultParts)
		partA:Destroy()
		partB:Destroy()
	end

	return { operation = operation, resultName = primaryResultName, count = #resultParts }
end

-- Handler: Set Terrain Voxels
local function handleSetTerrainVoxels(args: { [string]: any }): { [string]: any }
	local terrain = workspace.Terrain
	local shape = args.shape or "Block"
	local materialName = args.material or "Grass"
	local pos = args.position or { 0, 0, 0 }
	local size = args.size or { 16, 8, 16 }

	local matEnum = (Enum.Material :: any)[materialName] or Enum.Material.Grass
	local center = Vector3.new(pos[1], pos[2], pos[3])
	local dimensions = Vector3.new(size[1], size[2], size[3])

	if shape == "Block" then
		terrain:FillBlock(CFrame.new(center), dimensions, matEnum)
	elseif shape == "Ball" then
		local radius = math.max(dimensions.X, dimensions.Y, dimensions.Z) / 2
		terrain:FillBall(center, radius, matEnum)
	elseif shape == "Wedge" then
		terrain:FillWedge(CFrame.new(center), dimensions, matEnum)
	end

	return { shape = shape, material = materialName, position = pos, size = size }
end

-- Handler: Set Lighting
local function handleSetLighting(args: { [string]: any }): { [string]: any }
	local preset = args.preset or "GoldenHour"
	Lighting:ClearAllChildren()
	Lighting.Technology = Enum.Technology.Future
	Lighting.GlobalShadows = true

	if preset == "GoldenHour" then
		Lighting.ClockTime = 17.2
		Lighting.Brightness = 2.4
		Lighting.OutdoorAmbient = Color3.fromRGB(150, 135, 120)
		Lighting.Ambient = Color3.fromRGB(110, 95, 80)
	elseif preset == "Midnight" then
		Lighting.ClockTime = 0.5
		Lighting.Brightness = 0.8
		Lighting.OutdoorAmbient = Color3.fromRGB(35, 45, 65)
		Lighting.Ambient = Color3.fromRGB(20, 25, 40)
	else
		Lighting.ClockTime = 14.0
		Lighting.Brightness = 2.0
		Lighting.OutdoorAmbient = Color3.fromRGB(130, 135, 140)
		Lighting.Ambient = Color3.fromRGB(100, 100, 100)
	end

	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = 0.25
	atmosphere.Offset = 0.15
	atmosphere.Color = Color3.fromRGB(199, 210, 220)
	atmosphere.Decay = Color3.fromRGB(106, 120, 140)
	atmosphere.Parent = Lighting

	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.4
	bloom.Size = 20
	bloom.Threshold = 1.8
	bloom.Parent = Lighting

	return { preset = preset, technology = "Future", clockTime = Lighting.ClockTime }
end

-- Handler: Focus Camera
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
	commandCount += 1
	addLog(string.format("Executing %s...", cmd.action))
	updateStatusUI()

	local recording = ChangeHistoryService:TryBeginRecording("RAASE_" .. cmd.action)
	local success, result = pcall(function()
		if cmd.action == "BATCH_SPAWN" then
			return handleBatchSpawn(cmd.args)
		elseif cmd.action == "GET_SCENE_GRAPH" then
			return handleGetSceneGraph(cmd.args)
		elseif cmd.action == "INSPECT_OBJECT" then
			return handleInspectObject(cmd.args)
		elseif cmd.action == "MODIFY_OBJECT" then
			return handleModifyObject(cmd.args)
		elseif cmd.action == "DELETE_OBJECT" then
			return handleDeleteObject(cmd.args)
		elseif cmd.action == "CLEAR_ZONE" then
			return handleClearZone(cmd.args)
		elseif cmd.action == "SPAWN_PART" then
			return handleSpawnPart(cmd.args)
		elseif cmd.action == "CREATE_ISLAND" then
			return handleCreateIsland(cmd.args)
		elseif cmd.action == "CSG_OPERATION" then
			return handleCsgOperation(cmd.args)
		elseif cmd.action == "SET_TERRAIN_VOXELS" then
			return handleSetTerrainVoxels(cmd.args)
		elseif cmd.action == "SET_LIGHTING" then
			return handleSetLighting(cmd.args)
		elseif cmd.action == "FOCUS_CAMERA" then
			return handleFocusCamera(cmd.args)
		elseif cmd.action == "PING_TEST" then
			return { ping = "pong_v2.1", time = os.time() }
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
		addLog(string.format("✅ %s succeeded", cmd.action))
	else
		postReport(cmd.id, "ERROR", {}, tostring(result))
		addLog(string.format("❌ %s failed: %s", cmd.action, tostring(result):sub(1, 40)))
	end
	updateStatusUI()
end

--------------------------------------------------------------------------------
-- BACKGROUND LONG-POLLING LOOP
--------------------------------------------------------------------------------

task.spawn(function()
	print(string.format("[RAASE 2.1] Companion Plugin initialized. Polling %s", POLL_URL))

	while true do
		task.wait(0.2)

		if isEnabled and not isBusy then
			local pollSuccess, response = pcall(function()
				return HttpService:GetAsync(POLL_URL, true)
			end)

			if pollSuccess then
				connectionStatus = "ONLINE"
				updateStatusUI()

				if response and response ~= "" and response ~= "{}" then
					local decodeSuccess, data = pcall(function()
						return HttpService:JSONDecode(response)
					end)

					if decodeSuccess and type(data) == "table" and data.action and data.action ~= "NOOP" then
						isBusy = true
						pcall(executeCommand, data)
						isBusy = false
						updateStatusUI()
					end
				end
			else
				connectionStatus = "OFFLINE"
				updateStatusUI()
				task.wait(2.0) -- Back off on connection error
			end
		end
	end
end)
