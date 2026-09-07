--!strict
--[[
    Server Bootstrap for RAASE 2.0 / robloxIA
--]]

local NetworkSecurityService = require(script:WaitForChild("NetworkSecurityService") :: any)
local DataPersistenceService = require(script:WaitForChild("DataPersistenceService") :: any)
local MonetizationService = require(script:WaitForChild("MonetizationService") :: any)

print("[RAASE 2.0] Server subsystem initialized successfully with Zero-Trust security.")
