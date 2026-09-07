#!/usr/bin/env node
// @ts-check
/**
 * RAASE 2.0 / robloxIA — Agent Orchestrator CLI
 * Coordinates high-level intention dispatch, scene actuation in Roblox Studio,
 * and the computer vision audit loop.
 */

import { spawn } from 'node:child_process';
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
  console.log('[RAASE 2.0 Status]');
  console.log(`- Bridge: ${status.bridge} (Port ${status.port})`);
  console.log(`- Roblox Studio Connected: ${status.studioConnected ? '✅ YES' : '❌ NO'}`);
  console.log(`- Pending Command Queue: ${status.queueLength}`);
  if (status.studioState?.telemetry) {
    const t = status.studioState.telemetry;
    console.log(`- Telemetry: Memory: ${t.memoryMb || '?'} MB | Primitives: ${t.primitives || '?'} | Instances: ${t.instances || '?'}`);
  }
}

async function sendCommand(action, args = {}) {
  console.log(`[RAASE 2.0] Enqueuing command: ${action}...`);
  const res = await fetchJson('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args })
  });
  console.log(`✅ Command enqueued: ID ${res.enqueued?.id}`);
  return res;
}

async function triggerCapture() {
  console.log('[RAASE 2.0] Triggering Viewport Screen Capture...');
  const res = await fetchJson('/api/capture', { method: 'POST' });
  console.log(`📸 ${res.message}: ${res.file}`);
  return res;
}

async function runRecipe(recipeName) {
  console.log(`[RAASE 2.0] Executing Macro Recipe: ${recipeName}...`);

  if (recipeName === 'three-islands') {
    // 1. Configure Lighting
    await sendCommand('SET_LIGHTING', { preset: 'VibrantFuture', clockTime: 15 });

    // 2. Island 1: Grass / Spawn
    await sendCommand('CREATE_ISLAND', {
      name: 'SpawnIsland_Grass',
      biome: 'Grass',
      radius: 20,
      position: [0, 20, 0]
    });

    // 3. Island 2: Desert
    await sendCommand('CREATE_ISLAND', {
      name: 'Island_Desert',
      biome: 'Desert',
      radius: 16,
      position: [60, 30, 20]
    });

    // 4. Island 3: Volcanic
    await sendCommand('CREATE_ISLAND', {
      name: 'Island_Volcanic',
      biome: 'Volcanic',
      radius: 22,
      position: [120, 45, -10]
    });

    // 5. Focus Camera on the scene
    await sendCommand('FOCUS_CAMERA', { position: [60, 30, 10], distance: 110, pitch: -20, yaw: 35 });

    console.log('✅ Recipe "three-islands" dispatched to Roblox Studio.');
  } else {
    console.error(`Unknown recipe: ${recipeName}. Available: three-islands`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'status':
        await getStatus();
        break;

      case 'spawn-part':
        await sendCommand('SPAWN_PART', {
          name: args[1] || 'Part',
          size: [4, 1, 4],
          position: [0, 10, 0],
          color: [255, 100, 50]
        });
        break;

      case 'create-island':
        await sendCommand('CREATE_ISLAND', {
          name: args[1] || 'Island',
          biome: args[2] || 'Grass',
          radius: args[3] ? parseInt(args[3], 10) : 20,
          position: [0, 20, 0]
        });
        break;

      case 'set-lighting':
        await sendCommand('SET_LIGHTING', { preset: args[1] || 'VibrantFuture' });
        break;

      case 'focus-camera':
        await sendCommand('FOCUS_CAMERA', {
          position: [parseFloat(args[1] || '0'), parseFloat(args[2] || '20'), parseFloat(args[3] || '0')],
          distance: args[4] ? parseFloat(args[4]) : 45
        });
        break;

      case 'csg-op':
        await sendCommand('CSG_OPERATION', {
          operation: args[1] || 'Union',
          partA: args[2] || 'PartA',
          partB: args[3] || 'PartB',
          resultName: args[4]
        });
        break;

      case 'set-terrain':
        await sendCommand('SET_TERRAIN_VOXELS', {
          shape: args[1] || 'Block',
          position: [parseFloat(args[2] || '0'), parseFloat(args[3] || '0'), parseFloat(args[4] || '0')],
          size: [parseFloat(args[5] || '16'), parseFloat(args[6] || '8'), parseFloat(args[7] || '16')]
        });
        break;

      case 'capture':
        await triggerCapture();
        break;

      case 'recipe':
        await runRecipe(args[1] || 'three-islands');
        break;

      case 'help':
      default:
        console.log(`
RAASE 2.0 Orchestrator CLI
Usage:
  node orchestrator_cli.mjs <command> [options]

Commands:
  status                                 Inspect bridge and Studio connectivity
  create-island <name> <biome> <radius>  Spawn procedural island (Grass | Desert | Ice | Volcanic)
  set-lighting <preset>                  Apply atmospheric lighting preset
  focus-camera <x> <y> <z> [dist]        Reposition Studio camera
  spawn-part [name]                      Spawn a standalone block
  csg-op <Union|Subtract|Intersect> <a> <b> [res] Perform CSG operation
  set-terrain <Block|Ball> <x> <y> <z> [sx sy sz] Fill terrain voxels
  capture                                Trigger host-side viewport capture
  recipe <three-islands>                 Execute procedural multi-island scene
        `);
        break;
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
