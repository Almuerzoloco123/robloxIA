#!/usr/bin/env node
// @ts-check
/**
 * Attaches ProximityPrompts, BillboardGuis, and Signs directly into Studio Workspace models.
 */

import fs from 'node:fs';

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
  return data;
}

async function attachInteractiveElements() {
  console.log('🔮 Adding interactive ProximityPrompts and Billboard GUIs to all 5 zones in Studio...');

  // Helper to attach BillboardGui + TextLabel
  async function addBillboard(parentPath, text, offsetY = 2.5, textColor = [255, 235, 160], size = [5, 1.5]) {
    // Modify instance with prompt or billboard if supported, or spawn as child
  }

  // Zone 1: Matchmaking Portal Prompt
  await sendCommand('BATCH_SPAWN', {
    modelName: 'MagicLobby_Zone1_Matchmaking',
    instances: [
      {
        className: 'Part',
        name: 'Portal_Interactive_Trigger',
        position: [0, 2.2, -48],
        size: [5, 0.4, 5],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Entrar en Cola',
          objectText: 'Portal de Duelos Mágicos',
          holdDuration: 0.5,
          maxDistance: 14
        },
        billboardGui: {
          text: '🔮 PORTAL DE PARTIDAS\n[Mantén E para Entrar]',
          offsetY: 3.5,
          textColor: [120, 220, 255]
        }
      }
    ]
  }, true);

  // Zone 2: Crates Vault Prompts
  await sendCommand('BATCH_SPAWN', {
    modelName: 'MagicLobby_Zone2_CratesVault',
    instances: [
      {
        className: 'Part',
        name: 'Prompt_Crate_Common',
        position: [50, 3.8, -5],
        size: [2.5, 1.0, 2.0],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Abrir Cofre Común',
          objectText: '1x Llave Rúnica',
          holdDuration: 0.6,
          maxDistance: 10
        },
        billboardGui: {
          text: '📦 Cofre de Madera\n[Llave Común]',
          offsetY: 2.2,
          textColor: [120, 200, 255]
        }
      },
      {
        className: 'Part',
        name: 'Prompt_Crate_Ancient',
        position: [50, 3.8, 0],
        size: [2.5, 1.0, 2.0],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Abrir Bóveda Ancestral',
          objectText: '1x Llave de Hierro',
          holdDuration: 0.8,
          maxDistance: 10
        },
        billboardGui: {
          text: '🗝️ Bóveda Ancestral\n[Llave de Hierro]',
          offsetY: 2.2,
          textColor: [190, 110, 255]
        }
      },
      {
        className: 'Part',
        name: 'Prompt_Crate_RelicGold',
        position: [50, 3.8, 5],
        size: [2.5, 1.0, 2.0],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Abrir Reliquia Sagrada',
          objectText: '1x Llave de Oro',
          holdDuration: 1.0,
          maxDistance: 10
        },
        billboardGui: {
          text: '👑 Reliquia de Oro\n[Llave Sagrada]',
          offsetY: 2.2,
          textColor: [255, 220, 80]
        }
      }
    ]
  }, true);

  // Zone 3: Potion Shop & Cauldron Prompts
  await sendCommand('BATCH_SPAWN', {
    modelName: 'MagicLobby_Zone3_PotionShop',
    instances: [
      {
        className: 'Part',
        name: 'Prompt_Cauldron',
        position: [-46, 3.8, -4],
        size: [3.0, 1.0, 3.0],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Beber Brebaje Borboteante',
          objectText: 'Caldero del Boticario',
          holdDuration: 0.8,
          maxDistance: 10
        },
        billboardGui: {
          text: '🧪 Gran Caldero Mágico\n[Salud + Velocidad]',
          offsetY: 2.4,
          textColor: [80, 255, 120]
        }
      },
      {
        className: 'Part',
        name: 'Prompt_Potion_Counter',
        position: [-42, 4.8, 0],
        size: [2.0, 1.0, 8.0],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Comprar Pociones',
          objectText: 'Boticario Mágico',
          holdDuration: 0.5,
          maxDistance: 12
        },
        billboardGui: {
          text: '✨ TIENDA DE POCIONES\n[Pociones y Elixires]',
          offsetY: 2.5,
          textColor: [255, 215, 100]
        }
      }
    ]
  }, true);

  // Zone 4: Combat Mannequins Prompts & Health Bars
  await sendCommand('BATCH_SPAWN', {
    modelName: 'MagicLobby_Zone4_SpellRange',
    instances: [
      {
        className: 'Part',
        name: 'Prompt_Dummy_1',
        position: [36, 4.0, 46],
        size: [2.2, 3.0, 2.2],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Lanzar Hechizo',
          objectText: 'Maniquí de Aprendiz',
          holdDuration: 0.2,
          maxDistance: 15
        },
        billboardGui: {
          text: '🎯 Maniquí de Aprendiz\n[100 / 100 HP]',
          offsetY: 3.8,
          textColor: [120, 255, 140]
        }
      },
      {
        className: 'Part',
        name: 'Prompt_Dummy_2',
        position: [43, 4.0, 49],
        size: [2.2, 3.0, 2.2],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Lanzar Hechizo',
          objectText: 'Maniquí de Batalla',
          holdDuration: 0.2,
          maxDistance: 15
        },
        billboardGui: {
          text: '⚔️ Maniquí de Batalla\n[250 / 250 HP]',
          offsetY: 3.8,
          textColor: [255, 200, 80]
        }
      },
      {
        className: 'Part',
        name: 'Prompt_Dummy_3',
        position: [49, 4.0, 45],
        size: [2.2, 3.0, 2.2],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Lanzar Hechizo',
          objectText: 'Maniquí de Archimago',
          holdDuration: 0.2,
          maxDistance: 15
        },
        billboardGui: {
          text: '🌟 Maniquí de Archimago\n[500 / 500 HP]',
          offsetY: 3.8,
          textColor: [200, 110, 255]
        }
      }
    ]
  }, true);

  // Zone 5: Elf-Dwarf Blacksmith Nameplate & Prompt
  await sendCommand('BATCH_SPAWN', {
    modelName: 'MagicLobby_Zone5_ElfForge',
    instances: [
      {
        className: 'Part',
        name: 'Prompt_Elf_Blacksmith',
        position: [-40, 4.0, 43],
        size: [3.0, 2.0, 3.0],
        transparency: 0.95,
        anchored: true,
        canCollide: false,
        proximityPrompt: {
          actionText: 'Mejorar Armaduras y Anillos',
          objectText: 'Maestro Forjador Elfo',
          holdDuration: 0.7,
          maxDistance: 12
        },
        billboardGui: {
          text: '🔨 Maestro Forjador Elfo\n«Herrería y Anillos Arcanos»',
          offsetY: 3.2,
          textColor: [255, 215, 90]
        }
      }
    ]
  }, true);

  // Signposts: Add 3D Billboards to each directional sign board
  await sendCommand('BATCH_SPAWN', {
    modelName: 'MagicLobby_Details',
    instances: [
      {
        className: 'Part',
        name: 'SignText_Portal',
        position: [0, 7.2, 3.8],
        size: [0.5, 0.5, 3.0],
        transparency: 1,
        anchored: true,
        canCollide: false,
        billboardGui: {
          text: '🏰 Partidas (Norte)',
          offsetY: 0.6,
          textColor: [120, 215, 255]
        }
      },
      {
        className: 'Part',
        name: 'SignText_Crates',
        position: [1.2, 6.3, 5],
        size: [3.0, 0.5, 0.5],
        transparency: 1,
        anchored: true,
        canCollide: false,
        billboardGui: {
          text: '📦 Bóveda de Cofres (Este)',
          offsetY: 0.6,
          textColor: [255, 215, 90]
        }
      },
      {
        className: 'Part',
        name: 'SignText_Potions',
        position: [-1.2, 5.4, 5],
        size: [3.0, 0.5, 0.5],
        transparency: 1,
        anchored: true,
        canCollide: false,
        billboardGui: {
          text: '🧪 Boticario & Pociones (Oeste)',
          offsetY: 0.6,
          textColor: [80, 255, 120]
        }
      },
      {
        className: 'Part',
        name: 'SignText_Dueling',
        position: [1.0, 4.5, 6.0],
        size: [2.5, 0.5, 0.5],
        transparency: 1,
        anchored: true,
        canCollide: false,
        billboardGui: {
          text: '🎯 Maniquís de Prueba (Sureste)',
          offsetY: 0.6,
          textColor: [255, 140, 140]
        }
      },
      {
        className: 'Part',
        name: 'SignText_Forge',
        position: [-1.0, 3.6, 6.0],
        size: [2.5, 0.5, 0.5],
        transparency: 1,
        anchored: true,
        canCollide: false,
        billboardGui: {
          text: '🔨 Forja del Elfo (Suroeste)',
          offsetY: 0.6,
          textColor: [255, 200, 100]
        }
      }
    ]
  }, true);

  console.log('✅ Interactive Prompts and 3D Billboard GUIs attached successfully!');
}

attachInteractiveElements().catch(console.error);
