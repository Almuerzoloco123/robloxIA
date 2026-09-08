#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';

function getBridgeToken() {
  if (process.env.ROBLOXIA_BRIDGE_TOKEN && process.env.ROBLOXIA_BRIDGE_TOKEN.trim()) {
    return process.env.ROBLOXIA_BRIDGE_TOKEN.trim();
  }
  const tokenFilePath = path.resolve(__dirname, '..', '..', 'bridge', '.bridge_token');
  if (fs.existsSync(tokenFilePath)) {
    try {
      return fs.readFileSync(tokenFilePath, 'utf8').trim();
    } catch {
      // ignore
    }
  }
  return '';
}

async function sendCommand(action, args = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getBridgeToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BRIDGE_URL}/api/command`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, args, wait: true })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const data = await res.json();
  if (data.report && data.report.status === 'ERROR') {
    throw new Error(`Studio Error: ${data.report.error}`);
  }
  return data;
}

async function main() {
  console.log('🚀 Deploying complete ServerScriptService & ReplicatedStorage bundle into Studio...');

  const templateSrc = path.resolve(__dirname, '..', '..', 'project_template', 'src');
  const serviceLuau = fs.readFileSync(path.join(templateSrc, 'server', 'LobbyInteractionService.luau'), 'utf8');
  const netsecLuau = fs.readFileSync(path.join(templateSrc, 'server', 'NetworkSecurityService.luau'), 'utf8');
  const dataPersistLuau = fs.readFileSync(path.join(templateSrc, 'server', 'DataPersistenceService.luau'), 'utf8');
  const monetizationLuau = fs.readFileSync(path.join(templateSrc, 'server', 'MonetizationService.luau'), 'utf8');
  const typesLuau = fs.readFileSync(path.join(templateSrc, 'shared', 'Types.luau'), 'utf8');
  const janitorLuau = fs.readFileSync(path.join(templateSrc, 'shared', 'Janitor.luau'), 'utf8');

  // Inject shared modules and server services via EXECUTE_LUAU
  const deployScript = `
    local ServerScriptService = game:GetService("ServerScriptService")
    local ReplicatedStorage = game:GetService("ReplicatedStorage")

    -- 1. Ensure ReplicatedStorage.RAASE_Shared folder exists
    local sharedFolder = ReplicatedStorage:FindFirstChild("RAASE_Shared")
    if not sharedFolder then
      sharedFolder = Instance.new("Folder")
      sharedFolder.Name = "RAASE_Shared"
      sharedFolder.Parent = ReplicatedStorage
    end

    -- 1a. Types ModuleScript
    local typesMod = sharedFolder:FindFirstChild("Types")
    if not typesMod then
      typesMod = Instance.new("ModuleScript")
      typesMod.Name = "Types"
      typesMod.Parent = sharedFolder
    end
    typesMod.Source = ${JSON.stringify(typesLuau)}

    -- 1b. Janitor ModuleScript
    local janitorMod = sharedFolder:FindFirstChild("Janitor")
    if not janitorMod then
      janitorMod = Instance.new("ModuleScript")
      janitorMod.Name = "Janitor"
      janitorMod.Parent = sharedFolder
    end
    janitorMod.Source = ${JSON.stringify(janitorLuau)}

    -- 2. Ensure ServerScriptService.RAASE_Server folder exists
    local serverFolder = ServerScriptService:FindFirstChild("RAASE_Server")
    if not serverFolder then
      serverFolder = Instance.new("Folder")
      serverFolder.Name = "RAASE_Server"
      serverFolder.Parent = ServerScriptService
    end

    -- 2a. NetworkSecurityService ModuleScript
    local netMod = serverFolder:FindFirstChild("NetworkSecurityService")
    if not netMod then
      netMod = Instance.new("ModuleScript")
      netMod.Name = "NetworkSecurityService"
      netMod.Parent = serverFolder
    end
    netMod.Source = ${JSON.stringify(netsecLuau)}

    -- 2b. LobbyInteractionService ModuleScript
    local lobbyMod = serverFolder:FindFirstChild("LobbyInteractionService")
    if not lobbyMod then
      lobbyMod = Instance.new("ModuleScript")
      lobbyMod.Name = "LobbyInteractionService"
      lobbyMod.Parent = serverFolder
    end
    lobbyMod.Source = ${JSON.stringify(serviceLuau)}

    -- 2c. DataPersistenceService ModuleScript
    local dataMod = serverFolder:FindFirstChild("DataPersistenceService")
    if not dataMod then
      dataMod = Instance.new("ModuleScript")
      dataMod.Name = "DataPersistenceService"
      dataMod.Parent = serverFolder
    end
    dataMod.Source = ${JSON.stringify(dataPersistLuau)}

    -- 2d. MonetizationService ModuleScript
    local moneyMod = serverFolder:FindFirstChild("MonetizationService")
    if not moneyMod then
      moneyMod = Instance.new("ModuleScript")
      moneyMod.Name = "MonetizationService"
      moneyMod.Parent = serverFolder
    end
    moneyMod.Source = ${JSON.stringify(monetizationLuau)}

    -- 2e. Bootstrap Script
    local boot = serverFolder:FindFirstChild("LobbyBootstrap")
    if not boot then
      boot = Instance.new("Script")
      boot.Name = "LobbyBootstrap"
      boot.Parent = serverFolder
    end
    boot.Source = [[
      --!strict
      local netMod = script.Parent:WaitForChild("NetworkSecurityService", 10)
      if not netMod then
        error("[LobbyBootstrap] NetworkSecurityService not found after 10s!")
      end
      local lobbyMod = script.Parent:WaitForChild("LobbyInteractionService", 10)
      if not lobbyMod then
        error("[LobbyBootstrap] LobbyInteractionService not found after 10s!")
      end
      local LobbyInteractionService = require(lobbyMod :: any)
      local lobby = LobbyInteractionService.new()
      lobby:Init()
      print("🔮 [LobbyBootstrap] Harry Potter Citadel Lobby game systems active!")
    ]]

    return "Deployed full service bundle (RAASE_Shared + RAASE_Server) successfully"
  `;

  const result = await sendCommand('EXECUTE_LUAU', { code: deployScript });
  console.log('✅ Server scripts deployed:', result.report?.details?.result || result.report?.result || result);
}

main().catch(err => {
  console.error('Deployment error:', err.message || err);
  process.exit(1);
});
