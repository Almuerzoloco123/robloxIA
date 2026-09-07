--!strict
--[[
    HUDController.client.luau
    Responsive, Modern, Anti-Slop HUD Interface for Mobile, Console and PC.
    Adheres to design-driven principles: Crisp typography, high contrast, clean micro-interactions.
--]]

local Players = game:GetService("Players")
local GuiService = game:GetService("GuiService")
local TweenService = game:GetService("TweenService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui") :: PlayerGui

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "RAASE_HUD"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
screenGui.Parent = playerGui

-- Main Stats Bar (Top Left)
local statsContainer = Instance.new("Frame")
statsContainer.Name = "StatsContainer"
statsContainer.Size = UDim2.new(0.25, 0, 0.08, 0)
statsContainer.Position = UDim2.new(0.02, 0, 0.03, 0)
statsContainer.BackgroundColor3 = Color3.fromRGB(18, 22, 28)
statsContainer.BackgroundTransparency = 0.15
statsContainer.BorderSizePixel = 0
statsContainer.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 10)
corner.Parent = statsContainer

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(45, 55, 72)
stroke.Thickness = 1.5
stroke.Parent = statsContainer

local listLayout = Instance.new("UIListLayout")
listLayout.FillDirection = Enum.FillDirection.Horizontal
listLayout.VerticalAlignment = Enum.VerticalAlignment.Center
listLayout.Padding = UDim.new(0, 15)
listLayout.Parent = statsContainer

local padding = Instance.new("UIPadding")
padding.PaddingLeft = UDim.new(0, 15)
padding.PaddingRight = UDim.new(0, 15)
padding.Parent = statsContainer

-- Coins Display
local coinsLabel = Instance.new("TextLabel")
coinsLabel.Name = "CoinsLabel"
coinsLabel.Size = UDim2.new(0.45, 0, 0.8, 0)
coinsLabel.BackgroundTransparency = 1
coinsLabel.Font = Enum.Font.BuilderSansBold
coinsLabel.Text = "🪙 0"
coinsLabel.TextColor3 = Color3.fromRGB(246, 224, 94)
coinsLabel.TextSize = 18
coinsLabel.TextXAlignment = Enum.TextXAlignment.Left
coinsLabel.Parent = statsContainer

-- Gems Display
local gemsLabel = Instance.new("TextLabel")
gemsLabel.Name = "GemsLabel"
gemsLabel.Size = UDim2.new(0.45, 0, 0.8, 0)
gemsLabel.BackgroundTransparency = 1
gemsLabel.Font = Enum.Font.BuilderSansBold
gemsLabel.Text = "💎 0"
gemsLabel.TextColor3 = Color3.fromRGB(129, 230, 217)
gemsLabel.TextSize = 18
gemsLabel.TextXAlignment = Enum.TextXAlignment.Left
gemsLabel.Parent = statsContainer

-- Shop Button (Top Right to avoid mobile virtual jump controls)
local shopButton = Instance.new("TextButton")
shopButton.Name = "ShopButton"
shopButton.Size = UDim2.new(0.11, 0, 0.06, 0)
shopButton.Position = UDim2.new(0.86, 0, 0.03, 0)
shopButton.BackgroundColor3 = Color3.fromRGB(49, 130, 206)
shopButton.Font = Enum.Font.BuilderSansExtraBold
shopButton.Text = "TIENDA"
shopButton.TextColor3 = Color3.fromRGB(255, 255, 255)
shopButton.TextSize = 16
shopButton.Parent = screenGui

local shopCorner = Instance.new("UICorner")
shopCorner.CornerRadius = UDim.new(0, 8)
shopCorner.Parent = shopButton

local shopStroke = Instance.new("UIStroke")
shopStroke.Color = Color3.fromRGB(66, 153, 225)
shopStroke.Thickness = 2
shopStroke.Parent = shopButton

-- Aspect Ratio Constraint for Mobile/Tablet consistency
local ratioConstraint = Instance.new("UIAspectRatioConstraint")
ratioConstraint.AspectRatio = 2.5
ratioConstraint.Parent = shopButton

-- Micro-interaction on hover / click
shopButton.MouseEnter:Connect(function()
	TweenService:Create(shopButton, TweenInfo.new(0.15), { BackgroundColor3 = Color3.fromRGB(66, 153, 225) }):Play()
end)

shopButton.MouseLeave:Connect(function()
	TweenService:Create(shopButton, TweenInfo.new(0.15), { BackgroundColor3 = Color3.fromRGB(49, 130, 206) }):Play()
end)

shopButton.Activated:Connect(function()
	print("[HUD] Shop button clicked.")
end)
