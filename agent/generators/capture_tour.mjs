#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.resolve(__dirname, '..', '..', 'captures');
const VIEWPORT_SRC = path.resolve(__dirname, '..', '..', 'viewport_latest.png');

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
  return res.json();
}

async function captureScreen() {
  const headers = {};
  const token = getBridgeToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BRIDGE_URL}/api/capture?force=true`, {
    method: 'POST',
    headers
  });
  if (res.status === 429) {
    console.warn('  ⚠️ Capture circuit breaker active (HTTP 429). Skipping viewport capture.');
    return { skipped: true };
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

const SHOTS = [
  {
    name: 'tour_1_aerial_overview',
    label: 'Vista Aérea Panorámica de la Ciudadela Mágica',
    camPos: [0, 52, 52],
    lookAt: [0, 6, -15]
  },
  {
    name: 'tour_2_street_spawn',
    label: 'Entrada desde el Spawn y Avenida Central de Piedra',
    camPos: [0, 4.0, 32],
    lookAt: [0, 6.5, -45]
  },
  {
    name: 'tour_3_castle_portal',
    label: 'Zona 1: Gran Portal del Castillo & Vórtice Celestial',
    camPos: [0, 5.5, -30],
    lookAt: [0, 9.0, -54]
  },
  {
    name: 'tour_4_crates_vault',
    label: 'Zona 2: Bóveda de Crates Estilo Gringotts & Llaves Levitantes',
    camPos: [10, 5.5, -5],
    lookAt: [32, 5.5, -5]
  },
  {
    name: 'tour_5_apothecary_cauldron',
    label: 'Zona 3: Boticario Tudor de 2 Pisos & Gran Caldero Verde',
    camPos: [-10, 5.5, -5],
    lookAt: [-32, 5.5, -5]
  },
  {
    name: 'tour_6_dueling_arena',
    label: 'Zona 4: Arena de Duelos & 3 Maniquís Hechiceros',
    camPos: [16, 6.0, 24],
    lookAt: [35, 5.0, 24]
  },
  {
    name: 'tour_7_elf_smithy',
    label: 'Zona 5: Forja del Enano Elfo, Yunque & Anillos Mágicos',
    camPos: [-12, 5.5, 24],
    lookAt: [-32, 4.5, 24]
  }
];

async function restoreCamera() {
  try {
    const luau = `
      local cam = workspace.CurrentCamera
      if cam then
        cam.CameraType = Enum.CameraType.Custom
      end
      return true
    `;
    await sendCommand('EXECUTE_LUAU', { code: luau });
    console.log('🎥 Studio camera restored to Enum.CameraType.Custom.');
  } catch (err) {
    console.warn('⚠️ Could not restore camera:', err.message);
  }
}

async function runTour() {
  console.log(`🎬 Capturing 7-angle visual tour for Citadel Lobby V3...`);

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  try {
    for (const shot of SHOTS) {
      console.log(`📸 Shooting [${shot.name}]: ${shot.label}...`);

      // Set Scriptable camera directly via Luau
      const [cx, cy, cz] = shot.camPos;
      const [lx, ly, lz] = shot.lookAt;
      const luau = `
        local cam = workspace.CurrentCamera
        cam.CameraType = Enum.CameraType.Scriptable
        cam.CFrame = CFrame.lookAt(Vector3.new(${cx}, ${cy}, ${cz}), Vector3.new(${lx}, ${ly}, ${lz}))
        game:GetService('Selection'):Set({})
        return true
      `;
      await sendCommand('EXECUTE_LUAU', { code: luau });

      // Wait a brief moment for camera rendering
      await new Promise(r => setTimeout(r, 600));

      // Trigger capture
      const capResult = await captureScreen();
      if (capResult.skipped) {
        continue;
      }

      // Copy viewport_latest.png to artifact directory
      if (fs.existsSync(VIEWPORT_SRC)) {
        const destPath = path.join(ARTIFACT_DIR, `${shot.name}.png`);
        fs.copyFileSync(VIEWPORT_SRC, destPath);
        console.log(`  -> Saved: ${destPath}`);
      } else {
        console.warn(`  ⚠️ Warning: viewport_latest.png not found`);
      }

      // Small delay between captures to satisfy circuit breaker if needed
      await new Promise(r => setTimeout(r, 800));
    }

    console.log(`🎉 Visual tour completed! All 7 images stored in artifacts.`);
  } finally {
    await restoreCamera();
  }
}

runTour().catch(e => {
  console.error('Tour failed:', e);
  process.exit(1);
});
