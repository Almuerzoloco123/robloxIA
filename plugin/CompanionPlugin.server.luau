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

-- C1: Security Token Configuration
local BRIDGE_TOKEN_SETTING_KEY = "ROBLOXIA_BRIDGE_TOKEN"
local bridgeToken: string = ""
pcall(function()
	local saved = plugin:GetSetting(BRIDGE_TOKEN_SETTING_KEY)
	if saved and type(saved) == "string" then
		bridgeToken = saved
	end
end)

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
		local rx, ry, rz = val:ToOrientation()
		return {
			position = { math.floor(pos.X * 100) / 100, math.floor(pos.Y * 100) / 100, math.floor(pos.Z * 100) / 100 },
			lookVector = { math.floor(look.X * 100) / 100, math.floor(look.Y * 100) / 100, math.floor(look.Z * 100) / 100 },
			rotation = { math.floor(math.deg(rx) * 100) / 100, math.floor(math.deg(ry) * 100) / 100, math.floor(math.deg(rz) * 100) / 100 },
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
		statusIndicatorLabel.Text = "🟡 PAUSED (Click to Activate)"
		statusIndicatorLabel.BackgroundColor3 = Color3.fromRGB(80, 70, 20)
		statusIndicatorLabel.TextColor3 = Color3.fromRGB(255, 220, 90)
	elseif isBusy then
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
		local recording = ChangeHistoryService:TryBeginRecording("RAASE_ClearProps")
		local count = 0
		for _, m in ipairs(workspace:GetChildren()) do
			if m:IsA("Model") and (m.Name == "MagicLobby" or m.Name:match("^MagicLobby") or m.Name:match("^RAASE_")) then
				m:Destroy()
				count += 1
			end
		end
		if recording then
			ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
		end
		addLog(string.format("Cleared %d generated models (Undoable)", count))
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
			local headers: { [string]: string } = {}
			if bridgeToken and bridgeToken ~= "" then
				headers["Authorization"] = "Bearer " .. bridgeToken
			end
			local ok, res = pcall(function()
				return HttpService:RequestAsync({
					Url = BRIDGE_BASE_URL .. "/api/status",
					Method = "GET",
					Headers = headers,
				})
			end)
			if ok and typeof(res) == "table" and res.StatusCode == 200 then
				connectionStatus = "ONLINE"
				addLog("Bridge alive: " .. string.sub(res.Body or "", 1, 35))
			else
				connectionStatus = "OFFLINE"
				addLog("Bridge ping failed")
			end
			updateStatusUI()
		end)
	end)

	-- Token Config Row
	local tokenFrame = Instance.new("Frame")
	tokenFrame.Size = UDim2.new(1, -16, 0, 24)
	tokenFrame.Position = UDim2.new(0, 8, 0, 138)
	tokenFrame.BackgroundTransparency = 1
	tokenFrame.Parent = root

	local tokenLbl = Instance.new("TextLabel")
	tokenLbl.Size = UDim2.new(0, 65, 1, 0)
	tokenLbl.BackgroundTransparency = 1
	tokenLbl.Text = "🔑 Token:"
	tokenLbl.TextColor3 = Color3.fromRGB(170, 185, 205)
	tokenLbl.TextSize = 10
	tokenLbl.Font = Enum.Font.GothamBold
	tokenLbl.TextXAlignment = Enum.TextXAlignment.Left
	tokenLbl.Parent = tokenFrame

	local tokenInput = Instance.new("TextBox")
	tokenInput.Size = UDim2.new(1, -70, 1, 0)
	tokenInput.Position = UDim2.new(0, 68, 0, 0)
	tokenInput.BackgroundColor3 = Color3.fromRGB(35, 38, 46)
	tokenInput.BorderSizePixel = 0
	tokenInput.Text = bridgeToken
	tokenInput.PlaceholderText = "Paste Bridge Token from console..."
	tokenInput.TextColor3 = Color3.fromRGB(240, 245, 255)
	tokenInput.TextSize = 10
	tokenInput.Font = Enum.Font.Code
	tokenInput.ClearTextOnFocus = false
	tokenInput.Parent = tokenFrame

	tokenInput.FocusLost:Connect(function()
		bridgeToken = tokenInput.Text:gsub("%s+", "")
		pcall(function()
			plugin:SetSetting(BRIDGE_TOKEN_SETTING_KEY, bridgeToken)
		end)
		addLog("Bridge token saved to plugin settings.")
	end)

	-- Live Log Section Header
	local logHeader = Instance.new("TextLabel")
	logHeader.Size = UDim2.new(1, -16, 0, 20)
	logHeader.Position = UDim2.new(0, 8, 0, 168)
	logHeader.BackgroundTransparency = 1
	logHeader.Text = "ACTIVITY STREAM:"
	logHeader.TextColor3 = Color3.fromRGB(140, 155, 175)
	logHeader.TextSize = 11
	logHeader.Font = Enum.Font.GothamBold
	logHeader.TextXAlignment = Enum.TextXAlignment.Left
	logHeader.Parent = root

	-- Scrollable Log Frame
	local scroll = Instance.new("ScrollingFrame")
	scroll.Size = UDim2.new(1, -16, 1, -196)
	scroll.Position = UDim2.new(0, 8, 0, 190)
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

