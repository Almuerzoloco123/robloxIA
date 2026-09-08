#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import path from 'node:path';

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';

async function sendCommand(action, args = {}) {
  const res = await fetch(`${BRIDGE_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args, wait: true })
  });
  return res.json();
}

async function main() {
  console.log('🚀 Deploying ServerScriptService game scripts directly into Studio...');

  const serviceLuau = fs.readFileSync(path.resolve('project_template/src/server/LobbyInteractionService.luau'), 'utf8');

  // Inject into ServerScriptService via EXECUTE_LUAU
  const deployScript = `
    local ServerScriptService = game:GetService("ServerScriptService")
    
    local folder = ServerScriptService:FindFirstChild("RAASE_Server")
    if not folder then
      folder = Instance.new("Folder")
      folder.Name = "RAASE_Server"
      folder.Parent = ServerScriptService
    end

    -- 1. Create or update LobbyInteractionService ModuleScript
    local mod = folder:FindFirstChild("LobbyInteractionService")
    if not mod then
      mod = Instance.new("ModuleScript")
      mod.Name = "LobbyInteractionService"
      mod.Parent = folder
    end
    mod.Source = ${JSON.stringify(serviceLuau)}

    -- 2. Create or update Bootstrap Script
    local boot = folder:FindFirstChild("LobbyBootstrap")
    if not boot then
      boot = Instance.new("Script")
      boot.Name = "LobbyBootstrap"
      boot.Parent = folder
    end
    boot.Source = [[
      --!strict
      local LobbyInteractionService = require(script.Parent:WaitForChild("LobbyInteractionService") :: any)
      local lobby = LobbyInteractionService.new()
      lobby:Init()
      print("🔮 [LobbyBootstrap] Harry Potter Citadel Lobby game systems active!")
    ]]

    return "Deployed successfully to ServerScriptService.RAASE_Server"
  `;

  const result = await sendCommand('EXECUTE_LUAU', { code: deployScript });
  console.log('✅ Server scripts deployed:', result.report?.result || result);
}

main().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
