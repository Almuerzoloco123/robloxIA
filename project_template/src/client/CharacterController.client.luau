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
	rootPart = newChar:WaitForChild("HumanoidRootPart", 5) :: BasePart?
	local upperTorso = newChar:WaitForChild("UpperTorso", 5) :: BasePart?

	if upperTorso then
		waistJoint = upperTorso:WaitForChild("Waist", 5) :: Motor6D?
		-- In standard R15 rigs, Neck is parented to UpperTorso (Part0: UpperTorso, Part1: Head)
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

	local mousePos = UserInputService:GetMouseLocation()
	local unitRay = camera:ViewportPointToRay(mousePos.X, mousePos.Y)
	local worldLookDirection = unitRay.Direction

	-- Transform world look vector into character local space
	local localLook = rootPart.CFrame:VectorToObjectSpace(worldLookDirection)

	local pitch = math.asin(math.clamp(localLook.Y, -1, 1))
	local yaw = math.atan2(-localLook.X, -localLook.Z)

	-- Apply procedural rotation strictly to Motor6D.Transform in local coordinates
	if waistJoint then
		local clampedPitch = math.clamp(pitch * 0.5, -math.rad(30), math.rad(30))
		local clampedYaw = math.clamp(yaw * 0.5, -math.rad(45), math.rad(45))
		waistJoint.Transform = waistJoint.Transform * CFrame.Angles(clampedPitch, clampedYaw, 0)
	end

	if neckJoint then
		local clampedPitch = math.clamp(pitch * 0.5, -math.rad(45), math.rad(45))
		local clampedYaw = math.clamp(yaw * 0.5, -math.rad(60), math.rad(60))
		neckJoint.Transform = neckJoint.Transform * CFrame.Angles(clampedPitch, clampedYaw, 0)
	end
end)