-- Post report back to Host Bridge (Authenticated with Bearer Token)
local function postReport(commandId: string, status: "SUCCESS" | "ERROR", details: { [string]: any }, errMessage: string?, reportNonce: string?)
	local sanitizedDetails = serializeValue(details)
	local payload = {
		commandId = commandId,
		reportNonce = reportNonce,
		status = status,
		details = sanitizedDetails,
		error = errMessage,
		telemetry = getStudioTelemetry(),
	}

	local headers: { [string]: string } = {
		["Content-Type"] = "application/json",
	}
	if bridgeToken and bridgeToken ~= "" then
		headers["Authorization"] = "Bearer " .. bridgeToken
	end

	local success, err = pcall(function()
		local resp = HttpService:RequestAsync({
			Url = REPORT_URL,
			Method = "POST",
			Headers = headers,
			Body = HttpService:JSONEncode(payload),
		})
		if resp.StatusCode == 401 then
			warn("[RAASE 2.1 Security] Failed to post report: 401 Unauthorized (Invalid or missing Bearer token)")
		elseif not resp.Success then
			warn(string.format("[RAASE 2.1] Failed to post report HTTP %d: %s", resp.StatusCode, resp.StatusMessage))
		end
	end)
	if not success then
		warn(string.format("[RAASE 2.1] Failed to post execution report: %s", tostring(err)))
	end
end

--------------------------------------------------------------------------------
-- ACTUATORS: SCENE GRAPH & INTROSPECTION
--------------------------------------------------------------------------------

local function resolveInstance(targetPath: string, strictExactPath: boolean?): Instance?
	if not targetPath or targetPath == "" then return nil end
	if targetPath == "workspace" or targetPath == "Workspace" then
		return workspace
	end
	if targetPath == "Lighting" or targetPath == "game.Lighting" then
		return Lighting
	end

	local cleanPath = targetPath:gsub("^game%.", "")
	local parts = string.split(cleanPath, ".")
	local first = parts[1]

	local root: Instance? = nil
	local startIndex = 2

	if first == "workspace" or first == "Workspace" then
		root = workspace
	elseif first == "Lighting" then
		root = Lighting
	elseif first == "ServerScriptService" then
		root = game:GetService("ServerScriptService")
	elseif first == "ReplicatedStorage" then
		root = game:GetService("ReplicatedStorage")
	elseif first == "StarterGui" then
		root = game:GetService("StarterGui")
	elseif first == "SoundService" then
		root = game:GetService("SoundService")
	else
		local svcOk, svc = pcall(function() return game:GetService(first) end)
		if svcOk and svc then
			root = svc
		else
			local wsChild = workspace:FindFirstChild(first)
			if wsChild then
				root = wsChild
				startIndex = 2
			else
				if strictExactPath then
					return nil -- Strict path resolution: do not fallback to workspace root
				end
				root = workspace
				startIndex = 1
			end
		end
	end

	if not root then
		if strictExactPath then return nil end
		return workspace:FindFirstChild(targetPath, true)
	end
	if #parts < startIndex then return root end

	local current: Instance? = root
	for i = startIndex, #parts do
		if not current then break end
		current = current:FindFirstChild(parts[i])
	end

	if not current and not strictExactPath then
		current = workspace:FindFirstChild(targetPath, true)
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

-- Handler: MODIFY_OBJECT (C3: Whitelist enforced, script mutation blocked)
local ALLOWED_MODIFY_PROPERTIES: { [string]: boolean } = {
	Name = true,
	Position = true,
	Size = true,
	Color = true,
	Material = true,
	Transparency = true,
	Reflectance = true,
	CastShadow = true,
	CanCollide = true,
	CanTouch = true,
	CanQuery = true,
	Anchored = true,
	CFrame = true,
	Orientation = true,
	Shape = true,
	Massless = true,
	BrickColor = true,
}

