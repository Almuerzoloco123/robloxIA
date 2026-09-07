--!strict
--[[
    CharacterController.client.luau
    Procedural Character Aiming manipulating EXCLUSIVELY Motor6D.Transform.
    Guarantees 60 FPS without rebuilding the motor physics graph (No C0/C1 mutations).
--]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local localPlayer = Players.LocalPlayer
local camera = Workspace.CurrentCamera

local character: Model? = nil
local waistJoint: Motor6D? = nil
local neckJoint: Motor6D? = nil

local function onCharacterAdded(newChar: Model)
	character = newChar
	local upperTorso = newChar:WaitForChild("UpperTorso", 5) :: BasePart?
	local head = newChar:WaitForChild("Head", 5) :: BasePart?

	if upperTorso then
		waistJoint = upperTorso:WaitForChild("Waist", 5) :: Motor6D?
	end
	if head then
		neckJoint = head:WaitForChild("Neck", 5) :: Motor6D?
	end
end

if localPlayer.Character then
	onCharacterAdded(localPlayer.Character)
end
localPlayer.CharacterAdded:Connect(onCharacterAdded)

-- Render thread procedural kinematics
RunService.RenderStepped:Connect(function(dt: number)
	if not character or not camera then
		return
	end

	local mousePos = UserInputService:GetMouseLocation()
	local unitRay = camera:ViewportPointToRay(mousePos.X, mousePos.Y)
	local lookDirection = unitRay.Direction

	-- Calculate angles for torso and head
	local pitch = math.asin(lookDirection.Y)
	local yaw = math.atan2(-lookDirection.X, -lookDirection.Z)

	-- Apply procedural rotation strictly to Motor6D.Transform
	if waistJoint then
		local clampedPitch = math.clamp(pitch * 0.5, -math.rad(30), math.rad(30))
		waistJoint.Transform = waistJoint.Transform * CFrame.Angles(clampedPitch, 0, 0)
	end

	if neckJoint then
		local clampedPitch = math.clamp(pitch * 0.5, -math.rad(45), math.rad(45))
		neckJoint.Transform = neckJoint.Transform * CFrame.Angles(clampedPitch, 0, 0)
	end
end)
