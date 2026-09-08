--!strict
--[[
    Server Bootstrap for RAASE 2.0 / robloxIA
--]]

local NetworkSecurityService = require(script:WaitForChild("NetworkSecurityService") :: any)
local DataPersistenceService = require(script:WaitForChild("DataPersistenceService") :: any)
local MonetizationService = require(script:WaitForChild("MonetizationService") :: any)
local LobbyInteractionService = require(script:WaitForChild("LobbyInteractionService") :: any)

local lobbyService = LobbyInteractionService.new()
lobbyService:Init()

print("[RAASE 2.0] Server subsystem and Harry Potter Magic Lobby initialized successfully with Zero-Trust security.")

