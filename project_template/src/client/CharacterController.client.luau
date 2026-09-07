--!strict
--[[
    CharacterController.client.luau
    Procedural Character Aiming manipulating EXCLUSIVELY Motor6D.Transform.
    Converts World-Space Camera Ray into Character Object-Space for pitch and yaw.
--]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local localPlayer = Players.LocalPlayer
local camera = Workspace.CurrentCamera

local character: Model? = nil
local rootPart: BasePart? = nil
local waistJoint: Motor6D? = nil
local neckJoint: Motor6D? = nil

local function onCharacterAdded(newChar: Model)
	character = newChar
	rootPart = nil
	waistJoint = nil
	neckJoint = nil

	rootPart = newChar:WaitForChild("HumanoidRootPart", 5) :: BasePart?
	local upperTorso = newChar:WaitForChild("UpperTorso", 5) :: BasePart?

	if upperTorso then
		waistJoint = upperTorso:WaitForChild("Waist", 5) :: Motor6D?
		neckJoint = upperTorso:WaitForChild("Neck", 5) :: Motor6D?
	end
end

if localPlayer.Character then
	onCharacterAdded(localPlayer.Character)
end
localPlayer.CharacterAdded:Connect(onCharacterAdded)

-- Render thread procedural kinematics in character local space
RunService.RenderStepped:Connect(function(dt: number)
	if not character or not rootPart or not camera then
		return
	end

	-- Support PC Mouse, Mobile Touch, and Gamepad viewports
	local worldLookDirection: Vector3
	if UserInputService.MouseEnabled then
		local mousePos = UserInputService:GetMouseLocation()
		local unitRay = camera:ViewportPointToRay(mousePos.X, mousePos.Y)
		worldLookDirection = unitRay.Direction
	else
		worldLookDirection = camera.CFrame.LookVector
	end

	-- Transform world look vector into character local space
	local localLook = rootPart.CFrame:VectorToObjectSpace(worldLookDirection)

	local pitch = math.asin(math.clamp(localLook.Y, -1, 1))
	local yaw = math.atan2(-localLook.X, -localLook.Z)

	-- Apply procedural rotation while preserving active animation translation (Position)
	if waistJoint and waistJoint.Parent then
		local clampedPitch = math.clamp(pitch * 0.5, -math.rad(30), math.rad(30))
		local clampedYaw = math.clamp(yaw * 0.5, -math.rad(45), math.rad(45))
		local currentPos = waistJoint.Transform.Position
		waistJoint.Transform = CFrame.new(currentPos) * CFrame.Angles(-clampedPitch, clampedYaw, 0)
	end

	if neckJoint and neckJoint.Parent then
		local clampedPitch = math.clamp(pitch * 0.5, -math.rad(45), math.rad(45))
		local clampedYaw = math.clamp(yaw * 0.5, -math.rad(60), math.rad(60))
		local currentPos = neckJoint.Transform.Position
		neckJoint.Transform = CFrame.new(currentPos) * CFrame.Angles(-clampedPitch, clampedYaw, 0)
	end
end)
