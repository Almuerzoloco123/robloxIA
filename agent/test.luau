local testPart = Instance.new("Part")
testPart.Name = "RAASE_TestPart"
testPart.Size = Vector3.new(4, 4, 4)
testPart.Position = Vector3.new(0, 10, 0)
testPart.Anchored = true
testPart.Color = Color3.fromRGB(255, 120, 0)
testPart.Material = Enum.Material.Neon
testPart.Parent = workspace
return "Test part created successfully!"