local function handleModifyObject(args: { [string]: any }): { [string]: any }
	local path = args.targetPath
	if not path then error("Missing targetPath for MODIFY_OBJECT") end

	local inst = resolveInstance(path, true)
	if not inst then
		error(string.format("Instance not found: %s", tostring(path)))
	end

	-- C3 Security Guardrail: Reject mutating code or scripts to prevent backdoor injection
	if inst:IsA("LuaSourceContainer") or inst:IsA("BaseScript") then
		error(string.format("MODIFY_OBJECT security violation: Mutating script instances (%s) is strictly forbidden.", inst.ClassName))
	end

	local props = args.properties or {}
	local modified: { string } = {}
	local rejected: { string } = {}
	local instAny = inst :: any

	for propName, propValue in pairs(props) do
		-- C3 Property Whitelist Check
		if not ALLOWED_MODIFY_PROPERTIES[propName] then
			warn(string.format("[SECURITY] Property '%s' on '%s' is not in the safe whitelist. Rejected.", propName, inst.Name))
			table.insert(rejected, propName)
			continue
		end

		local success, err = pcall(function()
			if propName == "Color" and type(propValue) == "table" then
				instAny.Color = Color3.fromRGB(propValue[1], propValue[2], propValue[3])
			elseif propName == "Size" and type(propValue) == "table" then
				instAny.Size = Vector3.new(propValue[1], propValue[2], propValue[3])
			elseif propName == "Position" and type(propValue) == "table" then
				instAny.Position = Vector3.new(propValue[1], propValue[2], propValue[3])
			elseif propName == "Material" and type(propValue) == "string" then
				local matEnum = (Enum.Material :: any)[propValue]
				if matEnum then
					instAny.Material = matEnum
				end
			elseif propName == "CFrame" and type(propValue) == "table" then
				local currentPos = inst:IsA("BasePart") and inst.Position or Vector3.zero
				local px, py, pz = currentPos.X, currentPos.Y, currentPos.Z
				if propValue.position then
					local p = propValue.position
					px, py, pz = p[1], p[2], p[3]
				end
				local cf = CFrame.new(px, py, pz)
				local rot = propValue.rotation or propValue.angles or propValue.cframeRotation
				if rot and type(rot) == "table" then
					cf = cf * CFrame.Angles(math.rad(rot[1] or 0), math.rad(rot[2] or 0), math.rad(rot[3] or 0))
				end
				instAny.CFrame = cf
			elseif propName == "Orientation" and type(propValue) == "table" then
				instAny.Orientation = Vector3.new(propValue[1], propValue[2], propValue[3])
			else
				instAny[propName] = propValue
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
		rejectedProperties = rejected,
	}
end

-- Handler: DELETE_OBJECT (High Bug 4: Strict path resolution without fallback search)
local function handleDeleteObject(args: { [string]: any }): { [string]: any }
	local path = args.targetPath
	if not path then error("Missing targetPath for DELETE_OBJECT") end

	local inst = resolveInstance(path, true)
	if not inst then
		return { deleted = false, reason = string.format("Instance not found by exact path: %s", tostring(path)) }
	end

	local name = inst.Name
	local parent = inst.Parent and inst.Parent.Name or "nil"
	inst:Destroy()

	return { deleted = true, targetName = name, formerParent = parent }
end

