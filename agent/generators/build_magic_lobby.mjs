#!/usr/bin/env node
// @ts-check
/**
 * RAASE 2.1 — Harry Potter Medieval Magic Lobby Generator (V2 High-Fidelity)
 * Procedural architecture with block-based tapered trees, square keep castle towers,
 * vaulted pavilions, 5 detailed interactive zones, warm torches, and clean terrain.
 */

import fs from 'node:fs';
import path from 'node:path';

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';

async function sendCommand(action, args = {}, shouldWait = true) {
  const res = await fetch(`${BRIDGE_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args, wait: shouldWait })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const data = await res.json();
  if (shouldWait && data.report && data.report.status === 'ERROR') {
    throw new Error(`Studio Error: ${data.report.error}`);
  }
  return data;
}

async function deleteModel(modelName) {
  try {
    await sendCommand('DELETE_OBJECT', { targetPath: modelName }, true);
    console.log(`  🗑️ Cleared existing "${modelName}"`);
  } catch {
    // ignore if not found
  }
}

async function spawnBatch(modelName, instances, parent = 'workspace') {
  const CHUNK_SIZE = 120;
  console.log(`📦 Spawning model "${modelName}" (${instances.length} instances total)...`);
  for (let i = 0; i < instances.length; i += CHUNK_SIZE) {
    const chunk = instances.slice(i, i + CHUNK_SIZE);
    await sendCommand('BATCH_SPAWN', {
      modelName,
      parent,
      instances: chunk
    }, true);
    console.log(`  -> Spawned chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(instances.length / CHUNK_SIZE)} (${chunk.length} items)`);
  }
}

// Curated Fantasy Medieval Color Palette
const C = {
  stoneCobble: [130, 125, 120],
  stoneDark: [75, 72, 70],
  stoneSlate: [65, 68, 72],
  stoneLight: [165, 160, 150],
  woodDark: [70, 48, 32],
  woodLight: [135, 100, 68],
  woodPlank: [115, 82, 55],
  roofShingleRed: [120, 48, 38],
  roofShingleBlue: [42, 58, 85],
  roofShingleSlate: [52, 56, 62],
  ironDark: [42, 45, 50],
  goldTrim: [220, 175, 55],
  bronze: [165, 115, 60],
  fireYellow: [255, 205, 60],
  fireOrange: [245, 115, 30],
  magicBlue: [75, 165, 255],
  magicCyan: [60, 225, 210],
  magicPurple: [175, 85, 245],
  magicGold: [255, 220, 85],
  potionGreen: [45, 215, 85],
  potionRed: [225, 45, 60],
  potionBlue: [45, 125, 240],
  potionPurple: [180, 50, 220],
  leafPine1: [38, 78, 42],
  leafPine2: [48, 92, 52],
  leafPine3: [58, 108, 62],
  clothStraw: [195, 175, 125],
  skinElf: [235, 195, 160],
  beardBrown: [90, 65, 45]
};

// Torch Generator
function createTorch(name, position, wallMounted = false) {
  const [x, y, z] = position;
  const items = [];

  if (!wallMounted) {
    items.push({
      name: `${name}_Base`,
      className: 'Part',
      position: [x, y + 0.4, z],
      size: [1.2, 0.8, 1.2],
      material: 'Slate',
      color: C.stoneSlate,
      anchored: true
    });
    items.push({
      name: `${name}_Shaft`,
      className: 'Part',
      position: [x, y + 3.6, z],
      size: [0.6, 5.8, 0.6],
      material: 'Wood',
      color: C.woodDark,
      anchored: true
    });
  }

  const headY = wallMounted ? y : y + 6.8;

  items.push({
    name: `${name}_Sconce`,
    className: 'Part',
    position: [x, headY, z],
    size: [0.9, 0.8, 0.9],
    material: 'Metal',
    color: C.ironDark,
    anchored: true
  });
  items.push({
    name: `${name}_BasaltTip`,
    className: 'Part',
    position: [x, headY + 0.55, z],
    size: [0.55, 0.6, 0.55],
    material: 'Basalt',
    color: [25, 24, 26],
    anchored: true
  });
  items.push({
    className: 'PointLight',
    name: `${name}_Light`,
    parentPart: `${name}_BasaltTip`,
    color: [255, 175, 75],
    brightness: 2.3,
    range: 24,
    shadows: true
  });
  items.push({
    className: 'ParticleEmitter',
    name: `${name}_FlameVFX`,
    parentPart: `${name}_BasaltTip`,
    rate: 16,
    lifetime: [0.6, 1.2],
    speed: [1.2, 2.8],
    lightEmission: 0.95,
    lightInfluence: 0.05
  });

  return items;
}

// Bonfire Generator
function createBonfire(name, position) {
  const [x, y, z] = position;
  const items = [];

  items.push({
    name: `${name}_Ring`,
    className: 'Part',
    position: [x, y + 0.3, z],
    size: [5.5, 0.6, 5.5],
    material: 'Cobblestone',
    color: C.stoneDark,
    anchored: true
  });
  items.push({
    name: `${name}_Coals`,
    className: 'Part',
    position: [x, y + 0.45, z],
    size: [4.2, 0.5, 4.2],
    material: 'Basalt',
    color: [30, 26, 22],
    anchored: true
  });
  items.push({
    name: `${name}_Log1`,
    className: 'Part',
    position: [x, y + 0.85, z],
    size: [3.8, 0.7, 0.7],
    material: 'Wood',
    color: C.woodDark,
    anchored: true
  });
  items.push({
    name: `${name}_Log2`,
    className: 'Part',
    position: [x, y + 0.85, z],
    size: [0.7, 0.7, 3.8],
    material: 'Wood',
    color: C.woodDark,
    anchored: true
  });
  items.push({
    className: 'PointLight',
    name: `${name}_Light`,
    parentPart: `${name}_Coals`,
    color: [255, 160, 50],
    brightness: 2.8,
    range: 30,
    shadows: true
  });
  items.push({
    className: 'ParticleEmitter',
    name: `${name}_Flame`,
    parentPart: `${name}_Coals`,
    rate: 35,
    lifetime: [1.0, 1.8],
    speed: [2, 4.5],
    lightEmission: 0.9,
    lightInfluence: 0.1
  });

  return items;
}

// -----------------------------------------------------------------------------
// 1. PLAZA & AVENUES
// -----------------------------------------------------------------------------
function buildPlazaAndPaths() {
  const parts = [];

  // Central Octagonal/Square Courtyard
  parts.push({
    name: 'Plaza_CenterFloor',
    className: 'Part',
    position: [0, 0.15, 0],
    size: [44, 0.4, 44],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  // Slate Surrounding Border
  parts.push({
    name: 'Plaza_Curb_N',
    className: 'Part',
    position: [0, 0.35, -22.5],
    size: [46, 0.5, 1.5],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Plaza_Curb_S',
    className: 'Part',
    position: [0, 0.35, 22.5],
    size: [46, 0.5, 1.5],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Plaza_Curb_W',
    className: 'Part',
    position: [-22.5, 0.35, 0],
    size: [1.5, 0.5, 46],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Plaza_Curb_E',
    className: 'Part',
    position: [22.5, 0.35, 0],
    size: [1.5, 0.5, 46],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Central Monument / Sun Fountain
  parts.push({
    name: 'Monument_Pedestal',
    className: 'Part',
    position: [0, 1.0, 0],
    size: [7, 1.4, 7],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Monument_Shaft',
    className: 'Part',
    position: [0, 3.8, 0],
    size: [3.2, 4.4, 3.2],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  parts.push({
    name: 'Monument_Cap',
    className: 'Part',
    position: [0, 6.4, 0],
    size: [4.4, 0.8, 4.4],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  // Glowing Celestial Arcane Orb (Sphere)
  parts.push({
    name: 'Monument_Orb',
    className: 'Part',
    shape: 'Ball',
    position: [0, 8.2, 0],
    size: [2.8, 2.8, 2.8],
    material: 'Glass',
    transparency: 0.2,
    color: C.magicCyan,
    anchored: true
  });
  parts.push({
    className: 'PointLight',
    name: 'Monument_Glow',
    parentPart: 'Monument_Orb',
    color: C.magicCyan,
    brightness: 2.2,
    range: 28,
    shadows: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Monument_Sparks',
    parentPart: 'Monument_Orb',
    rate: 16,
    lifetime: [1.5, 2.5],
    speed: [0.8, 2.2],
    lightEmission: 0.95,
    lightInfluence: 0.05
  });

  // Main Cobblestone Avenues (Width 12 studs)
  // North Avenue to Matchmaking Portal (Z = -22 to -50)
  parts.push({
    name: 'Path_North_Portal',
    className: 'Part',
    position: [0, 0.15, -36],
    size: [12, 0.4, 28],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  // East Avenue to Crates Vault (X = 22 to 45)
  parts.push({
    name: 'Path_East_Crates',
    className: 'Part',
    position: [33.5, 0.15, 0],
    size: [23, 0.4, 11],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  // West Avenue to Potion Shop (X = -22 to -45)
  parts.push({
    name: 'Path_West_Potions',
    className: 'Part',
    position: [-33.5, 0.15, 0],
    size: [23, 0.4, 11],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  // South-East Path to Dueling Range
  parts.push({
    name: 'Path_SE_Dueling',
    className: 'Part',
    position: [24, 0.15, 24],
    size: [10, 0.4, 22],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  // South-West Path to Elf Forge
  parts.push({
    name: 'Path_SW_Forge',
    className: 'Part',
    position: [-24, 0.15, 24],
    size: [10, 0.4, 22],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });

  return parts;
}

// -----------------------------------------------------------------------------
// 2. ZONE 1: MATCHMAKING PORTAL & CASTLE GATE (NORTH)
// -----------------------------------------------------------------------------
function buildZone1Matchmaking() {
  const parts = [];
  const cx = 0, cz = -52;

  // Elevated Stone Dais Steps
  parts.push({
    name: 'Portal_Step_1',
    className: 'Part',
    position: [cx, 0.4, cz + 6],
    size: [24, 0.6, 6],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Portal_Step_2',
    className: 'Part',
    position: [cx, 0.9, cz + 2],
    size: [22, 0.6, 6],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  parts.push({
    name: 'Portal_Dais_Platform',
    className: 'Part',
    position: [cx, 1.4, cz - 4],
    size: [22, 0.6, 12],
    material: 'Slate',
    color: C.stoneDark,
    anchored: true
  });

  // Grand Gothic Stone Pillars
  const pillarH = 18;
  // Left Pillar
  parts.push({
    name: 'Arch_Pillar_L_Base',
    className: 'Part',
    position: [cx - 7.5, 2.6, cz - 4],
    size: [3.4, 1.8, 3.4],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Arch_Pillar_L_Shaft',
    className: 'Part',
    position: [cx - 7.5, 2.6 + pillarH / 2, cz - 4],
    size: [2.6, pillarH, 2.6],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  parts.push({
    name: 'Arch_Pillar_L_Capital',
    className: 'Part',
    position: [cx - 7.5, 2.6 + pillarH + 0.8, cz - 4],
    size: [3.4, 1.6, 3.4],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Right Pillar
  parts.push({
    name: 'Arch_Pillar_R_Base',
    className: 'Part',
    position: [cx + 7.5, 2.6, cz - 4],
    size: [3.4, 1.8, 3.4],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Arch_Pillar_R_Shaft',
    className: 'Part',
    position: [cx + 7.5, 2.6 + pillarH / 2, cz - 4],
    size: [2.6, pillarH, 2.6],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  parts.push({
    name: 'Arch_Pillar_R_Capital',
    className: 'Part',
    position: [cx + 7.5, 2.6 + pillarH + 0.8, cz - 4],
    size: [3.4, 1.6, 3.4],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Arch Crossbeam & Keystone
  parts.push({
    name: 'Arch_Lintel',
    className: 'Part',
    position: [cx, 2.6 + pillarH + 1.2, cz - 4],
    size: [18.4, 2.4, 3.4],
    material: 'Slate',
    color: C.stoneDark,
    anchored: true
  });
  parts.push({
    name: 'Arch_Keystone',
    className: 'Part',
    position: [cx, 2.6 + pillarH + 3.0, cz - 4],
    size: [4.4, 2.8, 3.8],
    material: 'Cobblestone',
    color: C.stoneLight,
    anchored: true
  });

  // Swirling Celestial Portal Core
  parts.push({
    name: 'Portal_Core',
    className: 'Part',
    shape: 'Ball',
    position: [cx, 11.5, cz - 4],
    size: [9.5, 9.5, 3.0],
    material: 'Glass',
    transparency: 0.3,
    color: C.magicBlue,
    anchored: true
  });
  parts.push({
    name: 'Portal_RuneRing',
    className: 'Part',
    position: [cx, 11.5, cz - 3.8],
    size: [11, 11, 0.4],
    material: 'Neon',
    transparency: 0.7,
    color: C.magicCyan,
    anchored: true
  });
  // Arcane Portal Lighting & Swirling Particles
  parts.push({
    className: 'PointLight',
    name: 'Portal_Glow',
    parentPart: 'Portal_Core',
    color: C.magicBlue,
    brightness: 2.8,
    range: 35,
    shadows: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Portal_VortexParticles',
    parentPart: 'Portal_Core',
    rate: 45,
    lifetime: [1.5, 2.8],
    speed: [2, 5],
    lightEmission: 1.0,
    lightInfluence: 0.0
  });

  // Matchmaking Queue Activation Pad
  parts.push({
    name: 'Portal_Queue_Pad',
    className: 'Part',
    position: [cx, 1.5, cz + 1],
    size: [6.5, 0.2, 6.5],
    material: 'Neon',
    transparency: 0.6,
    color: C.magicCyan,
    anchored: true
  });

  // Two Great Stone Fire Braziers flanking the Dais
  parts.push(...createBonfire('Portal_Brazier_L', [cx - 12, 0.4, cz + 2]));
  parts.push(...createBonfire('Portal_Brazier_R', [cx + 12, 0.4, cz + 2]));

  return parts;
}

// -----------------------------------------------------------------------------
// 3. CASTLE KEEP TOWERS & CURTAIN WALL
// -----------------------------------------------------------------------------
function buildCastleWalls() {
  const parts = [];
  const cz = -66;

  // Function to build a square keep tower
  function buildTower(name, tx, tz) {
    const tw = 12, th = 32;
    // Main Tower Body
    parts.push({
      name: `${name}_Body`,
      className: 'Part',
      position: [tx, th / 2, tz],
      size: [tw, th, tw],
      material: 'Cobblestone',
      color: C.stoneCobble,
      anchored: true
    });
    // Tower Belt / Cornice
    parts.push({
      name: `${name}_Cornice`,
      className: 'Part',
      position: [tx, th + 0.8, tz],
      size: [tw + 2, 1.6, tw + 2],
      material: 'Slate',
      color: C.stoneSlate,
      anchored: true
    });
    // Tower Parapet Crenellations
    for (let ox of [-tw / 2, 0, tw / 2]) {
      for (let oz of [-tw / 2, tw / 2]) {
        parts.push({
          name: `${name}_Crenel_${ox}_${oz}`,
          className: 'Part',
          position: [tx + ox, th + 2.4, tz + oz],
          size: [2.5, 2.2, 2.5],
          material: 'Cobblestone',
          color: C.stoneCobble,
          anchored: true
        });
      }
    }
    // Blue Shingle Spire Roof
    parts.push({
      name: `${name}_Spire_Base`,
      className: 'Part',
      position: [tx, th + 4.5, tz],
      size: [tw - 1, 4.0, tw - 1],
      material: 'WoodPlanks',
      color: C.roofShingleBlue,
      anchored: true
    });
    parts.push({
      name: `${name}_Spire_Top`,
      className: 'Part',
      position: [tx, th + 8.5, tz],
      size: [tw - 5, 4.5, tw - 5],
      material: 'WoodPlanks',
      color: C.roofShingleBlue,
      anchored: true
    });
  }

  // Left Castle Tower
  buildTower('Castle_Tower_L', -24, cz);
  // Right Castle Tower
  buildTower('Castle_Tower_R', 24, cz);

  // Connecting Curtain Wall
  parts.push({
    name: 'Castle_Curtain_Wall',
    className: 'Part',
    position: [0, 11, cz],
    size: [36, 22, 5],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  parts.push({
    name: 'Castle_Wall_Cornice',
    className: 'Part',
    position: [0, 22.8, cz],
    size: [38, 1.4, 6.2],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  // Crenels on wall
  for (let x = -14; x <= 14; x += 7) {
    parts.push({
      name: `Castle_Wall_Crenel_${x}`,
      className: 'Part',
      position: [x, 24.5, cz],
      size: [3.2, 2.2, 6.2],
      material: 'Cobblestone',
      color: C.stoneCobble,
      anchored: true
    });
  }

  return parts;
}

// -----------------------------------------------------------------------------
// 4. ZONE 2: CRATES & KEY VAULT (EAST)
// -----------------------------------------------------------------------------
function buildZone2Crates() {
  const parts = [];
  const vx = 48, vz = 0;

  // Vault Floor
  parts.push({
    name: 'Vault_Floor',
    className: 'Part',
    position: [vx, 0.4, vz],
    size: [22, 0.8, 20],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // 4 Stately Stone Pillars
  const pillars = [
    [vx - 9, vz - 8],
    [vx + 9, vz - 8],
    [vx - 9, vz + 8],
    [vx + 9, vz + 8]
  ];
  pillars.forEach(([px, pz], i) => {
    parts.push({
      name: `Vault_Pillar_${i}`,
      className: 'Part',
      position: [px, 6.5, pz],
      size: [2.2, 12, 2.2],
      material: 'Cobblestone',
      color: C.stoneCobble,
      anchored: true
    });
    parts.push({
      name: `Vault_PillarCap_${i}`,
      className: 'Part',
      position: [px, 12.8, pz],
      size: [3.0, 1.2, 3.0],
      material: 'Slate',
      color: C.stoneSlate,
      anchored: true
    });
  });

  // Vault Timber Rafters & Roof
  parts.push({
    name: 'Vault_Roof_Beam',
    className: 'Part',
    position: [vx, 13.5, vz],
    size: [22, 1.4, 20],
    material: 'Wood',
    color: C.woodDark,
    anchored: true
  });
  parts.push({
    name: 'Vault_Roof_Slant',
    className: 'Part',
    position: [vx, 15.8, vz],
    size: [20, 3.5, 18],
    material: 'WoodPlanks',
    color: C.roofShingleRed,
    anchored: true
  });

  // 3 Pedestals with Detailed Chests & Floating Keys
  const chestData = [
    { name: 'Common', offZ: -5, color: C.woodPlank, keyColor: C.magicBlue, keyGlow: [75, 165, 255] },
    { name: 'Ancient', offZ: 0, color: C.ironDark, keyColor: C.magicPurple, keyGlow: [175, 85, 245] },
    { name: 'RelicGold', offZ: 5, color: C.goldTrim, keyColor: C.magicGold, keyGlow: [255, 220, 85] }
  ];

  chestData.forEach((cd) => {
    const cx = vx + 2, cz = vz + cd.offZ;

    // Stone Pedestal
    parts.push({
      name: `Crate_Pedestal_${cd.name}`,
      className: 'Part',
      position: [cx, 1.5, cz],
      size: [3.8, 1.8, 3.2],
      material: 'Slate',
      color: C.stoneDark,
      anchored: true
    });

    // Chest Body
    parts.push({
      name: `Crate_Body_${cd.name}`,
      className: 'Part',
      position: [cx, 2.9, cz],
      size: [2.8, 1.4, 2.0],
      material: 'WoodPlanks',
      color: cd.color,
      anchored: true
    });
    // Chest Lid
    parts.push({
      name: `Crate_Lid_${cd.name}`,
      className: 'Part',
      position: [cx, 3.8, cz],
      size: [3.0, 0.6, 2.2],
      material: 'Metal',
      color: cd.color,
      anchored: true
    });
    // Chest Lock
    parts.push({
      name: `Crate_Lock_${cd.name}`,
      className: 'Part',
      position: [cx - 1.45, 3.3, cz],
      size: [0.2, 0.6, 0.5],
      material: 'Metal',
      color: C.goldTrim,
      anchored: true
    });

    // Floating Magical Key Orb
    parts.push({
      name: `Crate_KeyOrb_${cd.name}`,
      className: 'Part',
      shape: 'Ball',
      position: [cx, 5.8, cz],
      size: [1.2, 1.2, 1.2],
      material: 'Neon',
      transparency: 0.15,
      color: cd.keyColor,
      anchored: true
    });
    // Key Glow & Sparkles
    parts.push({
      className: 'PointLight',
      name: `Crate_Light_${cd.name}`,
      parentPart: `Crate_KeyOrb_${cd.name}`,
      color: cd.keyGlow,
      brightness: 2.2,
      range: 16,
      shadows: true
    });
    parts.push({
      className: 'ParticleEmitter',
      name: `Crate_KeySparkles_${cd.name}`,
      parentPart: `Crate_KeyOrb_${cd.name}`,
      rate: 14,
      lifetime: [0.8, 1.6],
      speed: [0.8, 2.0],
      lightEmission: 0.95,
      lightInfluence: 0.05
    });
  });

  // Vault Torches
  parts.push(...createTorch('Vault_Torch_1', [vx - 8.8, 4.5, vz - 7.5]));
  parts.push(...createTorch('Vault_Torch_2', [vx - 8.8, 4.5, vz + 7.5]));

  return parts;
}

// -----------------------------------------------------------------------------
// 5. ZONE 3: POTIONS SHOP & APOTHECARY (WEST)
// -----------------------------------------------------------------------------
function buildZone3Potions() {
  const parts = [];
  const sx = -48, sz = 0;

  // Cottage Foundation
  parts.push({
    name: 'PotionShop_Floor',
    className: 'Part',
    position: [sx, 0.4, sz],
    size: [22, 0.8, 22],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Stone Lower Walls
  parts.push({
    name: 'PotionShop_Wall_Back',
    className: 'Part',
    position: [sx - 9, 6, sz],
    size: [2, 11, 20],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  parts.push({
    name: 'PotionShop_Wall_N',
    className: 'Part',
    position: [sx, 6, sz - 9.5],
    size: [18, 11, 2],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });
  parts.push({
    name: 'PotionShop_Wall_S',
    className: 'Part',
    position: [sx, 6, sz + 9.5],
    size: [18, 11, 2],
    material: 'Cobblestone',
    color: C.stoneCobble,
    anchored: true
  });

  // Timber Framing Corner Posts
  for (let ox of [-9, 9]) {
    for (let oz of [-9.5, 9.5]) {
      parts.push({
        name: `PotionShop_Timber_${ox}_${oz}`,
        className: 'Part',
        position: [sx + ox, 6.5, sz + oz],
        size: [2.2, 12.5, 2.2],
        material: 'Wood',
        color: C.woodDark,
        anchored: true
      });
    }
  }

  // Wooden Shop Counter
  parts.push({
    name: 'PotionShop_Counter_Base',
    className: 'Part',
    position: [sx + 6, 2.2, sz],
    size: [2.2, 3.8, 14],
    material: 'WoodPlanks',
    color: C.woodPlank,
    anchored: true
  });
  parts.push({
    name: 'PotionShop_Counter_Top',
    className: 'Part',
    position: [sx + 6, 4.3, sz],
    size: [3.2, 0.6, 15],
    material: 'Wood',
    color: C.woodDark,
    anchored: true
  });

  // Slanted Gable Roof
  parts.push({
    name: 'PotionShop_Roof',
    className: 'Part',
    position: [sx, 14, sz],
    size: [24, 4.5, 24],
    material: 'WoodPlanks',
    color: C.roofShingleSlate,
    anchored: true
  });

  // Stone Chimney with Smoke
  parts.push({
    name: 'PotionShop_Chimney',
    className: 'Part',
    position: [sx - 7, 14, sz - 7],
    size: [3.2, 12, 3.2],
    material: 'Cobblestone',
    color: C.stoneDark,
    anchored: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'PotionShop_ChimneySmoke',
    parentPart: 'PotionShop_Chimney',
    rate: 10,
    lifetime: [2.5, 4.5],
    speed: [1.5, 3.5],
    lightEmission: 0.3,
    lightInfluence: 0.8
  });

  // Giant Bubbling Iron Cauldron
  const cldX = sx + 2, cldZ = sz - 4;
  parts.push({
    name: 'Cauldron_Body',
    className: 'Part',
    position: [cldX, 2.2, cldZ],
    size: [3.4, 2.8, 3.4],
    material: 'Metal',
    color: C.ironDark,
    anchored: true
  });
  parts.push({
    name: 'Cauldron_Liquid',
    className: 'Part',
    position: [cldX, 3.5, cldZ],
    size: [3.0, 0.3, 3.0],
    material: 'Glass',
    transparency: 0.25,
    color: C.potionGreen,
    anchored: true
  });
  parts.push({
    className: 'PointLight',
    name: 'Cauldron_Glow',
    parentPart: 'Cauldron_Liquid',
    color: C.potionGreen,
    brightness: 2.4,
    range: 18,
    shadows: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Cauldron_Steam',
    parentPart: 'Cauldron_Liquid',
    rate: 20,
    lifetime: [1.2, 2.5],
    speed: [1.2, 2.8],
    lightEmission: 0.85,
    lightInfluence: 0.15
  });

  // 3 Shelves with 15 Colorful Potion Flasks
  for (let lvl = 1; lvl <= 3; lvl++) {
    const shelfY = 3.5 + lvl * 2.2;
    parts.push({
      name: `Potion_Shelf_${lvl}`,
      className: 'Part',
      position: [sx - 7.5, shelfY, sz],
      size: [1.5, 0.4, 12],
      material: 'Wood',
      color: C.woodDark,
      anchored: true
    });

    const flaskColors = [C.potionRed, C.potionBlue, C.potionGreen, C.potionPurple, C.fireYellow];
    for (let f = 0; f < 5; f++) {
      const fz = sz - 4.5 + f * 2.2;
      parts.push({
        name: `Flask_L${lvl}_${f}`,
        className: 'Part',
        shape: 'Ball',
        position: [sx - 7.5, shelfY + 0.6, fz],
        size: [0.85, 1.1, 0.85],
        material: 'Glass',
        transparency: 0.2,
        color: flaskColors[f % flaskColors.length],
        anchored: true
      });
      parts.push({
        name: `Flask_Cork_L${lvl}_${f}`,
        className: 'Part',
        position: [sx - 7.5, shelfY + 1.25, fz],
        size: [0.35, 0.35, 0.35],
        material: 'Wood',
        color: C.woodLight,
        anchored: true
      });
    }
  }

  // Alchemy Scales & Parchment
  parts.push({
    name: 'Alchemy_Mortar',
    className: 'Part',
    position: [sx + 6, 4.9, sz + 3],
    size: [1.0, 0.8, 1.0],
    material: 'Slate',
    color: C.stoneDark,
    anchored: true
  });
  parts.push({
    name: 'Alchemy_Scroll',
    className: 'Part',
    position: [sx + 6, 4.7, sz - 2],
    size: [1.8, 0.15, 2.5],
    material: 'SmoothPlastic',
    color: [240, 225, 190],
    anchored: true
  });

  // Wall Torches
  parts.push(...createTorch('PotionShop_Torch_L', [sx + 7.8, 4.8, sz - 6], true));
  parts.push(...createTorch('PotionShop_Torch_R', [sx + 7.8, 4.8, sz + 6], true));

  return parts;
}

// -----------------------------------------------------------------------------
// 6. ZONE 4: SPELL TESTING RANGE & COMBAT MANNEQUINS (SOUTH-EAST)
// -----------------------------------------------------------------------------
function buildZone4SpellRange() {
  const parts = [];
  const rx = 42, rz = 42;

  // Sandy Training Floor
  parts.push({
    name: 'Dueling_Ring_Ground',
    className: 'Part',
    position: [rx, 0.2, rz],
    size: [32, 0.4, 32],
    material: 'Sand',
    color: [185, 165, 130],
    anchored: true
  });
  // Slate Rim
  parts.push({
    name: 'Dueling_Ring_Border',
    className: 'Part',
    position: [rx, 0.35, rz],
    size: [34, 0.5, 34],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Arcane Center Circle
  parts.push({
    name: 'Dueling_Center_Glyph',
    className: 'Part',
    position: [rx, 0.42, rz],
    size: [12, 0.1, 12],
    material: 'Neon',
    transparency: 0.7,
    color: C.magicCyan,
    anchored: true
  });

  // Wooden Split-Rail Perimeter Fence Posts
  const fencePosts = [
    [rx - 15, rz - 15], [rx, rz - 15], [rx + 15, rz - 15],
    [rx + 15, rz], [rx + 15, rz + 15],
    [rx, rz + 15], [rx - 15, rz + 15], [rx - 15, rz]
  ];
  fencePosts.forEach(([px, pz], i) => {
    parts.push({
      name: `Dueling_Post_${i}`,
      className: 'Part',
      position: [px, 2.2, pz],
      size: [1.0, 4.0, 1.0],
      material: 'Wood',
      color: C.woodDark,
      anchored: true
    });
  });

  // 3 Wizard Training Mannequins
  const dummies = [
    { name: 'Dummy_Apprentice', x: rx - 6, z: rz + 4, robe: C.woodPlank, hat: C.roofShingleBlue },
    { name: 'Dummy_BattleMage', x: rx + 1, z: rz + 7, robe: C.ironDark, hat: C.roofShingleRed },
    { name: 'Dummy_ArchMage', x: rx + 7, z: rz + 3, robe: C.magicPurple, hat: C.stoneDark }
  ];

  dummies.forEach((d) => {
    // Base Stand
    parts.push({
      name: `${d.name}_Base`,
      className: 'Part',
      position: [d.x, 0.4, d.z],
      size: [2.5, 0.4, 2.5],
      material: 'Wood',
      color: C.woodDark,
      anchored: true
    });
    // Spine
    parts.push({
      name: `${d.name}_Spine`,
      className: 'Part',
      position: [d.x, 3.2, d.z],
      size: [0.8, 5.5, 0.8],
      material: 'Wood',
      color: C.woodLight,
      anchored: true
    });
    // Torso
    parts.push({
      name: `${d.name}_Torso`,
      className: 'Part',
      position: [d.x, 3.8, d.z],
      size: [2.4, 2.8, 1.4],
      material: 'Fabric',
      color: d.robe,
      anchored: true
    });
    // Arm Beam
    parts.push({
      name: `${d.name}_Arms`,
      className: 'Part',
      position: [d.x, 4.6, d.z],
      size: [4.4, 0.7, 0.7],
      material: 'Wood',
      color: C.woodLight,
      anchored: true
    });
    // Straw Head
    parts.push({
      name: `${d.name}_Head`,
      className: 'Part',
      shape: 'Ball',
      position: [d.x, 5.8, d.z],
      size: [1.4, 1.4, 1.4],
      material: 'Fabric',
      color: C.clothStraw,
      anchored: true
    });
    // Wizard Hat Brim
    parts.push({
      name: `${d.name}_HatBrim`,
      className: 'Part',
      position: [d.x, 6.4, d.z],
      size: [2.6, 0.25, 2.6],
      material: 'Fabric',
      color: d.hat,
      anchored: true
    });
    // Wizard Hat Cone
    parts.push({
      name: `${d.name}_HatCone`,
      className: 'Part',
      position: [d.x, 7.3, d.z],
      size: [1.4, 1.8, 1.4],
      material: 'Fabric',
      color: d.hat,
      anchored: true
    });
    // Target Disc on Torso
    parts.push({
      name: `${d.name}_Target`,
      className: 'Part',
      position: [d.x, 3.8, d.z - 0.75],
      size: [1.2, 1.2, 0.15],
      material: 'SmoothPlastic',
      color: C.fireOrange,
      anchored: true
    });
    parts.push({
      className: 'PointLight',
      name: `${d.name}_TargetLight`,
      parentPart: `${d.name}_Target`,
      color: C.magicCyan,
      brightness: 1.5,
      range: 10,
      shadows: false
    });
  });

  // Range Torches
  parts.push(...createTorch('Dueling_Torch_1', [rx - 12, 0.5, rz - 8]));
  parts.push(...createTorch('Dueling_Torch_2', [rx + 12, 0.5, rz - 8]));

  return parts;
}

// -----------------------------------------------------------------------------
// 7. ZONE 5: ELF-DWARF FORGE & ARCANE ENCHANTER (SOUTH-WEST)
// -----------------------------------------------------------------------------
function buildZone5ElfForge() {
  const parts = [];
  const fx = -42, fz = 42;

  // Workshop Floor
  parts.push({
    name: 'Forge_Floor',
    className: 'Part',
    position: [fx, 0.4, fz],
    size: [22, 0.8, 22],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Stone Forge Hearth & Furnace
  const hx = fx - 5, hz = fz + 5;
  parts.push({
    name: 'Forge_Hearth_Base',
    className: 'Part',
    position: [hx, 2.5, hz],
    size: [6.5, 4.2, 6.5],
    material: 'Cobblestone',
    color: C.stoneDark,
    anchored: true
  });
  parts.push({
    name: 'Forge_Charcoal_Bed',
    className: 'Part',
    position: [hx, 3.8, hz],
    size: [4.2, 0.6, 4.2],
    material: 'Basalt',
    color: [35, 25, 20],
    anchored: true
  });
  parts.push({
    name: 'Forge_Glowing_Coals',
    className: 'Part',
    position: [hx, 4.2, hz],
    size: [3.4, 0.4, 3.4],
    material: 'Neon',
    transparency: 0.3,
    color: C.fireOrange,
    anchored: true
  });
  // Forge Fire Light & Sparks
  parts.push({
    className: 'PointLight',
    name: 'Forge_Light',
    parentPart: 'Forge_Glowing_Coals',
    color: [255, 135, 30],
    brightness: 2.9,
    range: 28,
    shadows: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Forge_Sparks',
    parentPart: 'Forge_Glowing_Coals',
    rate: 30,
    lifetime: [0.8, 1.6],
    speed: [2, 5],
    lightEmission: 1.0,
    lightInfluence: 0.0
  });

  // Hood & Chimney
  parts.push({
    name: 'Forge_Hood',
    className: 'Part',
    position: [hx, 7.2, hz],
    size: [5.8, 3.0, 5.8],
    material: 'Metal',
    color: C.ironDark,
    anchored: true
  });
  parts.push({
    name: 'Forge_Chimney',
    className: 'Part',
    position: [hx, 14, hz],
    size: [3.2, 11, 3.2],
    material: 'Cobblestone',
    color: C.stoneDark,
    anchored: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Forge_ChimneySmoke',
    parentPart: 'Forge_Chimney',
    rate: 14,
    lifetime: [2.0, 3.8],
    speed: [2, 4],
    lightEmission: 0.4,
    lightInfluence: 0.7
  });

  // Anvil on Oak Stump
  const ax = fx + 2, az = fz + 1;
  parts.push({
    name: 'Anvil_Oak_Stump',
    className: 'Part',
    position: [ax, 1.8, az],
    size: [2.8, 2.8, 2.8],
    material: 'Wood',
    color: C.woodDark,
    anchored: true
  });
  parts.push({
    name: 'Anvil_Iron_Base',
    className: 'Part',
    position: [ax, 3.4, az],
    size: [2.6, 0.8, 1.4],
    material: 'Metal',
    color: C.ironDark,
    anchored: true
  });
  parts.push({
    name: 'Anvil_Iron_Horn',
    className: 'Part',
    position: [ax + 0.3, 4.4, az],
    size: [3.4, 0.9, 1.3],
    material: 'Metal',
    color: C.ironDark,
    anchored: true
  });

  // Water Quenching Barrel with Steam
  const bx = fx + 6, bz = fz + 6;
  parts.push({
    name: 'Quench_Barrel_Body',
    className: 'Part',
    position: [bx, 2.2, bz],
    size: [2.6, 3.2, 2.6],
    material: 'WoodPlanks',
    color: C.woodPlank,
    anchored: true
  });
  parts.push({
    name: 'Quench_Barrel_Water',
    className: 'Part',
    position: [bx, 3.6, bz],
    size: [2.2, 0.2, 2.2],
    material: 'Glass',
    transparency: 0.35,
    color: [60, 140, 200],
    anchored: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Quench_Steam',
    parentPart: 'Quench_Barrel_Water',
    rate: 8,
    lifetime: [1.2, 2.2],
    speed: [0.8, 1.8],
    lightEmission: 0.7,
    lightInfluence: 0.3
  });

  // Jeweler's Bench for Rings & Armor
  const wx = fx + 4, wz = fz - 5;
  parts.push({
    name: 'Enchant_Bench_Top',
    className: 'Part',
    position: [wx, 3.2, wz],
    size: [8, 0.6, 3.2],
    material: 'Wood',
    color: C.woodDark,
    anchored: true
  });
  parts.push({
    name: 'Enchant_VelvetPad',
    className: 'Part',
    position: [wx - 1.5, 3.6, wz],
    size: [4.2, 0.25, 2.2],
    material: 'Fabric',
    color: [120, 25, 45],
    anchored: true
  });

  // 3 Glowing Magical Rings on Display
  const rings = [
    { name: 'Ring_Ruby_Fire', offX: -1.2, color: C.potionRed },
    { name: 'Ring_Sapphire_Mana', offX: 0, color: C.magicBlue },
    { name: 'Ring_Emerald_Life', offX: 1.2, color: C.potionGreen }
  ];
  rings.forEach((r) => {
    parts.push({
      name: `${r.name}_Band`,
      className: 'Part',
      position: [wx - 1.5 + r.offX, 3.85, wz],
      size: [0.7, 0.2, 0.7],
      material: 'Metal',
      color: C.goldTrim,
      anchored: true
    });
    parts.push({
      name: `${r.name}_Gem`,
      className: 'Part',
      shape: 'Ball',
      position: [wx - 1.5 + r.offX, 4.05, wz],
      size: [0.35, 0.35, 0.35],
      material: 'Neon',
      transparency: 0.1,
      color: r.color,
      anchored: true
    });
  });

  // Armor Stand (Breastplate & Helm)
  parts.push({
    name: 'ArmorStand_Breastplate',
    className: 'Part',
    position: [wx + 2.2, 4.8, wz],
    size: [1.8, 2.0, 1.0],
    material: 'Metal',
    color: [195, 200, 210],
    anchored: true
  });
  parts.push({
    name: 'ArmorStand_Helmet',
    className: 'Part',
    shape: 'Ball',
    position: [wx + 2.2, 6.1, wz],
    size: [1.2, 1.2, 1.2],
    material: 'Metal',
    color: [195, 200, 210],
    anchored: true
  });

  // THE ELF-DWARF BLACKSMITH NPC
  const ex = ax - 1.8, ez = az;
  parts.push({
    name: 'Elf_Legs',
    className: 'Part',
    position: [ex, 0.8, ez],
    size: [0.8, 1.4, 1.4],
    material: 'Leather',
    color: C.woodDark,
    anchored: true
  });
  parts.push({
    name: 'Elf_Torso',
    className: 'Part',
    position: [ex, 2.1, ez],
    size: [1.5, 1.5, 1.2],
    material: 'Fabric',
    color: [55, 95, 60],
    anchored: true
  });
  parts.push({
    name: 'Elf_Apron',
    className: 'Part',
    position: [ex + 0.15, 2.0, ez],
    size: [0.2, 1.6, 1.0],
    material: 'Leather',
    color: [100, 60, 35],
    anchored: true
  });
  // Right Arm with Hammer raised over Anvil
  parts.push({
    name: 'Elf_Arm_R',
    className: 'Part',
    position: [ex + 0.4, 2.4, ez + 0.7],
    size: [0.55, 1.1, 0.55],
    material: 'Fabric',
    color: [55, 95, 60],
    anchored: true
  });
  parts.push({
    name: 'Elf_Hammer',
    className: 'Part',
    position: [ex + 0.8, 3.4, ez + 0.7],
    size: [0.9, 0.6, 0.6],
    material: 'Metal',
    color: C.ironDark,
    anchored: true
  });
  // Elf Head
  parts.push({
    name: 'Elf_Head',
    className: 'Part',
    shape: 'Ball',
    position: [ex, 3.2, ez],
    size: [1.1, 1.1, 1.1],
    material: 'SmoothPlastic',
    color: C.skinElf,
    anchored: true
  });
  // Pointed Elf Ears
  parts.push({
    name: 'Elf_Ear_L',
    className: 'Part',
    position: [ex, 3.4, ez - 0.65],
    size: [0.2, 0.5, 0.3],
    material: 'SmoothPlastic',
    color: C.skinElf,
    anchored: true
  });
  parts.push({
    name: 'Elf_Ear_R',
    className: 'Part',
    position: [ex, 3.4, ez + 0.65],
    size: [0.2, 0.5, 0.3],
    material: 'SmoothPlastic',
    color: C.skinElf,
    anchored: true
  });
  // Braided Beard
  parts.push({
    name: 'Elf_Beard',
    className: 'Part',
    position: [ex + 0.4, 2.8, ez],
    size: [0.45, 0.9, 0.7],
    material: 'Fabric',
    color: C.beardBrown,
    anchored: true
  });

  // Forge Torches
  parts.push(...createTorch('Forge_Torch_1', [fx - 7.5, 4.5, fz - 7.5]));
  parts.push(...createTorch('Forge_Torch_2', [fx + 7.5, 4.5, fz - 7.5]));

  return parts;
}

// -----------------------------------------------------------------------------
// 8. VILLAGE COTTAGES
// -----------------------------------------------------------------------------
function buildVillageHouses() {
  const parts = [];

  function buildCottage(name, posX, posZ, shingleColor) {
    const w = 18, d = 16;
    // Foundation
    parts.push({
      name: `${name}_Foundation`,
      className: 'Part',
      position: [posX, 1.4, posZ],
      size: [w, 2.4, d],
      material: 'Cobblestone',
      color: C.stoneCobble,
      anchored: true
    });
    // Upper Walls
    parts.push({
      name: `${name}_Walls`,
      className: 'Part',
      position: [posX, 7, posZ],
      size: [w - 0.8, 9, d - 0.8],
      material: 'WoodPlanks',
      color: [220, 210, 195],
      anchored: true
    });
    // Corner Timber Beams
    for (let ox of [-w / 2 + 0.5, w / 2 - 0.5]) {
      for (let oz of [-d / 2 + 0.5, d / 2 - 0.5]) {
        parts.push({
          name: `${name}_Beam_${ox}_${oz}`,
          className: 'Part',
          position: [posX + ox, 7, posZ + oz],
          size: [1.2, 11, 1.2],
          material: 'Wood',
          color: C.woodDark,
          anchored: true
        });
      }
    }
    // Steep Gable Roof
    parts.push({
      name: `${name}_Roof`,
      className: 'Part',
      position: [posX, 13.5, posZ],
      size: [w + 2.5, 4.5, d + 2.5],
      material: 'WoodPlanks',
      color: shingleColor,
      anchored: true
    });
    // Door
    parts.push({
      name: `${name}_Door`,
      className: 'Part',
      position: [posX, 3.5, posZ + d / 2],
      size: [3.2, 5.5, 0.4],
      material: 'WoodPlanks',
      color: C.woodDark,
      anchored: true
    });
    // Chimney with Smoke
    parts.push({
      name: `${name}_Chimney`,
      className: 'Part',
      position: [posX + w / 2 - 2, 12, posZ - d / 2 + 2],
      size: [2.8, 12, 2.8],
      material: 'Cobblestone',
      color: C.stoneDark,
      anchored: true
    });
    parts.push({
      className: 'ParticleEmitter',
      name: `${name}_ChimneySmoke`,
      parentPart: `${name}_Chimney`,
      rate: 8,
      lifetime: [2.5, 4.5],
      speed: [1.5, 3.0],
      lightEmission: 0.35,
      lightInfluence: 0.75
    });

    parts.push(...createTorch(`${name}_DoorTorch`, [posX + 3.2, 4.2, posZ + d / 2 + 0.8], true));
  }

  // Cottage 1: North-West
  buildCottage('House_NW', -26, -32, C.roofShingleSlate);
  // Cottage 2: North-East
  buildCottage('House_NE', 26, -32, C.roofShingleRed);
  // Cottage 3: South (Tavern / Inn)
  buildCottage('House_South', 0, 52, C.roofShingleBlue);

  return parts;
}

// -----------------------------------------------------------------------------
// 9. ENCHANTED FOREST (STYLIZED BLOCK PINE TREES & BOULDERS)
// -----------------------------------------------------------------------------
function buildEnchantedForest() {
  const parts = [];

  function createPineTree(name, x, z, scale = 1.0) {
    const trunkH = 8 * scale;
    // Sturdy Trunk
    parts.push({
      name: `${name}_Trunk`,
      className: 'Part',
      position: [x, trunkH / 2, z],
      size: [2.0 * scale, trunkH, 2.0 * scale],
      material: 'Wood',
      color: C.woodDark,
      anchored: true
    });
    // 3 Tapered Foliage Blocks
    parts.push({
      name: `${name}_Foliage_1`,
      className: 'Part',
      position: [x, trunkH + 2 * scale, z],
      size: [10 * scale, 3.5 * scale, 10 * scale],
      material: 'Grass',
      color: C.leafPine1,
      anchored: true
    });
    parts.push({
      name: `${name}_Foliage_2`,
      className: 'Part',
      position: [x, trunkH + 4.8 * scale, z],
      size: [7.5 * scale, 3.2 * scale, 7.5 * scale],
      material: 'Grass',
      color: C.leafPine2,
      anchored: true
    });
    parts.push({
      name: `${name}_Foliage_3`,
      className: 'Part',
      position: [x, trunkH + 7.2 * scale, z],
      size: [4.8 * scale, 3.0 * scale, 4.8 * scale],
      material: 'Grass',
      color: C.leafPine3,
      anchored: true
    });
  }

  function createBoulder(name, x, z, scale = 1.0) {
    parts.push({
      name: `${name}_Rock`,
      className: 'Part',
      shape: 'Ball',
      position: [x, 1.4 * scale, z],
      size: [4.5 * scale, 3.2 * scale, 4.2 * scale],
      material: 'Slate',
      color: [95, 105, 90],
      anchored: true
    });
  }

  const treePositions = [
    // North Forest (flanking castle)
    [-46, -65, 1.3], [-40, -75, 1.5], [40, -75, 1.4], [46, -65, 1.2],
    [-60, -55, 1.1], [60, -55, 1.2],
    // East Forest
    [68, -25, 1.2], [72, 0, 1.4], [70, 25, 1.1],
    // South-East Forest
    [65, 45, 1.3], [55, 62, 1.2], [38, 70, 1.4],
    // South Forest
    [18, 68, 1.1], [-18, 68, 1.2],
    // South-West Forest
    [-38, 70, 1.3], [-55, 62, 1.2], [-65, 45, 1.1],
    // West Forest
    [-70, 25, 1.2], [-72, 0, 1.4], [-68, -25, 1.3]
  ];

  treePositions.forEach(([tx, tz, scale], idx) => {
    createPineTree(`Tree_${idx}`, tx, tz, scale);
  });

  const boulders = [
    [-55, -45, 1.2], [55, -45, 1.4], [62, -15, 1.1], [-62, 15, 1.3],
    [50, 55, 1.0], [-50, 55, 1.2]
  ];
  boulders.forEach(([bx, bz, scale], idx) => {
    createBoulder(`Boulder_${idx}`, bx, bz, scale);
  });

  // Floating Golden Wisps
  const wispAnchors = [
    [-45, 5, -45], [45, 5, -45], [55, 5, 20], [-55, 5, 20], [0, 5, 65]
  ];
  wispAnchors.forEach(([wx, wy, wz], idx) => {
    parts.push({
      name: `Forest_Wisp_${idx}`,
      className: 'Part',
      shape: 'Ball',
      position: [wx, wy, wz],
      size: [0.8, 0.8, 0.8],
      material: 'Neon',
      transparency: 0.4,
      color: C.magicGold,
      anchored: true,
      canCollide: false
    });
    parts.push({
      className: 'ParticleEmitter',
      name: `Forest_WispVFX_${idx}`,
      parentPart: `Forest_Wisp_${idx}`,
      rate: 12,
      lifetime: [2.0, 4.0],
      speed: [0.5, 1.8],
      lightEmission: 0.9,
      lightInfluence: 0.1
    });
  });

  return parts;
}

// -----------------------------------------------------------------------------
// 10. TOWN SQUARE DETAILS & LIGHTING
// -----------------------------------------------------------------------------
function buildTownSquareDetails() {
  const parts = [];

  // Central Bonfire in Courtyard
  parts.push(...createBonfire('Central_Bonfire', [0, 0.2, 12]));

  // Directional Signpost
  const sx = 0, sz = 5;
  parts.push({
    name: 'Signpost_Shaft',
    className: 'Part',
    position: [sx, 4, sz],
    size: [0.8, 7.5, 0.8],
    material: 'Wood',
    color: C.woodDark,
    anchored: true
  });
  parts.push({
    name: 'Signpost_Finial',
    className: 'Part',
    shape: 'Ball',
    position: [sx, 8.0, sz],
    size: [1.2, 1.2, 1.2],
    material: 'Metal',
    color: C.goldTrim,
    anchored: true
  });

  // 5 Directional Boards
  const signs = [
    { name: 'Sign_Portal', y: 7.2, offX: 0, offZ: -1.2, size: [0.4, 0.8, 3.2], color: C.roofShingleBlue },
    { name: 'Sign_Crates', y: 6.3, offX: 1.2, offZ: 0, size: [3.2, 0.8, 0.4], color: C.goldTrim },
    { name: 'Sign_Potions', y: 5.4, offX: -1.2, offZ: 0, size: [3.2, 0.8, 0.4], color: C.potionGreen },
    { name: 'Sign_Dueling', y: 4.5, offX: 1.0, offZ: 1.0, size: [2.8, 0.8, 0.4], color: C.roofShingleRed },
    { name: 'Sign_Forge', y: 3.6, offX: -1.0, offZ: 1.0, size: [2.8, 0.8, 0.4], color: C.ironDark }
  ];
  signs.forEach((s) => {
    parts.push({
      name: s.name,
      className: 'Part',
      position: [sx + s.offX, s.y, sz + s.offZ],
      size: s.size,
      material: 'WoodPlanks',
      color: s.color,
      anchored: true
    });
  });

  // Plaza Perimeter Torches
  const plazaTorches = [
    [-18, 0.2, -18], [18, 0.2, -18],
    [-20, 0.2, 0], [20, 0.2, 0],
    [-18, 0.2, 18], [18, 0.2, 18]
  ];
  plazaTorches.forEach(([tx, ty, tz], idx) => {
    parts.push(...createTorch(`Plaza_Torch_${idx}`, [tx, ty, tz]));
  });

  // Player Safe Spawns
  const spawns = [
    [-6, 1.0, 18], [6, 1.0, 18],
    [-8, 1.0, 12], [8, 1.0, 12]
  ];
  spawns.forEach(([spx, spy, spz], idx) => {
    parts.push({
      name: `LobbySpawn_${idx}`,
      className: 'Part',
      position: [spx, spy, spz],
      size: [4, 0.4, 4],
      material: 'Cobblestone',
      color: C.stoneLight,
      anchored: true
    });
  });

  return parts;
}

// -----------------------------------------------------------------------------
// MASTER EXECUTION
// -----------------------------------------------------------------------------
async function main() {
  console.log('===============================================================');
  console.log('🏰 RAASE 2.1 — REBUILDING MAGIC LOBBY (V2 HIGH-FIDELITY)');
  console.log('===============================================================');

  // Clear existing models
  const modelList = [
    'MagicLobby_Plaza',
    'MagicLobby_Zone1_Matchmaking',
    'MagicLobby_Castle',
    'MagicLobby_Zone2_CratesVault',
    'MagicLobby_Zone3_PotionShop',
    'MagicLobby_Zone4_SpellRange',
    'MagicLobby_Zone5_ElfForge',
    'MagicLobby_Houses',
    'MagicLobby_EnchantedForest',
    'MagicLobby_Details'
  ];
  for (const m of modelList) {
    await deleteModel(m);
  }

  // 1. Plaza
  const plaza = buildPlazaAndPaths();
  await spawnBatch('MagicLobby_Plaza', plaza);

  // 2. Zone 1: Matchmaking Portal
  const zone1 = buildZone1Matchmaking();
  await spawnBatch('MagicLobby_Zone1_Matchmaking', zone1);

  // 3. Castle Towers & Walls
  const castle = buildCastleWalls();
  await spawnBatch('MagicLobby_Castle', castle);

  // 4. Zone 2: Crates Vault
  const zone2 = buildZone2Crates();
  await spawnBatch('MagicLobby_Zone2_CratesVault', zone2);

  // 5. Zone 3: Potion Shop
  const zone3 = buildZone3Potions();
  await spawnBatch('MagicLobby_Zone3_PotionShop', zone3);

  // 6. Zone 4: Spell Testing Range
  const zone4 = buildZone4SpellRange();
  await spawnBatch('MagicLobby_Zone4_SpellRange', zone4);

  // 7. Zone 5: Elf Forge
  const zone5 = buildZone5ElfForge();
  await spawnBatch('MagicLobby_Zone5_ElfForge', zone5);

  // 8. Village Houses
  const houses = buildVillageHouses();
  await spawnBatch('MagicLobby_Houses', houses);

  // 9. Enchanted Forest
  const forest = buildEnchantedForest();
  await spawnBatch('MagicLobby_EnchantedForest', forest);

  // 10. Town Details & Torches
  const details = buildTownSquareDetails();
  await spawnBatch('MagicLobby_Details', details);

  console.log('===============================================================');
  console.log('✨ REBUILD COMPLETE WITH 100% STABLE GEOMETRY & MAXIMUM DETAIL!');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('❌ Rebuild failed:', err);
  process.exit(1);
});
