#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import path from 'node:path';

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';
const ARTIFACT_DIR = 'C:/Users/Jhonder/.gemini/antigravity-ide/brain/5419d1ac-0ef6-4adb-9340-5a361ae0d317';
const VIEWPORT_SRC = path.resolve('viewport_latest.png');

async function sendCommand(action, args = {}) {
  const res = await fetch(`${BRIDGE_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args, wait: true })
  });
  return res.json();
}

async function captureScreen() {
  const res = await fetch(`${BRIDGE_URL}/api/capture?force=true`, { method: 'POST' });
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

async function runTour() {
  console.log(`🎬 Capturing 7-angle visual tour for Citadel Lobby V3...`);

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
    await captureScreen();

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
}

runTour().catch(e => {
  console.error('Tour failed:', e);
  process.exit(1);
});