-- Handler: CLEAR_ZONE (High Bug 2: Fail-closed container verification and mandatory zone bounds)
local function handleClearZone(args: { [string]: any }): { [string]: any }
	if not args.zoneAABB or type(args.zoneAABB) ~= "table" or not args.zoneAABB.center or not args.zoneAABB.size then
		error("CLEAR_ZONE aborted: Missing required 'zoneAABB' with center and size. Destructive default cube is disabled for scene safety.")
	end
	local zone = args.zoneAABB
	local center = Vector3.new(zone.center[1], zone.center[2], zone.center[3])
	local size = Vector3.new(zone.size[1], zone.size[2], zone.size[3])

	local filterModelName = args.filterModel
	local filterContainer: Instance? = nil

	if filterModelName and filterModelName ~= "" then
		filterContainer = workspace:FindFirstChild(filterModelName)
		if not filterContainer then
			error(string.format("CLEAR_ZONE aborted: filterModel '%s' was specified but not found in workspace. Fail-closed to protect scene.", tostring(filterModelName)))
		end
	end

	local preserveClasses = { Terrain = true, SpawnLocation = true, Camera = true }
	local destroyedCount = 0
	local overlapParams = OverlapParams.new()
	overlapParams.FilterType = Enum.RaycastFilterType.Exclude
	overlapParams.FilterDescendantsInstances = { workspace.Terrain }

	local partsInZone = workspace:GetPartBoundsInBox(CFrame.new(center), size, overlapParams)

	for _, part in ipairs(partsInZone) do
		if not preserveClasses[part.ClassName] then
			if filterContainer then
				if part:IsDescendantOf(filterContainer) then
					part:Destroy()
					destroyedCount += 1
				end
			else
				-- If no filterModel specified, strictly only destroy models matching generated RAASE/MagicLobby prefixes
				local parent = part.Parent
				local isGenerated = part.Name:match("^RAASE_") or part.Name:match("^MagicLobby")
					or (parent and (parent.Name:match("^RAASE_") or parent.Name:match("^MagicLobby")))
				if isGenerated then
					part:Destroy()
					destroyedCount += 1
				end
			end
		end
	end

	return { clearedParts = destroyedCount, zoneCenter = zone.center, zoneSize = zone.size, filterModel = filterModelName }
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
	-- RN-10 Creator Sovereignty: Default to "skip_existing" so human work is never silently overwritten.
	-- Only update existing instances if args.upsert == true or args.mode == "upsert" is explicitly specified.
	local mode = "skip_existing"
	if args.upsert == true or args.mode == "upsert" then
		mode = "upsert"
	elseif args.mode then
		mode = args.mode
	end
	local excludeSet: { [string]: boolean } = {}
	if args.excludeNames and type(args.excludeNames) == "table" then
		for _, name in ipairs(args.excludeNames) do
			excludeSet[tostring(name)] = true
		end
	end

	local createdCount = 0
	local updatedCount = 0

	for _, data in ipairs(instancesData) do
		local className = data.className or "Part"
		local partName = data.name or "BatchPart"

		if excludeSet[partName] then
			continue
		end

		if className == "Part" or className == "WedgePart" or className == "CornerWedgePart" or className == "SpawnLocation" or className == "TrussPart" then
			local existing = container:FindFirstChild(partName)
			local p: BasePart
			local isNew = false

			if existing and existing:IsA("BasePart") then
				if mode == "skip_existing" then
					continue
				end
				p = existing
				updatedCount += 1
			else
				p = Instance.new(className) :: BasePart
				p.Name = partName
				isNew = true
			end

			-- High Bug 3: Specific properties for SpawnLocation
			if className == "SpawnLocation" and p:IsA("SpawnLocation") then
				local sp = p :: SpawnLocation
				sp.Duration = data.duration or 0
				sp.Neutral = data.neutral ~= false
				sp.Enabled = data.enabled ~= false
				if data.allowTeamChangeOnTouch ~= nil then
					sp.AllowTeamChangeOnTouch = data.allowTeamChangeOnTouch
				end
			end

			if data.size then
				p.Size = Vector3.new(data.size[1], data.size[2], data.size[3])
			end

			-- Unified CFrame and Rotation Calculation (High Bug 3)
			local cf = CFrame.identity
			local basePos: { number }? = nil

			if data.cframe and type(data.cframe) == "table" then
				basePos = data.cframe.position or {0, 0, 0}
			elseif data.position then
				basePos = data.position
			end

			if basePos then
				cf = CFrame.new(basePos[1], basePos[2], basePos[3])
			end

			-- Support cframeRotation, rotation, angles, or lookAt
			local rot = data.cframeRotation or data.rotation or (data.cframe and (data.cframe.rotation or data.cframe.angles)) or data.angles
			if rot and type(rot) == "table" then
				cf = cf * CFrame.Angles(math.rad(rot[1] or 0), math.rad(rot[2] or 0), math.rad(rot[3] or 0))
			elseif data.cframe and data.cframe.lookAt and basePos then
				local target = data.cframe.lookAt
				cf = CFrame.lookAt(Vector3.new(basePos[1], basePos[2], basePos[3]), Vector3.new(target[1], target[2], target[3]))
			end

			p.CFrame = cf

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

			if data.specialMesh then
				local sm = p:FindFirstChildOfClass("SpecialMesh") or Instance.new("SpecialMesh")
				local mType = (Enum.MeshType :: any)[data.specialMesh.meshType or "Sphere"] or Enum.MeshType.Sphere
				sm.MeshType = mType
				if data.specialMesh.scale then
					sm.Scale = Vector3.new(data.specialMesh.scale[1], data.specialMesh.scale[2], data.specialMesh.scale[3])
				end
				sm.Parent = p
			end

			if data.proximityPrompt then
				local prompt = p:FindFirstChildOfClass("ProximityPrompt") or Instance.new("ProximityPrompt")
				prompt.ActionText = data.proximityPrompt.actionText or "Interact"
				prompt.ObjectText = data.proximityPrompt.objectText or p.Name
				prompt.HoldDuration = data.proximityPrompt.holdDuration or 0.5
				prompt.MaxActivationDistance = data.proximityPrompt.maxDistance or 10
				prompt.RequiresLineOfSight = false
				prompt.Parent = p
			end

			if data.billboardGui then
				local bb = p:FindFirstChildOfClass("BillboardGui") or Instance.new("BillboardGui")
				bb.Size = UDim2.new(data.billboardGui.sizeX or 4, 0, data.billboardGui.sizeY or 1.5, 0)
				bb.StudsOffset = Vector3.new(0, data.billboardGui.offsetY or 2.5, 0)
				bb.AlwaysOnTop = data.billboardGui.alwaysOnTop ~= false
				local tl = bb:FindFirstChildOfClass("TextLabel") or Instance.new("TextLabel")
				tl.Size = UDim2.new(1, 0, 1, 0)
				tl.BackgroundTransparency = 1
				tl.TextColor3 = data.billboardGui.textColor and Color3.fromRGB(data.billboardGui.textColor[1], data.billboardGui.textColor[2], data.billboardGui.textColor[3]) or Color3.fromRGB(255, 235, 160)
				tl.Text = data.billboardGui.text or ""
				tl.Font = Enum.Font.GothamBold
				tl.TextScaled = true
				tl.Parent = bb
				bb.Parent = p
			end

			if data.sound then
				local snd = p:FindFirstChildOfClass("Sound") or Instance.new("Sound")
				snd.SoundId = data.sound.soundId or "rbxassetid://9113642309"
				snd.Volume = data.sound.volume or 0.5
				snd.Looped = data.sound.looped == true
				snd.RollOffMode = Enum.RollOffMode.InverseTapered
				snd.RollOffMinDistance = data.sound.minDist or 5
				snd.RollOffMaxDistance = data.sound.maxDist or 45
				snd.Parent = p
				if data.sound.play then
					snd:Play()
				end
			end

			if isNew then
				p.Parent = container
				createdCount += 1
			end
		elseif className == "PointLight" or className == "SpotLight" or className == "SurfaceLight" then
			local targetParent = data.parentPart and container:FindFirstChild(data.parentPart, true) or container
			local lightName = data.name or "Light"
			local light = targetParent:FindFirstChild(lightName)
			local isNew = false

			if light and light.ClassName == className then
				if mode == "skip_existing" then continue end
				updatedCount += 1
			else
				light = Instance.new(className)
				light.Name = lightName
				isNew = true
			end

			local lightAny = light :: any
			if data.color then light.Color = Color3.fromRGB(data.color[1], data.color[2], data.color[3]) end
			if data.brightness then lightAny.Brightness = data.brightness end
			if data.range then lightAny.Range = data.range end
			if data.shadows ~= nil then lightAny.Shadows = data.shadows end

			if isNew then
				light.Parent = targetParent
				createdCount += 1
			end
		elseif className == "ParticleEmitter" then
			local targetParent = data.parentPart and container:FindFirstChild(data.parentPart, true) or container
			local emitterName = data.name or "Emitter"
			local emitter = targetParent:FindFirstChild(emitterName) :: ParticleEmitter?
			local isNew = false

			if emitter and emitter:IsA("ParticleEmitter") then
				if mode == "skip_existing" then continue end
				updatedCount += 1
			else
				emitter = Instance.new("ParticleEmitter")
				emitter.Name = emitterName
				isNew = true
			end

			if data.rate then emitter.Rate = data.rate end
			if data.lifetime then emitter.Lifetime = NumberRange.new(data.lifetime[1], data.lifetime[2]) end
			if data.speed then emitter.Speed = NumberRange.new(data.speed[1], data.speed[2]) end
			if data.lightEmission then emitter.LightEmission = data.lightEmission end
			if data.lightInfluence then emitter.LightInfluence = data.lightInfluence end
			if data.spreadAngle then emitter.SpreadAngle = Vector2.new(data.spreadAngle[1], data.spreadAngle[2]) end
			if data.acceleration then emitter.Acceleration = Vector3.new(data.acceleration[1], data.acceleration[2], data.acceleration[3]) end
			if data.color then
				emitter.Color = ColorSequence.new(Color3.fromRGB(data.color[1], data.color[2], data.color[3]))
			end
			if data.sizeCurve then
				local kps = {}
				for _, kp in ipairs(data.sizeCurve) do
					table.insert(kps, NumberSequenceKeypoint.new(kp[1], kp[2]))
				end
				emitter.Size = NumberSequence.new(kps)
			end
			if data.transparencyCurve then
				local kps = {}
				for _, kp in ipairs(data.transparencyCurve) do
					table.insert(kps, NumberSequenceKeypoint.new(kp[1], kp[2]))
				end
				emitter.Transparency = NumberSequence.new(kps)
			end

			if isNew then
				emitter.Parent = targetParent
				createdCount += 1
			end
		end
	end

	return {
		container = container.Name,
		createdCount = createdCount,
		updatedCount = updatedCount,
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

-- Handler: CSG Operation (Enforces exact path resolution to prevent destructive accidental deletion)
local function handleCsgOperation(args: { [string]: any }): { [string]: any }
	local operation = args.operation or "Union"
	local partAName = args.partA
	local partBName = args.partB

	local partAInst = resolveInstance(partAName, true)
	local partBInst = resolveInstance(partBName, true)

	if not partAInst or not partAInst:IsA("BasePart") or not partBInst or not partBInst:IsA("BasePart") then
		error(string.format("CSG BaseParts not found at exact path: %s, %s", tostring(partAName), tostring(partBName)))
	end

	local partA = partAInst :: BasePart
	local partB = partBInst :: BasePart

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
	local replaceEnv = args.replaceEnvironment == true
	if replaceEnv then
		pcall(function()
			for _, child in ipairs(Lighting:GetChildren()) do
				if child:IsA("PostProcessEffect") or child:IsA("Atmosphere") or child:IsA("Sky") then
					child:Destroy()
				end
			end
		end)
	end

	pcall(function()
		(Lighting :: any).Technology = Enum.Technology.Future
	end)

	pcall(function()
		Lighting.GlobalShadows = true
	end)

	pcall(function()
		if preset == "GoldenHour" then
			Lighting.ClockTime = 17.2
			Lighting.Brightness = 2.4
			Lighting.OutdoorAmbient = Color3.fromRGB(150, 135, 120)
			Lighting.Ambient = Color3.fromRGB(110, 95, 80)
		elseif preset == "Midnight" or preset == "MagicNight" then
			Lighting.ClockTime = args.clockTime or 20.8
			Lighting.Brightness = args.brightness or 2.2
			Lighting.OutdoorAmbient = Color3.fromRGB(85, 100, 135)
			Lighting.Ambient = Color3.fromRGB(70, 80, 110)
		else
			Lighting.ClockTime = 14.0
			Lighting.Brightness = 2.0
			Lighting.OutdoorAmbient = Color3.fromRGB(130, 135, 140)
			Lighting.Ambient = Color3.fromRGB(100, 100, 100)
		end
	end)

	pcall(function()
		local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
		if not atmosphere then
			atmosphere = Instance.new("Atmosphere")
			atmosphere.Density = 0.25
			atmosphere.Offset = 0.15
			atmosphere.Color = Color3.fromRGB(199, 210, 220)
			atmosphere.Decay = Color3.fromRGB(106, 120, 140)
			atmosphere.Parent = Lighting
		end

		local bloom = Lighting:FindFirstChildOfClass("BloomEffect")
		if not bloom then
			bloom = Instance.new("BloomEffect")
			bloom.Intensity = 0.4
			bloom.Size = 20
			bloom.Threshold = 1.8
			bloom.Parent = Lighting
		end
	end)

	return { preset = preset, clockTime = Lighting.ClockTime }
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
		cam.Focus = CFrame.new(center)
	end

	return { cameraPosition = targetPos, distance = distance }
end

--------------------------------------------------------------------------------
-- LUAU CODE SAFETY VALIDATOR (Prevents Studio Engine Thread Starvation)
--------------------------------------------------------------------------------

local function stripCommentsAndStrings(src: string): string
	local len = #src
	local i = 1
	local out = {}
	while i <= len do
		local c = string.sub(src, i, i)
		local next2 = string.sub(src, i, i + 1)

		if next2 == "--" then
			-- Comment
			local afterDash = i + 2
			local bOpen, bClose, eq = string.find(src, "^%[(=*)%[", afterDash)
			if bOpen and eq then
				local closingPattern = "%]" .. eq .. "%]"
				local _, cClose = string.find(src, closingPattern, bClose + 1)
				if cClose then
					i = cClose + 1
				else
					i = len + 1
				end
			else
				local nl = string.find(src, "[\r\n]", afterDash)
				if nl then
					i = nl
				else
					i = len + 1
				end
			end
		elseif c == '"' or c == "'" then
			-- Quoted string
			local quote = c
			i = i + 1
			while i <= len do
				local ch = string.sub(src, i, i)
				if ch == "\\" then
					i = i + 2
				elseif ch == quote then
					i = i + 1
					break
				elseif ch == "\n" or ch == "\r" then
					break
				else
					i = i + 1
				end
			end
			table.insert(out, '""')
		elseif c == "[" then
			-- Long bracket string [===[ ... ]===]
			local bOpen, bClose, eq = string.find(src, "^%[(=*)%[", i)
			if bOpen and eq then
				local closingPattern = "%]" .. eq .. "%]"
				local _, cClose = string.find(src, closingPattern, bClose + 1)
				if cClose then
					i = cClose + 1
				else
					i = len + 1
				end
				table.insert(out, '""')
			else
				table.insert(out, c)
				i = i + 1
			end
		else
			table.insert(out, c)
			i = i + 1
		end
	end
	return table.concat(out)
end

-- Token structure for lexical scanning of Luau code
type Token = {
	type: "ident" | "number" | "symbol",
	text: string,
}

local function tokenizeLuau(src: string): { Token }
	local tokens: { Token } = {}
	local i = 1
	local len = #src
	while i <= len do
		local c = string.sub(src, i, i)
		if string.match(c, "%s") then
			i += 1
		elseif string.match(c, "[%a_]") then
			local s, e = string.find(src, "^[%a_][%w_]*", i)
			if s and e then
				table.insert(tokens, { type = "ident", text = string.sub(src, s, e) })
				i = e + 1
			else
				i += 1
			end
		elseif string.match(c, "%d") then
			local s, e = string.find(src, "^0x[%da-fA-F]+", i)
			if not s then
				s, e = string.find(src, "^%d+%.?%d*[eE]?[+-]?%d*", i)
			end
			if not s then
				s, e = string.find(src, "^%d+", i)
			end
			if s and e then
				table.insert(tokens, { type = "number", text = string.sub(src, s, e) })
				i = e + 1
			else
				i += 1
			end
		elseif c == "." then
			if string.match(string.sub(src, i + 1, i + 1), "%d") then
				local s, e = string.find(src, "^%.%d+[eE]?[+-]?%d*", i)
				if s and e then
					table.insert(tokens, { type = "number", text = string.sub(src, s, e) })
					i = e + 1
				else
					i += 1
				end
			elseif string.sub(src, i, i + 1) == ".." then
				if string.sub(src, i, i + 2) == "..." then
					table.insert(tokens, { type = "symbol", text = "..." })
					i += 3
				else
					table.insert(tokens, { type = "symbol", text = ".." })
					i += 2
				end
			else
				table.insert(tokens, { type = "symbol", text = "." })
				i += 1
			end
		else
			local two = string.sub(src, i, i + 1)
			if two == "==" or two == "~=" or two == "<=" or two == ">=" or two == "//" or two == "::" then
				table.insert(tokens, { type = "symbol", text = two })
				i += 2
			else
				table.insert(tokens, { type = "symbol", text = c })
				i += 1
			end
		end
	end
	return tokens
end

--[[
	NOTE ON RECURSION SAFETY:
	Infinite recursion (e.g. `local function f() f() end; f()`) is naturally self-terminating in Luau:
	The Luau virtual machine enforces a fixed internal call-stack limit (~200 to 1000 frames).
	Upon exceeding the depth, the engine raises a catchable "stack overflow" error within < 1ms,
	immediately aborting execution cleanly without blocking or freezing the Studio main thread.
--]]
local function validateLuauCodeSafety(code: string): (boolean, string?)
	if not code or type(code) ~= "string" then
		return false, "code must be a non-empty string"
	end

	local clean = stripCommentsAndStrings(code)

	-- 1. Disallow nested dynamic execution and sandbox escape primitives
	if string.find(clean, "%f[%a]loadstring%f[%A]") then
		return false, "Nested loadstring() execution is strictly forbidden"
	end
	if string.find(clean, "%f[%a]setfenv%f[%A]") or string.find(clean, "%f[%a]getfenv%f[%A]") then
		return false, "setfenv/getfenv environment manipulation is strictly forbidden"
	end

	-- 2. Lexical loop body analysis with block-level yield tracking
	local tokens = tokenizeLuau(clean)

	type ActiveLoop = {
		loopType: string,
		blockDepth: number,
		functionDepth: number,
		hasYieldOrBreak: boolean,
	}

	local activeLoops: { ActiveLoop } = {}
	local blockDepth = 0
	local functionDepth = 0

	type PendingLoop = {
		loopType: string,
		dangerous: boolean,
	}
	local pendingLoop: PendingLoop? = nil

	for idx = 1, #tokens do
		local t = tokens[idx]
		local text = t.text

		-- Check dangerous numeric bounds: >= 9 digits, math.huge, 1eX, or INT_MAX
		if t.type == "number" then
			local rawNum = string.gsub(text, "^0x", "")
			if string.find(string.lower(text), "e") or #rawNum >= 9 or text == "2147483647" or string.lower(text) == "0x7fffffff" then
				if pendingLoop and pendingLoop.loopType == "for" then
					pendingLoop.dangerous = true
				end
			end
		end

		if text == "math" then
			local next1 = tokens[idx + 1]
			local next2 = tokens[idx + 2]
			if next1 and next1.text == "." and next2 and next2.text == "huge" then
				if pendingLoop and pendingLoop.loopType == "for" then
					pendingLoop.dangerous = true
				end
			end
		end

		-- Block openers
		if text == "function" then
			blockDepth += 1
			functionDepth += 1
		elseif text == "then" then
			blockDepth += 1
		elseif text == "do" then
			blockDepth += 1
			if pendingLoop then
				if pendingLoop.dangerous then
					table.insert(activeLoops, {
						loopType = pendingLoop.loopType,
						blockDepth = blockDepth,
						functionDepth = functionDepth,
						hasYieldOrBreak = false,
					})
				end
				pendingLoop = nil
			end
		elseif text == "while" then
			pendingLoop = { loopType = "while", dangerous = true }
		elseif text == "for" then
			pendingLoop = { loopType = "for", dangerous = false }
		elseif text == "repeat" then
			table.insert(activeLoops, {
				loopType = "repeat",
				blockDepth = blockDepth,
				functionDepth = functionDepth,
				hasYieldOrBreak = false,
			})
		end

		-- Yield primitive detection
		local isYield = false
		if text == "task" then
			local next1 = tokens[idx + 1]
			local next2 = tokens[idx + 2]
			if next1 and next1.text == "." and next2 and (next2.text == "wait" or next2.text == "desynchronize") then
				isYield = true
			end
		elseif text == "wait" then
			local next1 = tokens[idx + 1]
			if next1 and next1.text == "(" then
				isYield = true
			end
		elseif text == "coroutine" then
			local next1 = tokens[idx + 1]
			local next2 = tokens[idx + 2]
			if next1 and next1.text == "." and next2 and next2.text == "yield" then
				isYield = true
			end
		end

		if isYield then
			-- Yield yields the entire thread; satisfies all enclosing loops at the same functionDepth
			for _, loop in ipairs(activeLoops) do
				if loop.functionDepth == functionDepth then
					loop.hasYieldOrBreak = true
				end
			end
		end

		if text == "break" then
			-- Break terminates only the innermost loop at this functionDepth
			for j = #activeLoops, 1, -1 do
				if activeLoops[j].functionDepth == functionDepth then
					activeLoops[j].hasYieldOrBreak = true
					break
				end
			end
		end

		-- Block closers
		if text == "until" then
			-- Closes repeat loop
			local foundIdx = nil
			for j = #activeLoops, 1, -1 do
				if activeLoops[j].loopType == "repeat" and activeLoops[j].functionDepth == functionDepth then
					foundIdx = j
					break
				end
			end
			if foundIdx then
				local loop = table.remove(activeLoops, foundIdx)
				if loop and not loop.hasYieldOrBreak then
					return false, "Synchronous repeat...until loop detected without task.wait/yield (prevents engine thread starvation)"
				end
			end
		elseif text == "end" then
			-- Check if closing a loop at this blockDepth
			local foundIdx = nil
			for j = #activeLoops, 1, -1 do
				if activeLoops[j].blockDepth == blockDepth then
					foundIdx = j
					break
				end
			end
			if foundIdx then
				local loop = table.remove(activeLoops, foundIdx)
				if loop and not loop.hasYieldOrBreak then
					return false, string.format("Synchronous %s loop detected without task.wait/yield (prevents engine thread starvation)", loop.loopType)
				end
			end
			blockDepth -= 1
			if functionDepth > 0 and functionDepth > blockDepth then
				functionDepth -= 1
			end
		end
	end

	-- Any unclosed dangerous loops
	for _, loop in ipairs(activeLoops) do
		if not loop.hasYieldOrBreak then
			return false, string.format("Unterminated synchronous %s loop detected without task.wait/yield", loop.loopType)
		end
	end

	return true, nil
end

--------------------------------------------------------------------------------
-- MAIN EXECUTION DISPATCHER
--------------------------------------------------------------------------------

local function executeCommand(cmd: { id: string, action: string, args: { [string]: any }, reportNonce: string? })
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
		elseif cmd.action == "EXECUTE_LUAU" then
			local code = cmd.args.code
			if not code or type(code) ~= "string" then
				error("EXECUTE_LUAU requires 'code' string argument")
			end

			local isSafe, safetyErr = validateLuauCodeSafety(code)
			if not isSafe then
				error("EXECUTE_LUAU security rejection: " .. tostring(safetyErr))
			end

			local chunk, compileErr = loadstring(code)
			if not chunk then
				error("EXECUTE_LUAU compile error: " .. tostring(compileErr))
			end

			-- C2: Watchdog timer & timeout budget (5.0 seconds maximum)
			local WATCHDOG_BUDGET_SEC = 5.0
			local isCompleted = false
			local isTimedOut = false
			local execSuccess = false
			local execResult: any = nil
			local callerThread = coroutine.running()

			local execThread = task.spawn(function()
				local ok, res = pcall(chunk)
				if isTimedOut then return end
				isCompleted = true
				execSuccess = ok
				execResult = res
				task.spawn(callerThread)
			end)

			local watchdogTimer = task.delay(WATCHDOG_BUDGET_SEC, function()
				if not isCompleted then
					isTimedOut = true
					pcall(function() task.cancel(execThread) end)
					warn(string.format("[SECURITY WATCHDOG] EXECUTE_LUAU exceeded timeout budget of %.1fs. Thread cancelled.", WATCHDOG_BUDGET_SEC))
					task.spawn(callerThread)
				end
			end)

			if not isCompleted and not isTimedOut then
				coroutine.yield()
			end

			if isTimedOut then
				error(string.format("EXECUTE_LUAU aborted by watchdog: execution exceeded budget of %.1fs", WATCHDOG_BUDGET_SEC))
			end

			if not execSuccess then
				error("EXECUTE_LUAU runtime error: " .. tostring(execResult))
			end

			return {
				executed = true,
				result = tostring(execResult),
				mutated = false -- EXECUTE_LUAU cannot self-certify scene mutations for circuit breaker
			}
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
		postReport(cmd.id, "SUCCESS", result :: { [string]: any }, nil, cmd.reportNonce)
		addLog(string.format("✅ %s succeeded", cmd.action))
	else
		postReport(cmd.id, "ERROR", {}, tostring(result), cmd.reportNonce)
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
			local pollHeaders: { [string]: string } = {}
			if bridgeToken and bridgeToken ~= "" then
				pollHeaders["Authorization"] = "Bearer " .. bridgeToken
			end

			local pollSuccess, response = pcall(function()
				return HttpService:RequestAsync({
					Url = POLL_URL,
					Method = "GET",
					Headers = pollHeaders,
				})
			end)

			if pollSuccess and typeof(response) == "table" then
				if response.StatusCode == 401 then
					connectionStatus = "OFFLINE"
					updateStatusUI()
					addLog("⚠️ Bridge 401 Unauthorized: Bearer Token required. Enter token in panel above.")
					task.wait(2.0)
				elseif response.StatusCode == 200 then
					connectionStatus = "ONLINE"
					updateStatusUI()

					local body = response.Body
					if body and body ~= "" and body ~= "{}" then
						local decodeSuccess, data = pcall(function()
							return HttpService:JSONDecode(body)
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
					task.wait(1.5)
				end
			else
				connectionStatus = "OFFLINE"
				updateStatusUI()
				task.wait(2.0) -- Back off on connection error
			end
		end
	end
end)
