#!/usr/bin/env node
// @ts-check
/**
 * RAASE 2.1 — Harry Potter Medieval Citadel & High Street Lobby Generator (V3 Reimagined)
 * Completely reimagined from scratch: No isolated kiosks on grass.
 * Unified dense medieval wizarding sanctuary with continuous cobblestone plazas,
 * 2-story Tudor apothecary, Gringotts-style stone vault, Norman gatehouse portal,
 * sunken dueling arena, vaulted smithy with Elf-Dwarf NPC, and towering perimeter pine forest.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBridgeToken, sendCommand, inspectObject, querySceneGraph, BRIDGE_URL } from '../lib/bridge-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deleteModel(modelName) {
  try {
    await sendCommand('DELETE_OBJECT', { targetPath: modelName }, true);
    console.log(`  🗑️ Cleared existing "${modelName}"`);
  } catch {
    // ignore if doesn't exist
  }
}

async function spawnBatch(modelName, instances, parent = 'workspace', upsert = true) {
  const CHUNK_SIZE = 100;
  console.log(`📦 Spawning model "${modelName}" (${instances.length} instances total, upsert: ${upsert})...`);
  for (let i = 0; i < instances.length; i += CHUNK_SIZE) {
    const chunk = instances.slice(i, i + CHUNK_SIZE);
    await sendCommand('BATCH_SPAWN', {
      modelName,
      parent,
      upsert,
      instances: chunk
    }, true);
    console.log(`  -> Spawned chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(instances.length / CHUNK_SIZE)} (${chunk.length} items)`);
  }
}

// -----------------------------------------------------------------------------
// Curated Palette of Medieval Magical Architecture
// -----------------------------------------------------------------------------
const C = {
  // Stone & Masonry
  stoneStreet: [142, 138, 132],
  stoneCurb: [95, 92, 88],
  stoneWallLight: [168, 162, 154],
  stoneWallDark: [105, 100, 95],
  stoneSlate: [72, 75, 80],
  stoneMarble: [210, 208, 202],
  
  // Woods & Timbers
  woodTimberDark: [62, 42, 28],
  woodPlankWarm: [125, 90, 60],
  woodPlankAged: [98, 72, 50],
  woodTrunk: [80, 56, 38],
  
  // Stucco & Plaster
  plasterAged: [222, 216, 200],
  
  // Roofs
  roofSlateBlue: [48, 58, 74],
  roofShingleRed: [128, 52, 42],
  roofLeadDark: [55, 58, 64],
  
  // Metals
  ironBlack: [38, 40, 44],
  bronzeTrim: [175, 125, 65],
  goldRoyal: [235, 185, 55],
  silverSteel: [180, 185, 195],
  
  // Fire & Light
  flameCore: [255, 230, 120],
  flameOuter: [255, 130, 30],
  torchWood: [75, 50, 30],
  
  // Magic & Potions
  magicCyan: [60, 225, 235],
  magicBlue: [70, 145, 255],
  magicPurple: [175, 75, 245],
  magicGold: [255, 215, 60],
  potionGreen: [40, 225, 90],
  potionRed: [235, 45, 65],
  potionBlue: [45, 130, 245],
  potionViolet: [195, 55, 230],
  glassPhial: [215, 240, 255],
  
  // Foliage
  pineDark1: [32, 68, 38],
  pineDark2: [42, 82, 48],
  pineLight: [55, 102, 60],
  barkPine: [68, 48, 32],
  
  // NPC & Character
  skinElf: [238, 200, 168],
  beardDwarf: [100, 70, 48],
  tunicGreen: [45, 95, 55],
  apronLeather: [115, 75, 45]
};

// -----------------------------------------------------------------------------
// Procedural Torch & Brazier Helpers
// -----------------------------------------------------------------------------
function createWallTorch(name, pos, normal = [0, 0, 1]) {
  const [x, y, z] = pos;
  const [nx, ny, nz] = normal;
  const items = [];

  // Bracket mounted on wall
  items.push({
    name: `${name}_Mount`,
    className: 'Part',
    position: [x, y, z],
    size: [0.6, 0.6, 0.2],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });

  // Outward Arm
  const armX = x + nx * 0.7;
  const armZ = z + nz * 0.7;
  items.push({
    name: `${name}_Arm`,
    className: 'Part',
    position: [armX, y + 0.3, armZ],
    size: [0.3, 0.3, 1.0],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });

  // Sconce Bowl
  const bowlX = x + nx * 1.2;
  const bowlZ = z + nz * 1.2;
  const bowlY = y + 0.8;
  items.push({
    name: `${name}_Sconce`,
    className: 'Part',
    position: [bowlX, bowlY, bowlZ],
    size: [0.7, 0.7, 0.7],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });

  // Burning Fuel Core
  items.push({
    name: `${name}_Core`,
    className: 'Part',
    position: [bowlX, bowlY + 0.45, bowlZ],
    size: [0.45, 0.5, 0.45],
    material: 'Neon',
    color: C.flameCore,
    anchored: true
  });

  // Dynamic PointLight (Warm & Bright with Shadows)
  items.push({
    className: 'PointLight',
    name: `${name}_Light`,
    parentPart: `${name}_Core`,
    color: [255, 185, 95],
    brightness: 2.5,
    range: 26,
    shadows: true
  });

  // Dynamic Flame Particles
  items.push({
    className: 'ParticleEmitter',
    name: `${name}_Particles`,
    parentPart: `${name}_Core`,
    rate: 18,
    lifetime: [0.5, 1.1],
    speed: [1.2, 2.5],
    lightEmission: 0.95,
    lightInfluence: 0.05
  });

  return items;
}

function createFreeTorch(name, pos) {
  const [x, y, z] = pos;
  const items = [];

  // Stone base
  items.push({
    name: `${name}_Pedestal`,
    className: 'Part',
    position: [x, y + 0.4, z],
    size: [1.2, 0.8, 1.2],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Timber post
  items.push({
    name: `${name}_Post`,
    className: 'Part',
    position: [x, y + 3.8, z],
    size: [0.6, 6.0, 0.6],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });

  // Iron brazier cage
  items.push({
    name: `${name}_Cage`,
    className: 'Part',
    position: [x, y + 7.1, z],
    size: [1.1, 1.0, 1.1],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });

  // Neon flame core
  items.push({
    name: `${name}_Core`,
    className: 'Part',
    position: [x, y + 7.6, z],
    size: [0.6, 0.6, 0.6],
    material: 'Neon',
    color: C.flameCore,
    anchored: true
  });

  items.push({
    className: 'PointLight',
    name: `${name}_Light`,
    parentPart: `${name}_Core`,
    color: [255, 190, 100],
    brightness: 2.8,
    range: 28,
    shadows: true
  });

  items.push({
    className: 'ParticleEmitter',
    name: `${name}_VFX`,
    parentPart: `${name}_Core`,
    rate: 22,
    lifetime: [0.6, 1.2],
    speed: [1.5, 3.2],
    lightEmission: 0.95,
    lightInfluence: 0.05
  });

  return items;
}

// -----------------------------------------------------------------------------
// 1. URBAN CITADEL PAVEMENT & CENTRAL PLAZA
// -----------------------------------------------------------------------------
function buildUrbanPavement() {
  const parts = [];

  // Rolling Green Forest Bed extending far beyond the walls
  parts.push({
    name: 'Forest_Grass_Foundation',
    className: 'Part',
    position: [0, -0.6, -10],
    size: [240, 0.6, 240],
    material: 'Grass',
    color: [52, 98, 45],
    anchored: true
  });

  // Main Cobblestone Avenue & Courtyard (Continuous Solid Foundation, no floating gaps)
  // Covers X = -55 to +55, Z = -65 to +45
  parts.push({
    name: 'Citadel_Plaza_Bed',
    className: 'Part',
    position: [0, -0.2, -10],
    size: [110, 0.8, 110],
    material: 'Cobblestone',
    color: C.stoneStreet,
    anchored: true
  });

  // Decorative Inner Court Pattern (Polished Slate Walkways)
  // Main Central Spine leading from Spawns to Castle Gate
  parts.push({
    name: 'Spine_North_South',
    className: 'Part',
    position: [0, 0.25, -10],
    size: [16, 0.2, 108],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Cross Promenade connecting East and West zones
  parts.push({
    name: 'Promenade_East_West',
    className: 'Part',
    position: [0, 0.25, 2],
    size: [106, 0.2, 16],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Stone curbs and raised sidewalk platforms for shops
  // West Sidewalk (Apothecary & Smithy)
  parts.push({
    name: 'Sidewalk_West',
    className: 'Part',
    position: [-32, 0.5, -5],
    size: [30, 0.6, 75],
    material: 'Cobblestone',
    color: C.stoneCurb,
    anchored: true
  });

  // East Sidewalk (Vault & Dueling Colosseum)
  parts.push({
    name: 'Sidewalk_East',
    className: 'Part',
    position: [32, 0.5, -5],
    size: [30, 0.6, 75],
    material: 'Cobblestone',
    color: C.stoneCurb,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // Central Plaza: Grand Enchanted Hearth & Obelisk Monument
  // ---------------------------------------------------------------------------
  // Octagonal stone ring for central hearth
  const hx = 0, hz = 2;
  parts.push({
    name: 'Hearth_Ring_Base',
    className: 'Part',
    position: [hx, 0.6, hz],
    size: [10, 0.6, 10],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Hearth_Firepit_Bed',
    className: 'Part',
    position: [hx, 0.95, hz],
    size: [7.5, 0.3, 7.5],
    material: 'Basalt',
    color: [30, 28, 26],
    anchored: true
  });

  // Charred Firewood Logs
  parts.push({
    name: 'Hearth_Log_1',
    className: 'Part',
    position: [hx, 1.4, hz],
    size: [5.2, 0.8, 1.2],
    material: 'Wood',
    color: [45, 30, 20],
    anchored: true
  });
  parts.push({
    name: 'Hearth_Log_2',
    className: 'Part',
    position: [hx, 1.4, hz],
    size: [1.2, 0.8, 5.2],
    material: 'Wood',
    color: [45, 30, 20],
    anchored: true
  });
  parts.push({
    name: 'Hearth_Log_Diag1',
    className: 'Part',
    position: [hx, 1.8, hz],
    size: [4.4, 0.7, 1.1],
    cframeRotation: [0, 45, 12],
    material: 'Wood',
    color: [40, 26, 16],
    anchored: true
  });

  // Roaring Communal Flame Core
  parts.push({
    name: 'Hearth_FlameCore',
    className: 'Part',
    position: [hx, 2.2, hz],
    size: [2.2, 2.0, 2.2],
    material: 'Neon',
    color: C.flameCore,
    anchored: true
  });
  parts.push({
    className: 'PointLight',
    name: 'Hearth_GrandLight',
    parentPart: 'Hearth_FlameCore',
    color: [255, 195, 100],
    brightness: 3.5,
    range: 36,
    shadows: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Hearth_SmokeAndEmbers',
    parentPart: 'Hearth_FlameCore',
    rate: 35,
    lifetime: [1.2, 2.8],
    speed: [2.0, 5.5],
    lightEmission: 0.95,
    lightInfluence: 0.05
  });

  // Plaza Stone Benches for weary wizards
  const benchPositions = [
    [-8, 0.9, hz, 0],
    [8, 0.9, hz, 0],
    [0, 0.9, hz - 8, 90],
    [0, 0.9, hz + 8, 90]
  ];
  benchPositions.forEach(([bx, by, bz, rot], idx) => {
    parts.push({
      name: `Plaza_Bench_${idx}_Seat`,
      className: 'Part',
      position: [bx, by, bz],
      size: rot === 0 ? [1.8, 0.4, 5.5] : [5.5, 0.4, 1.8],
      material: 'Slate',
      color: C.stoneSlate,
      anchored: true
    });
    // Bench Legs
    const offset = 2.0;
    const leg1Pos = rot === 0 ? [bx, by - 0.4, bz - offset] : [bx - offset, by - 0.4, bz];
    const leg2Pos = rot === 0 ? [bx, by - 0.4, bz + offset] : [bx + offset, by - 0.4, bz];
    parts.push({
      name: `Plaza_Bench_${idx}_Leg1`,
      className: 'Part',
      position: leg1Pos,
      size: [1.4, 0.6, 1.4],
      material: 'Slate',
      color: C.stoneWallDark,
      anchored: true
    });
    parts.push({
      name: `Plaza_Bench_${idx}_Leg2`,
      className: 'Part',
      position: leg2Pos,
      size: [1.4, 0.6, 1.4],
      material: 'Slate',
      color: C.stoneWallDark,
      anchored: true
    });
  });

  return parts;
}

// -----------------------------------------------------------------------------
// 2. ZONE 1 (NORTH): GRAND CASTLE GATEHOUSE & CELESTIAL PORTAL
// -----------------------------------------------------------------------------
function buildZone1CastlePortal() {
  const parts = [];
  const cx = 0, cz = -54;

  // Massive Gatehouse Sillería Foundation
  parts.push({
    name: 'Gatehouse_Dais_Step1',
    className: 'Part',
    position: [cx, 0.6, cz + 10],
    size: [32, 0.8, 6],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Gatehouse_Dais_Step2',
    className: 'Part',
    position: [cx, 1.3, cz + 6],
    size: [28, 0.8, 6],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Gatehouse_Dais_Main',
    className: 'Part',
    position: [cx, 2.0, cz - 2],
    size: [28, 0.8, 14],
    material: 'Cobblestone',
    color: C.stoneStreet,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // Twin Norman Bastion Towers (Left: X = -14, Right: X = +14)
  // Height: 38 studs!
  // ---------------------------------------------------------------------------
  const towerPositions = [-14, 14];
  towerPositions.forEach((tx, i) => {
    const side = i === 0 ? 'L' : 'R';

    // Tower Plinth / Base
    parts.push({
      name: `CastleTower_${side}_Plinth`,
      className: 'Part',
      position: [tx, 3.5, cz],
      size: [11, 6, 11],
      material: 'Slate',
      color: C.stoneWallDark,
      anchored: true
    });

    // Main Tower Shaft
    parts.push({
      name: `CastleTower_${side}_Shaft`,
      className: 'Part',
      position: [tx, 16.5, cz],
      size: [9.5, 20, 9.5],
      material: 'Cobblestone',
      color: C.stoneWallLight,
      anchored: true
    });

    // Machicolations Corbel Belt
    parts.push({
      name: `CastleTower_${side}_Corbels`,
      className: 'Part',
      position: [tx, 27.5, cz],
      size: [11.5, 2.5, 11.5],
      material: 'Slate',
      color: C.stoneWallDark,
      anchored: true
    });

    // Parapet Wall Walk
    parts.push({
      name: `CastleTower_${side}_Parapet`,
      className: 'Part',
      position: [tx, 30.5, cz],
      size: [11, 3.5, 11],
      material: 'Slate',
      color: C.stoneSlate,
      anchored: true
    });

    // Crenels & Merlons (Corner battlements)
    const corners = [
      [-4.8, -4.8], [4.8, -4.8],
      [-4.8, 4.8], [4.8, 4.8]
    ];
    corners.forEach(([ox, oz], cIdx) => {
      parts.push({
        name: `CastleTower_${side}_Merlon_${cIdx}`,
        className: 'Part',
        position: [tx + ox, 33.2, cz + oz],
        size: [2.0, 2.2, 2.0],
        material: 'Slate',
        color: C.stoneWallDark,
        anchored: true
      });
    });

    // Conical Slate Spire Roof
    parts.push({
      name: `CastleTower_${side}_Roof_Tier1`,
      className: 'Part',
      position: [tx, 34.0, cz],
      size: [9.8, 2.5, 9.8],
      material: 'Slate',
      color: C.roofSlateBlue,
      anchored: true
    });
    parts.push({
      name: `CastleTower_${side}_Roof_Tier2`,
      className: 'Part',
      position: [tx, 37.0, cz],
      size: [7.2, 3.5, 7.2],
      material: 'Slate',
      color: C.roofSlateBlue,
      anchored: true
    });
    parts.push({
      name: `CastleTower_${side}_Roof_Tier3`,
      className: 'Part',
      position: [tx, 40.5, cz],
      size: [4.4, 3.5, 4.4],
      material: 'Slate',
      color: C.roofSlateBlue,
      anchored: true
    });
    parts.push({
      name: `CastleTower_${side}_Roof_Spire`,
      className: 'Part',
      position: [tx, 44.0, cz],
      size: [1.6, 4.0, 1.6],
      material: 'Metal',
      color: C.goldRoyal,
      anchored: true
    });

    // Tower Aspilleras (Arrow loop slits)
    parts.push({
      name: `CastleTower_${side}_Slit1`,
      className: 'Part',
      position: [tx, 14, cz + 4.8],
      size: [1.2, 4.5, 0.4],
      material: 'Metal',
      color: [15, 15, 18],
      anchored: true
    });
    parts.push({
      name: `CastleTower_${side}_Slit2`,
      className: 'Part',
      position: [tx, 22, cz + 4.8],
      size: [1.2, 4.5, 0.4],
      material: 'Metal',
      color: [15, 15, 18],
      anchored: true
    });

    // Medieval House Banners (Hogwarts Colors)
    const bannerColor = i === 0 ? [150, 25, 30] : [20, 105, 55]; // Gryffindor crimson / Slytherin emerald
    const bannerTrim = i === 0 ? C.goldRoyal : C.silverSteel;
    parts.push({
      name: `CastleTower_${side}_BannerPole`,
      className: 'Part',
      position: [tx, 22, cz + 5.2],
      size: [4.2, 0.3, 0.3],
      material: 'Metal',
      color: C.ironBlack,
      anchored: true
    });
    parts.push({
      name: `CastleTower_${side}_BannerFabric`,
      className: 'Part',
      position: [tx, 17, cz + 5.3],
      size: [3.4, 9.5, 0.2],
      material: 'Fabric',
      color: bannerColor,
      anchored: true
    });
    parts.push({
      name: `CastleTower_${side}_BannerTrim`,
      className: 'Part',
      position: [tx, 12, cz + 5.35],
      size: [2.6, 0.6, 0.25],
      material: 'Neon',
      color: bannerTrim,
      anchored: true
    });

    // Wall-mounted torches on towers
    parts.push(...createWallTorch(`TowerTorch_${side}`, [tx + (i === 0 ? 5.2 : -5.2), 9, cz + 4.5], [i === 0 ? 0.4 : -0.4, 0, 1]));
  });

  // ---------------------------------------------------------------------------
  // Central Great Curtain Archway & Wall-Walk Bridge
  // ---------------------------------------------------------------------------
  // Wall-Walk Bridge above the arch (connects left and right towers)
  parts.push({
    name: 'Gate_WallWalk_Slab',
    className: 'Part',
    position: [cx, 22.5, cz],
    size: [18.5, 2.5, 7.5],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Gate_WallWalk_Battlement',
    className: 'Part',
    position: [cx, 25.0, cz + 3.2],
    size: [18.5, 2.8, 1.2],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });

  // Heavy Stone Archway Jambs
  parts.push({
    name: 'Gate_Arch_Jamb_L',
    className: 'Part',
    position: [cx - 7.5, 11, cz - 1],
    size: [3.2, 18, 5.5],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Gate_Arch_Jamb_R',
    className: 'Part',
    position: [cx + 7.5, 11, cz - 1],
    size: [3.2, 18, 5.5],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  // Arch Header / Keystones
  parts.push({
    name: 'Gate_Arch_KeystoneLintel',
    className: 'Part',
    position: [cx, 19.5, cz - 1],
    size: [14.0, 3.2, 5.8],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Gate_Arch_SpandrelPeak',
    className: 'Part',
    position: [cx, 21.2, cz - 0.8],
    size: [3.5, 1.8, 6.2],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });

  // Raised Iron Portcullis Spikes
  parts.push({
    name: 'Portcullis_Beam_Top',
    className: 'Part',
    position: [cx, 17.5, cz - 0.5],
    size: [11.5, 0.8, 0.8],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });
  const barCount = 7;
  for (let b = 0; b < barCount; b++) {
    const bx = cx - 5.0 + b * (10.0 / (barCount - 1));
    parts.push({
      name: `Portcullis_Bar_${b}`,
      className: 'Part',
      position: [bx, 15.0, cz - 0.5],
      size: [0.35, 5.0, 0.35],
      material: 'Metal',
      color: C.ironBlack,
      anchored: true
    });
  }

  // ---------------------------------------------------------------------------
  // THE CELESTIAL ARCANE PORTAL (Matchmaking Gateway)
  // ---------------------------------------------------------------------------
  // Runic Teleport Dais on the floor
  parts.push({
    name: 'Portal_RuneCircle_Base',
    className: 'Part',
    position: [cx, 2.5, cz - 1.5],
    size: [10.5, 0.3, 10.5],
    material: 'Slate',
    color: [35, 38, 45],
    anchored: true
  });
  parts.push({
    name: 'Portal_RuneCircle_Glow',
    className: 'Part',
    position: [cx, 2.7, cz - 1.5],
    size: [9.0, 0.15, 9.0],
    material: 'Neon',
    color: C.magicCyan,
    anchored: true
  });

  // Main Swirling Arcane Vortex Core
  parts.push({
    name: 'Zone1_Matchmaking_PortalCore',
    className: 'Part',
    position: [cx, 10.5, cz - 2.5],
    size: [10.5, 14.5, 0.6],
    material: 'Neon',
    color: C.magicBlue,
    transparency: 0.3,
    anchored: true
  });

  // Concentric Inner Mystic Ring
  parts.push({
    name: 'Portal_InnerVortex',
    className: 'Part',
    position: [cx, 10.5, cz - 2.3],
    size: [7.5, 11.5, 0.6],
    material: 'Neon',
    color: C.magicCyan,
    transparency: 0.45,
    anchored: true
  });

  // Dynamic Cyan & Star Particle Emitters
  parts.push({
    className: 'ParticleEmitter',
    name: 'Portal_CelestialSwirl',
    parentPart: 'Zone1_Matchmaking_PortalCore',
    rate: 45,
    lifetime: [1.2, 2.6],
    speed: [2.5, 5.5],
    lightEmission: 1.0,
    lightInfluence: 0.0
  });

  // Powerful Arcane Light Casting Through Gate
  parts.push({
    className: 'PointLight',
    name: 'Portal_ArcaneLight',
    parentPart: 'Zone1_Matchmaking_PortalCore',
    color: [85, 185, 255],
    brightness: 3.8,
    range: 34,
    shadows: true
  });

  // Flanking Monumental Fire Braziers
  const brazierOffsets = [-7.8, 7.8];
  brazierOffsets.forEach((bx, idx) => {
    parts.push(...createFreeTorch(`GateBrazier_${idx}`, [cx + bx, 2.4, cz + 4.5]));
  });

  return parts;
}

// -----------------------------------------------------------------------------
// 3. ZONE 2 (EAST): THE GRINGOTTS ARCANE VAULT (CRATES & KEYS)
// -----------------------------------------------------------------------------
function buildZone2CratesVault() {
  const parts = [];
  const vx = 32, vz = -5;

  // Raised Vault Terrace Podium
  parts.push({
    name: 'Vault_Terrace_Plinth',
    className: 'Part',
    position: [vx, 1.2, vz],
    size: [24, 1.4, 26],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Vault_Terrace_Floor',
    className: 'Part',
    position: [vx, 2.0, vz],
    size: [22, 0.4, 24],
    material: 'Marble',
    color: C.stoneMarble,
    anchored: true
  });

  // Terrace Entry Stairs facing West towards Plaza
  parts.push({
    name: 'Vault_Stairs_Step1',
    className: 'Part',
    position: [vx - 12, 0.6, vz],
    size: [2.4, 0.6, 16],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Vault_Stairs_Step2',
    className: 'Part',
    position: [vx - 10, 1.2, vz],
    size: [2.4, 0.6, 16],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });

  // Back Solid Vault Wall & Portico
  parts.push({
    name: 'Vault_BackWall',
    className: 'Part',
    position: [vx + 10, 10.5, vz],
    size: [3.5, 17, 24],
    material: 'Slate',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Vault_SideWall_North',
    className: 'Part',
    position: [vx, 10.5, vz - 11],
    size: [22, 17, 2.5],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Vault_SideWall_South',
    className: 'Part',
    position: [vx, 10.5, vz + 11],
    size: [22, 17, 2.5],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });

  // Imposing Classical Stone Columns (Facing West)
  const colZ = [vz - 8, vz - 2.8, vz + 2.8, vz + 8];
  colZ.forEach((czPos, idx) => {
    // Column Base
    parts.push({
      name: `Vault_Col_${idx}_Base`,
      className: 'Part',
      position: [vx - 8.5, 2.8, czPos],
      size: [2.2, 1.2, 2.2],
      material: 'Slate',
      color: C.stoneWallDark,
      anchored: true
    });
    // Fluted Column Shaft
    parts.push({
      name: `Vault_Col_${idx}_Shaft`,
      className: 'Part',
      position: [vx - 8.5, 9.5, czPos],
      size: [1.7, 12.5, 1.7],
      material: 'Marble',
      color: C.stoneMarble,
      anchored: true
    });
    // Capital
    parts.push({
      name: `Vault_Col_${idx}_Capital`,
      className: 'Part',
      position: [vx - 8.5, 16.2, czPos],
      size: [2.2, 1.0, 2.2],
      material: 'Slate',
      color: C.stoneWallDark,
      anchored: true
    });
  });

  // Classical Entablature & Pediment Cornice
  parts.push({
    name: 'Vault_Entablature',
    className: 'Part',
    position: [vx - 8.5, 17.5, vz],
    size: [3.0, 1.6, 24],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  // Triangular Pediment Front
  parts.push({
    name: 'Vault_Pediment_Peak',
    className: 'Part',
    position: [vx - 8.5, 20.0, vz],
    size: [2.8, 3.5, 14],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  // Vault Roof Slab
  parts.push({
    name: 'Vault_Roof_Slab',
    className: 'Part',
    position: [vx + 1, 19.5, vz],
    size: [21, 1.5, 25],
    material: 'Slate',
    color: C.roofLeadDark,
    anchored: true
  });

  // Giant Iron Vault Door Inset on Back Wall
  parts.push({
    name: 'Vault_Door_Frame',
    className: 'Part',
    position: [vx + 8.0, 7.5, vz],
    size: [1.2, 10.5, 9.5],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });
  parts.push({
    name: 'Vault_Door_Panel',
    className: 'Part',
    position: [vx + 8.2, 7.5, vz],
    size: [0.8, 9.5, 8.5],
    material: 'Metal',
    color: [30, 32, 36],
    anchored: true
  });
  // Brass Vault Locking Wheel
  parts.push({
    name: 'Vault_Door_WheelHub',
    className: 'Part',
    position: [vx + 7.6, 7.5, vz],
    size: [0.6, 2.2, 2.2],
    material: 'Metal',
    color: C.goldRoyal,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // 3 CRATE PEDESTALS & TIERED CHESTS
  // ---------------------------------------------------------------------------
  const chestData = [
    {
      tier: 'Common',
      name: 'Zone2_Crate_Common',
      label: 'Cofre de Roble Antiguo',
      offsetZ: -6.5,
      woodColor: C.woodPlankWarm,
      trimColor: C.bronzeTrim,
      keyColor: C.bronzeTrim,
      lightColor: [220, 160, 80],
      glowNeon: false
    },
    {
      tier: 'Rare',
      name: 'Zone2_Crate_Rare',
      label: 'Bóveda de Hierro Rúnico',
      offsetZ: 0,
      woodColor: [50, 52, 58],
      trimColor: C.silverSteel,
      keyColor: C.magicCyan,
      lightColor: [80, 200, 255],
      glowNeon: true
    },
    {
      tier: 'Legendary',
      name: 'Zone2_Crate_Legendary',
      label: 'Reliquia Real Arcana',
      offsetZ: 6.5,
      woodColor: [80, 25, 25],
      trimColor: C.goldRoyal,
      keyColor: C.magicGold,
      lightColor: [255, 215, 60],
      glowNeon: true
    }
  ];

  chestData.forEach(cd => {
    const px = vx - 1.0;
    const pz = vz + cd.offsetZ;

    // Polished Stone Pedestal
    parts.push({
      name: `${cd.name}_Pedestal_Base`,
      className: 'Part',
      position: [px, 2.7, pz],
      size: [4.4, 1.0, 4.4],
      material: 'Slate',
      color: C.stoneWallDark,
      anchored: true
    });
    parts.push({
      name: `${cd.name}_Pedestal_Cap`,
      className: 'Part',
      position: [px, 3.5, pz],
      size: [3.8, 0.6, 3.8],
      material: 'Marble',
      color: C.stoneMarble,
      anchored: true
    });

    // Medieval Chest Body
    parts.push({
      name: `${cd.name}_ChestBody`,
      className: 'Part',
      position: [px, 4.6, pz],
      size: [2.6, 1.6, 3.2],
      material: 'Wood',
      color: cd.woodColor,
      anchored: true
    });
    // Curved/Beveled Chest Lid
    parts.push({
      name: `${cd.name}_ChestLid`,
      className: 'Part',
      position: [px, 5.7, pz],
      size: [2.8, 0.7, 3.4],
      material: 'Wood',
      color: cd.woodColor,
      anchored: true
    });
    // Metal Straps & Lock
    parts.push({
      name: `${cd.name}_LockHasp`,
      className: 'Part',
      position: [px - 1.35, 5.0, pz],
      size: [0.2, 0.8, 0.6],
      material: 'Metal',
      color: cd.trimColor,
      anchored: true
    });

    // FLOATING 3D MAGICAL KEY (Levitating & Glowing above Chest)
    const keyY = 7.6;
    parts.push({
      name: `${cd.name}_MagicKey_Shaft`,
      className: 'Part',
      position: [px, keyY, pz],
      size: [0.2, 1.4, 0.2],
      material: cd.glowNeon ? 'Neon' : 'Metal',
      color: cd.keyColor,
      anchored: true
    });
    parts.push({
      name: `${cd.name}_MagicKey_Handle`,
      className: 'Part',
      position: [px, keyY + 0.8, pz],
      size: [0.2, 0.6, 0.6],
      material: cd.glowNeon ? 'Neon' : 'Metal',
      color: cd.keyColor,
      anchored: true
    });
    parts.push({
      name: `${cd.name}_MagicKey_Bit`,
      className: 'Part',
      position: [px, keyY - 0.4, pz + 0.25],
      size: [0.2, 0.4, 0.35],
      material: cd.glowNeon ? 'Neon' : 'Metal',
      color: cd.keyColor,
      anchored: true
    });

    // Key Sparkle Aura & Light
    parts.push({
      className: 'PointLight',
      name: `${cd.name}_KeyLight`,
      parentPart: `${cd.name}_MagicKey_Shaft`,
      color: cd.lightColor,
      brightness: 2.5,
      range: 12,
      shadows: false
    });
    parts.push({
      className: 'ParticleEmitter',
      name: `${cd.name}_KeySparkles`,
      parentPart: `${cd.name}_MagicKey_Shaft`,
      rate: 14,
      lifetime: [0.6, 1.4],
      speed: [0.6, 1.8],
      lightEmission: 0.9,
      lightInfluence: 0.1
    });
  });

  // Sconce torches on vault walls
  parts.push(...createWallTorch('Vault_Torch_N', [vx - 6, 7.5, vz - 9.5], [0, 0, 1]));
  parts.push(...createWallTorch('Vault_Torch_S', [vx - 6, 7.5, vz + 9.5], [0, 0, -1]));

  return parts;
}

// -----------------------------------------------------------------------------
// 4. ZONE 3 (WEST): "THE BUBBLING CAULDRON" TUDOR APOTHECARY
// -----------------------------------------------------------------------------
function buildZone3Apothecary() {
  const parts = [];
  const ax = -32, az = -5;

  // Ground Floor: Aged Stone Foundation & Walls
  parts.push({
    name: 'Apothecary_GFloor_Foundation',
    className: 'Part',
    position: [ax, 1.0, az],
    size: [22, 1.2, 24],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });

  // Stone Walls of Ground Floor
  parts.push({
    name: 'Apothecary_GFloor_Wall_Back',
    className: 'Part',
    position: [ax - 10, 7.0, az],
    size: [2.5, 11, 24],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_GFloor_Wall_North',
    className: 'Part',
    position: [ax, 7.0, az - 11],
    size: [22, 11, 2.5],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_GFloor_Wall_South',
    className: 'Part',
    position: [ax, 7.0, az + 11],
    size: [22, 11, 2.5],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  // Front Wall with Doorway & Grand Bay Shop Window
  parts.push({
    name: 'Apothecary_GFloor_Front_L',
    className: 'Part',
    position: [ax + 9.5, 7.0, az - 7.5],
    size: [2.0, 11, 7.0],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_GFloor_Front_R',
    className: 'Part',
    position: [ax + 9.5, 7.0, az + 7.5],
    size: [2.0, 11, 7.0],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_GFloor_DoorLintel',
    className: 'Part',
    position: [ax + 9.5, 10.5, az + 2.5],
    size: [2.0, 3.5, 4.0],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });

  // Shop Glass Bay Window with warm interior glow
  parts.push({
    name: 'Apothecary_BayWindow_Glass',
    className: 'Part',
    position: [ax + 10.5, 6.5, az - 2.5],
    size: [1.8, 6.5, 6.0],
    material: 'Glass',
    color: [255, 230, 170],
    transparency: 0.45,
    anchored: true
  });
  parts.push({
    className: 'PointLight',
    name: 'Apothecary_WindowGlow',
    parentPart: 'Apothecary_BayWindow_Glass',
    color: [255, 210, 130],
    brightness: 2.2,
    range: 16,
    shadows: false
  });

  // ---------------------------------------------------------------------------
  // Second Floor: Tudor Timber-Framing with Voladizo (Jettying overhang)
  // Overhangs 3 studs forward toward the street (X = +1.5)
  // ---------------------------------------------------------------------------
  const fx = ax + 1.2;
  // Overhanging Jetty Floor Beams
  parts.push({
    name: 'Tudor_Jetty_FloorBeams',
    className: 'Part',
    position: [fx, 13.0, az],
    size: [24.5, 1.2, 26],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });

  // Upper Floor Walls (Aged Plaster Stucco)
  parts.push({
    name: 'Tudor_Upper_Plaster_Front',
    className: 'Part',
    position: [fx + 11.2, 18.5, az],
    size: [1.2, 10, 24],
    material: 'Concrete',
    color: C.plasterAged,
    anchored: true
  });
  parts.push({
    name: 'Tudor_Upper_Plaster_Back',
    className: 'Part',
    position: [fx - 11.2, 18.5, az],
    size: [1.2, 10, 24],
    material: 'Concrete',
    color: C.plasterAged,
    anchored: true
  });
  parts.push({
    name: 'Tudor_Upper_Plaster_North',
    className: 'Part',
    position: [fx, 18.5, az - 11.5],
    size: [22, 10, 1.2],
    material: 'Concrete',
    color: C.plasterAged,
    anchored: true
  });
  parts.push({
    name: 'Tudor_Upper_Plaster_South',
    className: 'Part',
    position: [fx, 18.5, az + 11.5],
    size: [22, 10, 1.2],
    material: 'Concrete',
    color: C.plasterAged,
    anchored: true
  });

  // Tudor Dark Oak Half-Timber Beams (Framing Grid)
  const timberPosts = [-10, -5, 0, 5, 10];
  timberPosts.forEach((tz, idx) => {
    parts.push({
      name: `Tudor_Beam_Front_${idx}`,
      className: 'Part',
      position: [fx + 11.9, 18.5, az + tz],
      size: [0.4, 10, 0.8],
      material: 'Wood',
      color: C.woodTimberDark,
      anchored: true
    });
  });
  // Diagonal Tudor Braces
  parts.push({
    name: 'Tudor_Brace_L',
    className: 'Part',
    position: [fx + 11.85, 18.5, az - 7.5],
    size: [0.35, 7.5, 0.8],
    cframeRotation: [35, 0, 0],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });
  parts.push({
    name: 'Tudor_Brace_R',
    className: 'Part',
    position: [fx + 11.85, 18.5, az + 7.5],
    size: [0.35, 7.5, 0.8],
    cframeRotation: [-35, 0, 0],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });

  // Steep Pitched Slate Shingle Roof with Gable End
  parts.push({
    name: 'Apothecary_Roof_Gable',
    className: 'Part',
    position: [fx, 25.5, az],
    size: [26, 4.5, 27],
    material: 'Slate',
    color: C.roofShingleRed,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_Roof_Ridge',
    className: 'Part',
    position: [fx, 28.5, az],
    size: [26, 2.0, 12],
    material: 'Slate',
    color: C.roofSlateBlue,
    anchored: true
  });

  // Tall Stone Chimney with Hearth Smoke
  parts.push({
    name: 'Apothecary_Chimney_Base',
    className: 'Part',
    position: [fx - 8, 18, az + 10],
    size: [3.5, 18, 3.5],
    material: 'Cobblestone',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_Chimney_Top',
    className: 'Part',
    position: [fx - 8, 28, az + 10],
    size: [4.2, 2.5, 4.2],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Apothecary_ChimneySmoke',
    parentPart: 'Apothecary_Chimney_Top',
    rate: 15,
    lifetime: [2.0, 4.5],
    speed: [1.5, 3.5],
    lightEmission: 0.1,
    lightInfluence: 0.9
  });

  // ---------------------------------------------------------------------------
  // FRONT PORCH & THE GIANT BUBBLING EMERALD CAULDRON
  // ---------------------------------------------------------------------------
  // Porch Wooden Awning Roof
  parts.push({
    name: 'Apothecary_Porch_Awning',
    className: 'Part',
    position: [ax + 14.5, 8.5, az],
    size: [6.0, 0.6, 18.0],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_Porch_Post_N',
    className: 'Part',
    position: [ax + 17.0, 4.5, az - 8.0],
    size: [0.8, 8.0, 0.8],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });
  parts.push({
    name: 'Apothecary_Porch_Post_S',
    className: 'Part',
    position: [ax + 17.0, 4.5, az + 8.0],
    size: [0.8, 8.0, 0.8],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });

  // The Giant Cast-Iron Cauldron (Tripod Base, Heavy Belly, Glowing Emerald Brew)
  const cx = ax + 14.5, cz = az - 2.0;

  // Fire pit under cauldron
  parts.push({
    name: 'Cauldron_FireRing',
    className: 'Part',
    position: [cx, 0.7, cz],
    size: [4.2, 0.4, 4.2],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Cauldron_Embers',
    className: 'Part',
    position: [cx, 0.95, cz],
    size: [2.8, 0.3, 2.8],
    material: 'Neon',
    color: C.flameOuter,
    anchored: true
  });

  // Cauldron Legs (Tripod)
  const legAngles = [0, 120, 240];
  legAngles.forEach((ang, lIdx) => {
    const rad = (ang * Math.PI) / 180;
    const lx = cx + Math.cos(rad) * 1.6;
    const lz = cz + Math.sin(rad) * 1.6;
    parts.push({
      name: `Cauldron_Leg_${lIdx}`,
      className: 'Part',
      position: [lx, 1.6, lz],
      size: [0.6, 1.8, 0.6],
      material: 'Metal',
      color: C.ironBlack,
      anchored: true
    });
  });

  // Cauldron Heavy Belly
  parts.push({
    name: 'Cauldron_Belly_Base',
    className: 'Part',
    position: [cx, 2.2, cz],
    size: [3.8, 1.2, 3.8],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });
  parts.push({
    name: 'Cauldron_Belly_Mid',
    className: 'Part',
    position: [cx, 3.2, cz],
    size: [4.6, 1.4, 4.6],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });
  parts.push({
    name: 'Cauldron_Belly_Rim',
    className: 'Part',
    position: [cx, 4.0, cz],
    size: [4.8, 0.6, 4.8],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });

  // Glowing Emerald Bubbling Potion Liquid Surface (Translucent Glass)
  parts.push({
    name: 'Zone3_Potions_CauldronLiquid',
    className: 'Part',
    position: [cx, 3.85, cz],
    size: [4.1, 0.2, 4.1],
    material: 'Glass',
    color: [25, 205, 85],
    transparency: 0.25,
    anchored: true
  });

  // Floating Boiling Bubbles
  const bubbleOffsets = [
    [-0.8, 4.1, -0.6, 0.7],
    [0.7, 4.2, 0.5, 0.8],
    [-0.3, 4.3, 0.9, 0.6],
    [0.6, 4.15, -0.8, 0.5]
  ];
  bubbleOffsets.forEach(([bx, by, bz, bSize], idx) => {
    parts.push({
      name: `Cauldron_Bubble_${idx}`,
      className: 'Part',
      position: [cx + bx, by, cz + bz],
      size: [bSize, bSize, bSize],
      material: 'Glass',
      color: [40, 240, 110],
      transparency: 0.3,
      anchored: true
    });
  });

  // Cauldron Magical Steam & Green Bubble Particles
  parts.push({
    className: 'ParticleEmitter',
    name: 'Cauldron_GreenVapor',
    parentPart: 'Zone3_Potions_CauldronLiquid',
    rate: 20,
    lifetime: [0.8, 1.8],
    speed: [0.8, 2.0],
    lightEmission: 0.8,
    lightInfluence: 0.2
  });

  // Soft Emerald Light Illuminating Porch
  parts.push({
    className: 'PointLight',
    name: 'Cauldron_MagicLight',
    parentPart: 'Zone3_Potions_CauldronLiquid',
    color: [45, 230, 95],
    brightness: 1.4,
    range: 15,
    shadows: true
  });

  // ---------------------------------------------------------------------------
  // Apothecary Outdoor Potion Shelf Racks & 12 Colorful Vials
  // ---------------------------------------------------------------------------
  const rx = ax + 10.8, rz = az + 5.5;
  // Wooden Shelf Framework
  parts.push({
    name: 'PotionRack_Backboard',
    className: 'Part',
    position: [rx, 4.2, rz],
    size: [0.6, 6.0, 5.2],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });
  const shelfHeights = [2.2, 3.8, 5.4];
  shelfHeights.forEach((sy, sIdx) => {
    parts.push({
      name: `PotionRack_Shelf_${sIdx}`,
      className: 'Part',
      position: [rx + 0.6, sy, rz],
      size: [1.4, 0.3, 5.0],
      material: 'Wood',
      color: C.woodPlankWarm,
      anchored: true
    });
  });

  // 12 Glowing Potion Phials on Shelves
  const potionColors = [
    C.potionRed, C.potionGreen, C.potionBlue, C.potionViolet,
    C.magicGold, C.magicCyan, C.potionRed, C.potionGreen,
    C.potionBlue, C.potionViolet, C.magicGold, C.magicCyan
  ];
  potionColors.forEach((pCol, pIdx) => {
    const sIdx = Math.floor(pIdx / 4);
    const colIdx = pIdx % 4;
    const py = shelfHeights[sIdx] + 0.55;
    const pzPos = rz - 1.8 + colIdx * 1.2;
    parts.push({
      name: `PotionBottle_${pIdx}`,
      className: 'Part',
      position: [rx + 0.6, py, pzPos],
      size: [0.5, 0.8, 0.5],
      material: 'Neon',
      color: pCol,
      anchored: true
    });
  });

  // Sconce torches on shop front
  parts.push(...createWallTorch('Apothecary_Torch_L', [ax + 10.2, 6.5, az - 9.0], [1, 0, 0]));
  parts.push(...createWallTorch('Apothecary_Torch_R', [ax + 10.2, 6.5, az + 9.0], [1, 0, 0]));

  return parts;
}

// -----------------------------------------------------------------------------
// 5. ZONE 4 (SOUTHEAST): THE SPELLCASTER'S DUELING ARENA & MANNEQUINS
// -----------------------------------------------------------------------------
function buildZone4DuelingArena() {
  const parts = [];
  const dx = 32, dz = 24;

  // Sunken Circular Stone Arena Bed
  parts.push({
    name: 'Dueling_Arena_Bed',
    className: 'Part',
    position: [dx, 0.4, dz],
    size: [26, 0.6, 26],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  // Inner Sand / Crushed Stone Fighting Pit
  parts.push({
    name: 'Dueling_Arena_SandPit',
    className: 'Part',
    position: [dx, 0.75, dz],
    size: [22, 0.2, 22],
    material: 'Sand',
    color: [180, 165, 135],
    anchored: true
  });

  // Inlaid Magical Dueling Rune Circle on Ground (Carved Dark Basalt & Arcane Inlay)
  parts.push({
    name: 'Dueling_RuneCircle_Outer',
    className: 'Part',
    position: [dx, 0.82, dz],
    size: [17, 0.08, 17],
    material: 'Slate',
    color: [45, 42, 48],
    anchored: true
  });
  parts.push({
    name: 'Dueling_RuneCircle_InnerBed',
    className: 'Part',
    position: [dx, 0.86, dz],
    size: [13, 0.05, 13],
    material: 'Slate',
    color: [35, 33, 40],
    anchored: true
  });
  parts.push({
    name: 'Dueling_RuneStar_Inner',
    className: 'Part',
    position: [dx, 0.90, dz],
    size: [9, 0.05, 9],
    cframeRotation: [0, 45, 0],
    material: 'Neon',
    color: C.magicCyan,
    transparency: 0.65,
    anchored: true
  });

  // Low Perimeter Stone Balustrade & Pillars
  const arenaCorners = [
    [-12, -12], [12, -12],
    [-12, 12], [12, 12]
  ];
  arenaCorners.forEach(([ox, oz], cIdx) => {
    // Corner Stone Pillar
    parts.push({
      name: `Dueling_Col_${cIdx}`,
      className: 'Part',
      position: [dx + ox, 2.5, dz + oz],
      size: [2.2, 4.0, 2.2],
      material: 'Slate',
      color: C.stoneSlate,
      anchored: true
    });
    // Fire Brazier on Corner Pillar
    parts.push(...createFreeTorch(`Dueling_Brazier_${cIdx}`, [dx + ox, 4.5, dz + oz]));
  });

  // Balustrade Walls connecting pillars
  parts.push({
    name: 'Dueling_Rail_North',
    className: 'Part',
    position: [dx, 1.8, dz - 12],
    size: [22, 2.0, 1.2],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Dueling_Rail_South',
    className: 'Part',
    position: [dx, 1.8, dz + 12],
    size: [22, 2.0, 1.2],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Dueling_Rail_East',
    className: 'Part',
    position: [dx + 12, 1.8, dz],
    size: [1.2, 2.0, 22],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // 3 DISTINCT WIZARD TARGET MANNEQUINS
  // ---------------------------------------------------------------------------
  const mannequinData = [
    {
      id: 1,
      modelName: 'Zone4_Dueling_Dummy_Apprentice',
      title: 'Maniquí de Aprendiz',
      offsetZ: -6.0,
      robeColor: [45, 95, 175], // Royal Blue Robes
      hatColor: [35, 75, 145],
      hatTrim: C.goldRoyal,
      level: 'Nv. 1',
      maxHp: 100
    },
    {
      id: 2,
      modelName: 'Zone4_Dueling_Dummy_Battle',
      title: 'Maniquí de Batalla',
      offsetZ: 0.0,
      robeColor: [165, 40, 40], // Crimson Red Robes
      hatColor: [130, 30, 30],
      hatTrim: C.silverSteel,
      level: 'Nv. 25',
      maxHp: 500
    },
    {
      id: 3,
      modelName: 'Zone4_Dueling_Dummy_Archmage',
      title: 'Maniquí de Archimago',
      offsetZ: 6.0,
      robeColor: [110, 35, 160], // Arcane Purple Robes
      hatColor: [85, 25, 125],
      hatTrim: C.magicCyan,
      level: 'Nv. 60',
      maxHp: 2000
    }
  ];

  mannequinData.forEach(md => {
    const mx = dx + 3.5;
    const mz = dz + md.offsetZ;

    // Heavy Round Wooden Swivel Base
    parts.push({
      name: `${md.modelName}_BasePlate`,
      className: 'Part',
      position: [mx, 1.1, mz],
      size: [2.8, 0.4, 2.8],
      material: 'Wood',
      color: C.woodTimberDark,
      anchored: true
    });

    // Central Wooden Pivot Post
    parts.push({
      name: `${md.modelName}_StandPost`,
      className: 'Part',
      position: [mx, 2.6, mz],
      size: [0.6, 2.8, 0.6],
      material: 'Wood',
      color: C.woodPlankAged,
      anchored: true
    });

    // Crossbar Shoulder Spar
    parts.push({
      name: `${md.modelName}_ShoulderSpar`,
      className: 'Part',
      position: [mx, 4.4, mz],
      size: [0.5, 0.5, 3.2],
      material: 'Wood',
      color: C.woodPlankAged,
      anchored: true
    });

    // Straw / Cloth Torso
    parts.push({
      name: `${md.modelName}_Torso`,
      className: 'Part',
      position: [mx, 3.6, mz],
      size: [1.8, 2.4, 2.2],
      material: 'Fabric',
      color: md.robeColor,
      anchored: true
    });

    // Straw Head
    parts.push({
      name: `${md.modelName}_Head`,
      className: 'Part',
      position: [mx, 5.3, mz],
      size: [1.3, 1.3, 1.3],
      material: 'Fabric',
      color: [205, 185, 140], // Straw canvas
      anchored: true
    });

    // Pointed Wizard Hat: Brim
    parts.push({
      name: `${md.modelName}_HatBrim`,
      className: 'Part',
      position: [mx, 6.0, mz],
      size: [2.5, 0.25, 2.5],
      material: 'Fabric',
      color: md.hatColor,
      anchored: true
    });
    // Pointed Wizard Hat: Cone Crown
    parts.push({
      name: `${md.modelName}_HatCone_Mid`,
      className: 'Part',
      position: [mx, 6.7, mz],
      size: [1.6, 1.2, 1.6],
      material: 'Fabric',
      color: md.hatColor,
      anchored: true
    });
    parts.push({
      name: `${md.modelName}_HatCone_Tip`,
      className: 'Part',
      position: [mx + 0.1, 7.5, mz],
      size: [0.9, 1.2, 0.9],
      material: 'Fabric',
      color: md.hatColor,
      anchored: true
    });
    parts.push({
      name: `${md.modelName}_HatBand`,
      className: 'Part',
      position: [mx, 6.2, mz],
      size: [1.7, 0.3, 1.7],
      material: 'Neon',
      color: md.hatTrim,
      anchored: true
    });

    // Target Decal / Practice Wand in Hand
    parts.push({
      name: `${md.modelName}_TargetRing`,
      className: 'Part',
      position: [mx - 0.95, 3.6, mz],
      size: [0.1, 1.2, 1.2],
      material: 'Neon',
      color: [255, 60, 60],
      anchored: true
    });
  });

  return parts;
}

// -----------------------------------------------------------------------------
// 6. ZONE 5 (SOUTHWEST): THE ELF-DWARF ARTIFICER SMITHY & LAPIDARY
// -----------------------------------------------------------------------------
function buildZone5ElfSmithy() {
  const parts = [];
  const sx = -32, sz = 24;

  // Raised Flagstone Workshop Floor
  parts.push({
    name: 'Smithy_Floor_Slab',
    className: 'Part',
    position: [sx, 1.0, sz],
    size: [22, 1.2, 24],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });

  // Solid Stone Back & Side Enclosure (Castle wall integration)
  parts.push({
    name: 'Smithy_BackWall',
    className: 'Part',
    position: [sx - 10, 8.5, sz],
    size: [2.5, 14, 24],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });
  parts.push({
    name: 'Smithy_SideWall_South',
    className: 'Part',
    position: [sx, 8.5, sz + 11],
    size: [22, 14, 2.5],
    material: 'Cobblestone',
    color: C.stoneWallLight,
    anchored: true
  });

  // Vaulted Open Stone Arcade Pillars (Facing the Courtyard)
  const arcadePillars = [sz - 9, sz, sz + 9];
  arcadePillars.forEach((pz, idx) => {
    parts.push({
      name: `Smithy_ArcadePillar_${idx}`,
      className: 'Part',
      position: [sx + 9.5, 7.5, pz],
      size: [2.4, 12, 2.4],
      material: 'Slate',
      color: C.stoneSlate,
      anchored: true
    });
  });
  // Arcade Heavy Stone Lintel & Vault Ceiling
  parts.push({
    name: 'Smithy_Arcade_Lintel',
    className: 'Part',
    position: [sx + 9.5, 14.0, sz],
    size: [2.8, 2.0, 24],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Smithy_Vault_Ceiling',
    className: 'Part',
    position: [sx, 15.0, sz],
    size: [22, 1.5, 25],
    material: 'Slate',
    color: C.roofLeadDark,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // The Roaring Arcane Forge Hearth & Chimney
  // ---------------------------------------------------------------------------
  const fx = sx - 6.5, fz = sz - 6.5;
  // Hearth Stone Mantel
  parts.push({
    name: 'Forge_Hearth_Base',
    className: 'Part',
    position: [fx, 3.2, fz],
    size: [6.5, 3.2, 6.5],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  // Burning Coal Bed
  parts.push({
    name: 'Zone5_Forge_FireBed',
    className: 'Part',
    position: [fx, 4.9, fz],
    size: [4.4, 0.4, 4.4],
    material: 'Neon',
    color: C.flameOuter,
    anchored: true
  });
  parts.push({
    className: 'PointLight',
    name: 'Forge_OrangeGlow',
    parentPart: 'Zone5_Forge_FireBed',
    color: [255, 140, 40],
    brightness: 3.4,
    range: 24,
    shadows: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Forge_EmbersVFX',
    parentPart: 'Zone5_Forge_FireBed',
    rate: 30,
    lifetime: [0.8, 2.0],
    speed: [2.0, 4.5],
    lightEmission: 0.95,
    lightInfluence: 0.05
  });

  // Tapered Copper Smoke Hood with Iron Riveted Rim & Stone Chimney
  parts.push({
    name: 'Forge_SmokeHood_Rim',
    className: 'Part',
    position: [fx, 7.2, fz],
    size: [7.2, 0.8, 7.2],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });
  parts.push({
    name: 'Forge_SmokeHood_Mid',
    className: 'Part',
    position: [fx, 8.8, fz],
    size: [5.8, 2.4, 5.8],
    material: 'Metal',
    color: C.bronzeTrim,
    anchored: true
  });
  parts.push({
    name: 'Forge_SmokeHood_Top',
    className: 'Part',
    position: [fx, 10.4, fz],
    size: [4.7, 1.2, 4.7],
    material: 'Metal',
    color: C.bronzeTrim,
    anchored: true
  });
  parts.push({
    name: 'Forge_Chimney_Rise',
    className: 'Part',
    position: [fx, 17.0, fz],
    size: [4.5, 12.0, 4.5],
    material: 'Cobblestone',
    color: C.stoneWallDark,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // Anvil on Oak Stump & Quenching Trough
  // ---------------------------------------------------------------------------
  const ax = sx + 2.0, az = sz - 4.0;
  // Ancient Oak Stump
  parts.push({
    name: 'Anvil_Stump',
    className: 'Part',
    position: [ax, 2.6, az],
    size: [2.8, 2.2, 2.8],
    material: 'Wood',
    color: C.woodTrunk,
    anchored: true
  });
  // Forged Steel Anvil
  parts.push({
    name: 'Zone5_Blacksmith_Anvil',
    className: 'Part',
    position: [ax, 4.2, az],
    size: [1.8, 1.4, 3.6],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });
  // Anvil Horn
  parts.push({
    name: 'Anvil_Horn',
    className: 'Part',
    position: [ax, 4.5, az + 2.3],
    size: [1.0, 0.7, 1.2],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });

  // Quenching Water Trough
  parts.push({
    name: 'Quench_Trough_Frame',
    className: 'Part',
    position: [ax - 4.5, 2.5, az],
    size: [2.5, 2.0, 4.2],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });
  parts.push({
    name: 'Quench_Water_Surface',
    className: 'Part',
    position: [ax - 4.5, 3.3, az],
    size: [2.1, 0.2, 3.8],
    material: 'Glass',
    color: [80, 160, 220],
    transparency: 0.35,
    anchored: true
  });
  parts.push({
    className: 'ParticleEmitter',
    name: 'Quench_Steam',
    parentPart: 'Quench_Water_Surface',
    rate: 10,
    lifetime: [1.0, 2.5],
    speed: [0.8, 2.0],
    lightEmission: 0.2,
    lightInfluence: 0.8
  });

  // ---------------------------------------------------------------------------
  // Armorer's Display Stand: Breastplate & Helm
  // ---------------------------------------------------------------------------
  const rx = sx - 6.0, rz = sz + 5.0;
  parts.push({
    name: 'ArmorStand_Post',
    className: 'Part',
    position: [rx, 3.4, rz],
    size: [0.5, 3.6, 0.5],
    material: 'Wood',
    color: C.woodPlankWarm,
    anchored: true
  });
  // Knight Cuirass / Breastplate
  parts.push({
    name: 'Zone5_Armor_Cuirass',
    className: 'Part',
    position: [rx, 4.2, rz],
    size: [1.8, 2.2, 1.4],
    material: 'Metal',
    color: C.silverSteel,
    anchored: true
  });
  // Visored Knight Helm
  parts.push({
    name: 'Zone5_Armor_Helm',
    className: 'Part',
    position: [rx, 5.7, rz],
    size: [1.3, 1.3, 1.3],
    material: 'Metal',
    color: C.silverSteel,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // Lapidary / Jeweler's Bench & 3 GLOWING RINGS
  // ---------------------------------------------------------------------------
  const jx = sx + 2.5, jz = sz + 5.0;
  // Mahogany Gem Bench
  parts.push({
    name: 'Jeweler_Bench_Top',
    className: 'Part',
    position: [jx, 3.0, jz],
    size: [3.4, 0.6, 7.0],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });
  // Red Velvet Display Runner
  parts.push({
    name: 'Jeweler_Velvet_Cloth',
    className: 'Part',
    position: [jx, 3.35, jz],
    size: [2.6, 0.15, 6.2],
    material: 'Fabric',
    color: [140, 20, 30],
    anchored: true
  });

  // 3 Glowing Gem Rings on Velvet Display
  const ringData = [
    {
      name: 'Zone5_Ring_Ruby',
      label: 'Anillo de Rubí Ardiente',
      offsetZ: -2.0,
      gemColor: [245, 35, 45],
      metalColor: C.goldRoyal
    },
    {
      name: 'Zone5_Ring_Sapphire',
      label: 'Anillo del Océano Abisal',
      offsetZ: 0.0,
      gemColor: [40, 140, 255],
      metalColor: C.silverSteel
    },
    {
      name: 'Zone5_Ring_Emerald',
      label: 'Anillo de Vida Esmeralda',
      offsetZ: 2.0,
      gemColor: [35, 235, 95],
      metalColor: C.goldRoyal
    }
  ];

  ringData.forEach(rd => {
    const rzPos = jz + rd.offsetZ;
    // Ring Band
    parts.push({
      name: `${rd.name}_Band`,
      className: 'Part',
      position: [jx, 3.65, rzPos],
      size: [0.7, 0.4, 0.7],
      material: 'Metal',
      color: rd.metalColor,
      anchored: true
    });
    // Glowing Faceted Gem
    parts.push({
      name: `${rd.name}_Gem`,
      className: 'Part',
      position: [jx, 3.95, rzPos],
      size: [0.45, 0.45, 0.45],
      material: 'Neon',
      color: rd.gemColor,
      anchored: true
    });
    parts.push({
      className: 'PointLight',
      name: `${rd.name}_Glow`,
      parentPart: `${rd.name}_Gem`,
      color: rd.gemColor,
      brightness: 1.8,
      range: 8,
      shadows: false
    });
  });

  // ---------------------------------------------------------------------------
  // THE MASTER ELF-DWARF NPC ("Thistlebeard")
  // Proportions: Compact (3.4 studs tall), pointy elf ears, braided dwarf beard,
  // leather apron, holding a blacksmith hammer.
  // ---------------------------------------------------------------------------
  const nx = sx + 2.0, nz = sz - 1.2;
  // Boots
  parts.push({
    name: 'ElfDwarf_Boot_L',
    className: 'Part',
    position: [nx - 0.45, 1.85, nz],
    size: [0.55, 0.5, 0.7],
    material: 'Metal',
    color: C.woodTimberDark,
    anchored: true
  });
  parts.push({
    name: 'ElfDwarf_Boot_R',
    className: 'Part',
    position: [nx + 0.45, 1.85, nz],
    size: [0.55, 0.5, 0.7],
    material: 'Metal',
    color: C.woodTimberDark,
    anchored: true
  });

  // Legs & Trousers
  parts.push({
    name: 'ElfDwarf_Legs',
    className: 'Part',
    position: [nx, 2.3, nz],
    size: [1.5, 0.6, 1.0],
    material: 'Fabric',
    color: [55, 75, 50],
    anchored: true
  });

  // Torso & Green Artificer Tunic
  parts.push({
    name: 'ElfDwarf_Torso',
    className: 'Part',
    position: [nx, 3.1, nz],
    size: [1.8, 1.2, 1.2],
    material: 'Fabric',
    color: C.tunicGreen,
    anchored: true
  });
  // Leather Forge Apron on Chest
  parts.push({
    name: 'ElfDwarf_Apron',
    className: 'Part',
    position: [nx, 3.0, nz - 0.55],
    size: [1.4, 1.3, 0.2],
    material: 'Fabric',
    color: C.apronLeather,
    anchored: true
  });

  // Head (Compact & Expressive)
  parts.push({
    name: 'Zone5_ElfDwarf_NPC',
    className: 'Part',
    position: [nx, 4.0, nz],
    size: [1.2, 1.0, 1.1],
    material: 'SmoothPlastic',
    color: C.skinElf,
    anchored: true
  });

  // Pointed Elven Ears
  parts.push({
    name: 'ElfDwarf_Ear_L',
    className: 'Part',
    position: [nx - 0.75, 4.1, nz],
    size: [0.4, 0.4, 0.2],
    material: 'SmoothPlastic',
    color: C.skinElf,
    anchored: true
  });
  parts.push({
    name: 'ElfDwarf_Ear_R',
    className: 'Part',
    position: [nx + 0.75, 4.1, nz],
    size: [0.4, 0.4, 0.2],
    material: 'SmoothPlastic',
    color: C.skinElf,
    anchored: true
  });

  // Braided Dwarven Beard
  parts.push({
    name: 'ElfDwarf_Beard',
    className: 'Part',
    position: [nx, 3.5, nz - 0.45],
    size: [1.0, 0.8, 0.6],
    material: 'Fabric',
    color: C.beardDwarf,
    anchored: true
  });

  // Blacksmith's Hammer in Hand
  parts.push({
    name: 'ElfDwarf_Hammer_Handle',
    className: 'Part',
    position: [nx + 1.1, 2.9, nz - 0.2],
    size: [0.2, 1.4, 0.2],
    material: 'Wood',
    color: C.woodTimberDark,
    anchored: true
  });
  parts.push({
    name: 'ElfDwarf_Hammer_Head',
    className: 'Part',
    position: [nx + 1.1, 3.6, nz - 0.2],
    size: [0.5, 0.5, 0.8],
    material: 'Metal',
    color: C.ironBlack,
    anchored: true
  });

  return parts;
}

// -----------------------------------------------------------------------------
// 7. SURROUNDING NATURE: DENSE FORBIDDEN FOREST & CASTLE WALLS
// -----------------------------------------------------------------------------
function buildSurroundingEnclosure() {
  const parts = [];

  // Perimeter High Castle Curtain Walls (Enclosing West, East, North backdrop)
  // North Outer Wall Behind Gatehouse
  parts.push({
    name: 'OuterWall_North_L',
    className: 'Part',
    position: [-35, 10, -62],
    size: [40, 20, 4.0],
    material: 'Cobblestone',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'OuterWall_North_R',
    className: 'Part',
    position: [35, 10, -62],
    size: [40, 20, 4.0],
    material: 'Cobblestone',
    color: C.stoneWallDark,
    anchored: true
  });
  // West Outer Wall Behind Apothecary & Smithy
  parts.push({
    name: 'OuterWall_West',
    className: 'Part',
    position: [-52, 9, -10],
    size: [4.0, 18, 105],
    material: 'Cobblestone',
    color: C.stoneWallDark,
    anchored: true
  });
  // East Outer Wall Behind Vault & Arena
  parts.push({
    name: 'OuterWall_East',
    className: 'Part',
    position: [52, 9, -10],
    size: [4.0, 18, 105],
    material: 'Cobblestone',
    color: C.stoneWallDark,
    anchored: true
  });

  // ---------------------------------------------------------------------------
  // Dense Procedural Pine & Twisted Oak Trees in the Surrounding Woods
  // ---------------------------------------------------------------------------
  function createPineTree(name, pos, scale = 1.0) {
    const [x, y, z] = pos;
    const treeParts = [];

    const trunkH = 8 * scale;
    const trunkW = 1.8 * scale;

    // Trunk
    treeParts.push({
      name: `${name}_Trunk`,
      className: 'Part',
      position: [x, y + trunkH / 2, z],
      size: [trunkW, trunkH, trunkW],
      material: 'Wood',
      color: C.barkPine,
      anchored: true
    });

    // 4 Conical Tiers of Dense Pine Needles (Block-based staggered foliage)
    const tiers = [
      { yOffset: trunkH * 0.65, size: 13.0 * scale, height: 4.5 * scale, color: C.pineDark1 },
      { yOffset: trunkH * 1.0,  size: 10.5 * scale, height: 4.2 * scale, color: C.pineDark2 },
      { yOffset: trunkH * 1.35, size: 7.8 * scale,  height: 3.8 * scale, color: C.pineLight },
      { yOffset: trunkH * 1.7,  size: 4.8 * scale,  height: 3.5 * scale, color: C.pineLight },
      { yOffset: trunkH * 2.05, size: 2.2 * scale,  height: 2.8 * scale, color: C.pineLight }
    ];

    tiers.forEach((t, idx) => {
      treeParts.push({
        name: `${name}_Foliage_${idx}`,
        className: 'Part',
        position: [x, y + t.yOffset, z],
        size: [t.size, t.height, t.size],
        material: 'Grass',
        color: t.color,
        anchored: true
      });
    });

    return treeParts;
  }

  // Tree coordinates around the perimeter walls (dense ring)
  const forestCoords = [
    // North Behind Castle Gate
    [-45, 0, -68, 1.4], [-30, 0, -70, 1.2], [-15, 0, -72, 1.5],
    [15, 0, -72, 1.5], [30, 0, -70, 1.3], [45, 0, -68, 1.4],
    // West Behind Shops
    [-60, 0, -45, 1.3], [-62, 0, -25, 1.5], [-60, 0, -5, 1.2],
    [-63, 0, 15, 1.4], [-60, 0, 35, 1.3],
    // East Behind Vault & Arena
    [60, 0, -45, 1.4], [62, 0, -25, 1.2], [60, 0, -5, 1.5],
    [63, 0, 15, 1.3], [60, 0, 35, 1.4],
    // South Approach
    [-35, 0, 52, 1.2], [-18, 0, 54, 1.3], [18, 0, 54, 1.3], [35, 0, 52, 1.2]
  ];

  forestCoords.forEach(([tx, ty, tz, scale], idx) => {
    parts.push(...createPineTree(`ForestTree_${idx}`, [tx, ty, tz], scale));
  });

  // Mossy Granite Boulders scattered in the woods
  const boulderCoords = [
    [-48, 1.5, -55, 6, 3, 5],
    [48, 1.5, -55, 5, 3.5, 5],
    [-55, 1.2, 5, 5, 2.5, 4],
    [55, 1.2, 5, 4.5, 2.8, 5]
  ];
  boulderCoords.forEach(([bx, by, bz, sx, sy, sz], idx) => {
    parts.push({
      name: `Boulder_${idx}`,
      className: 'Part',
      position: [bx, by, bz],
      size: [sx, sy, sz],
      material: 'Slate',
      color: [85, 90, 82], // Mossy stone
      anchored: true
    });
  });

  return parts;
}

// -----------------------------------------------------------------------------
// 8. SPAWN LOCATION & ENTRANCE VESTIBULE (SOUTH)
// -----------------------------------------------------------------------------
function buildSpawnAndEntrance() {
  const parts = [];
  const sx = 0, sz = 40;

  // Dedicated Spawn Platform
  parts.push({
    name: 'Spawn_Dais_Base',
    className: 'Part',
    position: [sx, 0.4, sz],
    size: [16, 0.6, 12],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });
  parts.push({
    name: 'Spawn_Runic_Inlay',
    className: 'Part',
    position: [sx, 0.75, sz],
    size: [12, 0.15, 8],
    material: 'Cobblestone',
    color: C.stoneStreet,
    anchored: true
  });

  // The actual Roblox SpawnLocation
  parts.push({
    name: 'Lobby_SpawnLocation',
    className: 'SpawnLocation',
    position: [sx, 1.2, sz],
    size: [6, 0.5, 6],
    material: 'Neon',
    color: C.magicCyan,
    transparency: 0.75,
    anchored: true
  });

  // Welcome Arch & Flanking Braziers
  parts.push({
    name: 'Spawn_Arch_L',
    className: 'Part',
    position: [sx - 7.5, 5.0, sz],
    size: [1.8, 8.5, 1.8],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Spawn_Arch_R',
    className: 'Part',
    position: [sx + 7.5, 5.0, sz],
    size: [1.8, 8.5, 1.8],
    material: 'Slate',
    color: C.stoneSlate,
    anchored: true
  });
  parts.push({
    name: 'Spawn_Arch_Header',
    className: 'Part',
    position: [sx, 9.5, sz],
    size: [16.8, 1.6, 2.0],
    material: 'Slate',
    color: C.stoneWallDark,
    anchored: true
  });

  // Entrance Braziers
  parts.push(...createFreeTorch('Spawn_Brazier_L', [sx - 7.5, 10.3, sz]));
  parts.push(...createFreeTorch('Spawn_Brazier_R', [sx + 7.5, 10.3, sz]));

  return parts;
}

async function introspectLobby() {
  console.log('🔍 [RN-10 Introspection] Inspecting workspace for existing lobby architecture...');
  const inspectionResults = {};
  for (const name of ['MagicLobby', 'MagicLobby_V2', 'MagicLobby_V3']) {
    try {
      const info = await inspectObject(`workspace.${name}`);
      if (info && info.result && info.result.found) {
        inspectionResults[name] = info.result;
        console.log(`  ℹ️ Found existing "${name}" in scene: ${info.result.className} with ${info.result.childCount || 0} children`);
      } else {
        inspectionResults[name] = null;
      }
    } catch {
      inspectionResults[name] = null;
    }
  }
  return inspectionResults;
}

// -----------------------------------------------------------------------------
// LIGHTING SETUP (WARM, BRIGHT DAYLIGHT & CRISP SHADOWS)
// -----------------------------------------------------------------------------
async function configureLighting(replaceEnvironment = false) {
  console.log(`☀️ Configuring daylight with Future lighting (replaceEnvironment: ${replaceEnvironment})...`);
  const lua = `
    local Lighting = game:GetService("Lighting")
    pcall(function() (Lighting :: any).Technology = Enum.Technology.Future end)
    Lighting.ClockTime = 15.8
    Lighting.Brightness = 2.8
    Lighting.OutdoorAmbient = Color3.fromRGB(140, 140, 148)
    Lighting.Ambient = Color3.fromRGB(80, 80, 85)
    Lighting.GeographicLatitude = 42
    Lighting.GlobalShadows = true
    Lighting.ExposureCompensation = 0.15

    local replaceEnv = ${replaceEnvironment ? 'true' : 'false'}
    local existingAtm = Lighting:FindFirstChildOfClass("Atmosphere")
    if replaceEnv and existingAtm then
      existingAtm:Destroy()
      existingAtm = nil
    end

    if not existingAtm then
      local atm = Instance.new("Atmosphere")
      atm.Density = 0.22
      atm.Offset = 0.1
      atm.Color = Color3.fromRGB(200, 208, 220)
      atm.Decay = Color3.fromRGB(110, 115, 125)
      atm.Glare = 0.1
      atm.Haze = 0.4
      atm.Parent = Lighting
    end

    local existingBloom = Lighting:FindFirstChildOfClass("BloomEffect")
    if replaceEnv and existingBloom then
      existingBloom:Destroy()
      existingBloom = nil
    end

    if not existingBloom then
      local bloom = Instance.new("BloomEffect")
      bloom.Intensity = 0.12
      bloom.Size = 10
      bloom.Threshold = 2.2
      bloom.Parent = Lighting
    end

    return "Lighting configured successfully"
  `;
  await sendCommand('EXECUTE_LUAU', { code: lua }, true);
}

// -----------------------------------------------------------------------------
// MAIN EXECUTION PIPELINE
// -----------------------------------------------------------------------------
async function main() {
  const cliArgs = process.argv.slice(2);
  const isApply = cliArgs.includes('--apply');
  const isDryRun = !isApply || cliArgs.includes('--dry-run');

  console.log('🏰 ========================================================');
  console.log('   RAASE 2.1 — Harry Potter Reimagined Citadel Lobby (V3)   ');
  console.log(`   Execution Mode: ${isApply ? '⚡ APPLY (Active Mutation)' : '🛡️ DRY-RUN (Simulation Only)'}`);
  console.log('========================================================');

  // 1. Mandatory Scene Introspection before any action (RN-10)
  const existing = await introspectLobby();

  // 2. Assemble Architecture
  console.log('🔨 Assembling architectural sections...');
  const pavementParts = buildUrbanPavement();
  const zone1Parts = buildZone1CastlePortal();
  const zone2Parts = buildZone2CratesVault();
  const zone3Parts = buildZone3Apothecary();
  const zone4Parts = buildZone4DuelingArena();
  const zone5Parts = buildZone5ElfSmithy();
  const enclosureParts = buildSurroundingEnclosure();
  const spawnParts = buildSpawnAndEntrance();

  const totalParts = [
    ...pavementParts,
    ...zone1Parts,
    ...zone2Parts,
    ...zone3Parts,
    ...zone4Parts,
    ...zone5Parts,
    ...enclosureParts,
    ...spawnParts
  ];

  console.log(`✨ Total instances generated: ${totalParts.length}`);

  if (isDryRun) {
    console.log('\n🛡️ [DRY-RUN SUMMARY — No changes made to Studio]');
    console.log(`  • Planned target model: workspace.MagicLobby_V3 (${totalParts.length} instances)`);
    console.log(`  • Existing scene models:`, Object.entries(existing).filter(([_, v]) => Boolean(v)).map(([k, v]) => `${k} (${v.childCount} children)`).join(', ') || 'None');
    console.log(`  • Lighting policy: Preserving existing Atmosphere/Bloom unless --replace-env is specified.`);
    console.log(`\n➡️ To apply these changes to Roblox Studio, rerun with: node agent/generators/build_magic_lobby.mjs --apply\n`);
    return;
  }

  // 3. APPLY: Idempotent wipe/upsert of confirmed legacy models
  for (const [name, found] of Object.entries(existing)) {
    if (found && (name === 'MagicLobby' || name === 'MagicLobby_V2')) {
      console.log(`  🗑️ Removing confirmed legacy model "${name}"...`);
      await deleteModel(name);
    }
  }

  // 4. Set Lighting (preserve user environment by default)
  const replaceEnv = cliArgs.includes('--replace-env');
  await configureLighting(replaceEnv);

  // 5. Batch Spawn into Studio with idempotent upsert
  await spawnBatch('MagicLobby_V3', totalParts, 'workspace', true);

  console.log('🎉 Citadel Lobby V3 successfully built in Roblox Studio!');
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
