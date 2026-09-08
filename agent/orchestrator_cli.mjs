#!/usr/bin/env node
// @ts-check
/**
 * RAASE 2.1 / robloxIA — Agent Orchestrator CLI
 * Coordinates high-level intention dispatch, scene graph introspection,
 * atomic batch actuation, and computer vision audit in Roblox Studio.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${BRIDGE_URL}${endpoint}`, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(`Bridge communication error (${BRIDGE_URL}${endpoint}): ${err.message}`);
  }
}

async function getStatus() {
  const status = await fetchJson('/api/status');
  console.log('[RAASE 2.1 Status]');
  console.log(`- Bridge: ${status.bridge} (Port ${status.port})`);
  console.log(`- Roblox Studio Connected: ${status.studioConnected ? '✅ YES' : '❌ NO'}`);
  console.log(`- Pending Command Queue: ${status.queueLength}`);
  if (status.studioState?.telemetry) {
    const t = status.studioState.telemetry;
    console.log(`- Telemetry: Memory: ${t.memoryMb || '?'} MB | Primitives: ${t.primitives || '?'} | Instances: ${t.instances || '?'}`);
  }
}

async function sendCommand(action, args = {}, wait = true) {
  console.log(`[RAASE 2.1] Dispatching command: ${action}...`);
  const res = await fetchJson('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args, wait })
  });
  if (wait && res.report) {
    if (res.report.status === 'SUCCESS') {
      console.log(`✅ Command ${action} executed successfully in Studio!`);
      if (res.report.details && Object.keys(res.report.details).length > 0) {
        console.log('Details:', JSON.stringify(res.report.details, null, 2));
      }
    } else {
      console.error(`❌ Studio execution failed: ${res.report.error}`);
    }
  } else {
    console.log(`✅ Command enqueued: ID ${res.enqueued?.id || res.commandId}`);
  }
  return res;
}

async function inspectObject(targetPath) {
  console.log(`[RAASE 2.1] Inspecting instance: "${targetPath}"...`);
  const res = await fetchJson('/api/scene-graph/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPath })
  });
  console.log('🔍 Object Details:\n', JSON.stringify(res.result, null, 2));
  return res.result;
}

async function getSceneGraph(rootPath = 'workspace', maxDepth = 2) {
  console.log(`[RAASE 2.1] Querying Scene Graph at "${rootPath}" (depth: ${maxDepth})...`);
  const res = await fetchJson('/api/scene-graph/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rootPath, maxDepth: parseInt(String(maxDepth), 10) })
  });
  console.log(`🌲 Scene Graph (${res.result?.scannedInstances || 0} instances):\n`, JSON.stringify(res.result?.sceneGraph, null, 2));
  return res.result;
}

async function modifyObject(targetPath, propsJson) {
  let properties = {};
  try {
    properties = typeof propsJson === 'string' ? JSON.parse(propsJson) : propsJson;
  } catch (err) {
    throw new Error(`Invalid JSON for properties: ${err.message}`);
  }

  console.log(`[RAASE 2.1] Mutating properties on "${targetPath}"...`);
  const res = await fetchJson('/api/scene-graph/modify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPath, properties })
  });
  console.log('✨ Modified Properties:', res.result?.modifiedProperties);
  return res.result;
}

async function deleteObject(targetPath) {
  console.log(`[RAASE 2.1] Deleting instance "${targetPath}"...`);
  const res = await fetchJson('/api/scene-graph/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPath })
  });
  console.log(`🗑️ Deleted:`, res.result);
  return res.result;
}

async function clearZone(center, size, filterModel) {
  console.log(`[RAASE 2.1] Clearing zone at [${center}] size [${size}]...`);
  const res = await fetchJson('/api/scene-graph/clear-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      zoneAABB: { center, size },
      filterModel
    })
  });
  console.log(`🧹 Zone Cleared (${res.result?.clearedParts || 0} parts removed)`);
  return res.result;
}

async function batchSpawn(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  console.log(`[RAASE 2.1] Batch spawning from ${filePath} (${data.instances?.length || 0} parts)...`);
  const res = await fetchJson('/api/command/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  console.log(`⚡ Batch Spawn Completed: ${res.result?.createdCount || 0} instances created in "${res.result?.container || 'workspace'}"`);
  return res.result;
}

async function triggerCapture() {
  console.log('[RAASE 2.1] Triggering Viewport Screen Capture...');
  const res = await fetchJson('/api/capture', { method: 'POST' });
  console.log(`📸 ${res.message}: ${res.file}`);
  return res;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'status':
        await getStatus();
        break;

      case 'inspect':
        if (!args[1]) throw new Error('Usage: node orchestrator_cli.mjs inspect <targetPath>');
        await inspectObject(args[1]);
        break;

      case 'scene-graph':
        await getSceneGraph(args[1] || 'workspace', args[2] || 2);
        break;

      case 'modify':
        if (!args[1] || !args[2]) throw new Error('Usage: node orchestrator_cli.mjs modify <targetPath> \'<propsJson>\'');
        await modifyObject(args[1], args[2]);
        break;

      case 'delete':
        if (!args[1]) throw new Error('Usage: node orchestrator_cli.mjs delete <targetPath>');
        await deleteObject(args[1]);
        break;

      case 'clear-zone':
        await clearZone(
          [parseFloat(args[1] || '0'), parseFloat(args[2] || '10'), parseFloat(args[3] || '0')],
          [parseFloat(args[4] || '100'), parseFloat(args[5] || '50'), parseFloat(args[6] || '100')],
          args[7]
        );
        break;

      case 'batch-spawn':
        if (!args[1]) throw new Error('Usage: node orchestrator_cli.mjs batch-spawn <jsonFile>');
        await batchSpawn(args[1]);
        break;

      case 'spawn-part':
        await sendCommand('SPAWN_PART', {
          name: args[1] || 'RAASE_Block',
          size: [4, 1, 4],
          position: [0, 5, 0],
          material: 'SmoothPlastic',
          color: [200, 200, 200]
        });
        break;

      case 'create-island':
        await sendCommand('CREATE_ISLAND', {
          name: args[1] || 'Island',
          biome: args[2] || 'Grass',
          radius: args[3] ? parseInt(args[3], 10) : 25,
          position: [0, 20, 0]
        });
        break;

      case 'set-lighting':
        await sendCommand('SET_LIGHTING', { preset: args[1] || 'GoldenHour' });
        break;

      case 'focus-camera':
        await sendCommand('FOCUS_CAMERA', {
          position: [parseFloat(args[1] || '0'), parseFloat(args[2] || '20'), parseFloat(args[3] || '0')],
          distance: args[4] ? parseFloat(args[4]) : 45
        });
        break;

      case 'exec-luau':
        if (!args[1]) throw new Error('Usage: node orchestrator_cli.mjs exec-luau <file.luau | "code">');
        let luauCode = args.slice(1).join(' ');
        if (fs.existsSync(args[1])) {
          luauCode = fs.readFileSync(args[1], 'utf8');
        }
        await sendCommand('EXECUTE_LUAU', { code: luauCode }, true);
        break;

      case 'capture':
        await triggerCapture();
        break;

      case 'help':
      default:
        console.log(`
RAASE 2.1 Orchestrator CLI
Usage:
  node orchestrator_cli.mjs <command> [options]

Commands:
  status                                      Inspect bridge and Studio connectivity
  inspect <targetPath>                        Inspect instance properties, bounding box, tags
  scene-graph [rootPath] [depth]              Inspect hierarchical scene graph
  modify <targetPath> '<propsJson>'           Mutate properties in-place on existing instance
  delete <targetPath>                         Safely destroy existing scene object
  clear-zone <cx> <cy> <cz> <sx> <sy> <sz>    Clear non-preserved geometry in bounding volume
  batch-spawn <jsonFile>                      Atomically instantiate parts array from JSON
  create-island <name> <biome> <radius>       Spawn procedural island (Grass | Desert | Ice | Volcanic)
  set-lighting <preset>                       Apply atmospheric lighting preset (GoldenHour | Midnight | Noon)
  focus-camera <x> <y> <z> [dist]             Reposition Studio camera
  spawn-part [name]                           Spawn a standalone block
  capture                                     Trigger host-side viewport capture
        `);
        break;
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
