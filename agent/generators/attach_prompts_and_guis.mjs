#!/usr/bin/env node
// @ts-check
/**
 * Attaches interactive ProximityPrompts and BillboardGuis to the V3 Citadel Lobby.
 * Matches exact coordinates and interaction logic for all 5 zones.
 */

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

  // Wipe previous interaction triggers model if any
  try {
    await sendCommand('DELETE_OBJECT', { targetPath: 'MagicLobby_V3_Interactions' }, true);
  } catch {
    // ignore
  }

  const triggers = [
    // -------------------------------------------------------------------------
    // Zone 1: Castle Matchmaking Portal
    // -------------------------------------------------------------------------
    {
      className: 'Part',
      name: 'Trigger_Zone1_Matchmaking',
      position: [0, 3.2, -55.5],
      size: [8.0, 0.4, 6.0],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Entrar en Cola',
        objectText: 'Portal de Duelos Mágicos',
        holdDuration: 0.5,
        maxDistance: 16
      },
      billboardGui: {
        text: '⚔️ PORTAL DE PARTIDAS\n[Mantén E para Entrar]',
        offsetY: 4.5,
        textColor: [120, 225, 255]
      }
    },

    // -------------------------------------------------------------------------
    // Zone 2: Gringotts Vault Crates & Keys
    // -------------------------------------------------------------------------
    {
      className: 'Part',
      name: 'Trigger_Zone2_Crate_Common',
      position: [31.0, 4.6, -11.5],
      size: [3.2, 2.0, 3.8],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Abrir Cofre Común',
        objectText: '1x Llave de Bronce',
        holdDuration: 0.6,
        maxDistance: 10
      },
      billboardGui: {
        text: '📦 Cofre de Roble Antiguo\n[Llave de Bronce]',
        offsetY: 3.2,
        textColor: [240, 200, 120]
      }
    },
    {
      className: 'Part',
      name: 'Trigger_Zone2_Crate_Rare',
      position: [31.0, 4.6, -5.0],
      size: [3.2, 2.0, 3.8],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Abrir Bóveda Rúnica',
        objectText: '1x Llave de Acero Rúnico',
        holdDuration: 0.8,
        maxDistance: 10
      },
      billboardGui: {
        text: '🗝️ Bóveda de Hierro Rúnico\n[Llave de Acero Rúnico]',
        offsetY: 3.2,
        textColor: [100, 220, 255]
      }
    },
    {
      className: 'Part',
      name: 'Trigger_Zone2_Crate_Legendary',
      position: [31.0, 4.6, 1.5],
      size: [3.2, 2.0, 3.8],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Abrir Reliquia Real',
        objectText: '1x Llave Real Dorada',
        holdDuration: 1.2,
        maxDistance: 10
      },
      billboardGui: {
        text: '👑 Reliquia Real Arcana\n[Llave Real Dorada]',
        offsetY: 3.2,
        textColor: [255, 225, 75]
      }
    },

    // -------------------------------------------------------------------------
    // Zone 3: Tudor Apothecary & Porch Cauldron
    // -------------------------------------------------------------------------
    {
      className: 'Part',
      name: 'Trigger_Zone3_Cauldron',
      position: [-17.5, 4.0, -7.0],
      size: [4.8, 3.0, 4.8],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Elaborar Brebaje Mágico',
        objectText: 'Caldero Esmeralda',
        holdDuration: 0.8,
        maxDistance: 12
      },
      billboardGui: {
        text: '🍵 Caldero del Boticario\n[Brebaje Mágico]',
        offsetY: 3.5,
        textColor: [80, 255, 130]
      }
    },
    {
      className: 'Part',
      name: 'Trigger_Zone3_PotionShop',
      position: [-21.2, 4.5, 0.5],
      size: [2.0, 4.0, 5.5],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Comprar Pociones',
        objectText: 'Estantería de Viales',
        holdDuration: 0.4,
        maxDistance: 10
      },
      billboardGui: {
        text: '🧪 Pociones & Elixires\n[Salud, Maná y Celeridad]',
        offsetY: 3.2,
        textColor: [200, 160, 255]
      }
    },

    // -------------------------------------------------------------------------
    // Zone 4: Dueling Arena Target Mannequins
    // -------------------------------------------------------------------------
    {
      className: 'Part',
      name: 'Trigger_Zone4_Dummy_Apprentice',
      position: [35.5, 4.5, 18.0],
      size: [2.5, 4.5, 2.5],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Lanzar Hechizo de Prueba',
        objectText: 'Maniquí de Aprendiz (Nv. 1)',
        holdDuration: 0.2,
        maxDistance: 14
      },
      billboardGui: {
        text: '🎯 Maniquí de Aprendiz [Nv. 1]\nHP: 100/100',
        offsetY: 3.8,
        textColor: [120, 200, 255]
      }
    },
    {
      className: 'Part',
      name: 'Trigger_Zone4_Dummy_Battle',
      position: [35.5, 4.5, 24.0],
      size: [2.5, 4.5, 2.5],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Lanzar Hechizo de Prueba',
        objectText: 'Maniquí de Batalla (Nv. 25)',
        holdDuration: 0.2,
        maxDistance: 14
      },
      billboardGui: {
        text: '🛡️ Maniquí de Batalla [Nv. 25]\nHP: 500/500',
        offsetY: 3.8,
        textColor: [255, 120, 120]
      }
    },
    {
      className: 'Part',
      name: 'Trigger_Zone4_Dummy_Archmage',
      position: [35.5, 4.5, 30.0],
      size: [2.5, 4.5, 2.5],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Lanzar Hechizo de Prueba',
        objectText: 'Maniquí de Archimago (Nv. 60)',
        holdDuration: 0.2,
        maxDistance: 14
      },
      billboardGui: {
        text: '⚡ Maniquí de Archimago [Nv. 60]\nHP: 2000/2000',
        offsetY: 3.8,
        textColor: [220, 130, 255]
      }
    },

    // -------------------------------------------------------------------------
    // Zone 5: Elf-Dwarf Blacksmith, Anvil & Rings Bench
    // -------------------------------------------------------------------------
    {
      className: 'Part',
      name: 'Trigger_Zone5_Anvil_Repair',
      position: [-30.0, 4.5, 20.0],
      size: [3.0, 2.5, 4.0],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Reparar & Forjar Armaduras',
        objectText: 'Yunque de Acero Enano',
        holdDuration: 0.7,
        maxDistance: 10
      },
      billboardGui: {
        text: '🔨 Forja Arcana\n[Reparar Armaduras]',
        offsetY: 2.8,
        textColor: [255, 180, 80]
      }
    },
    {
      className: 'Part',
      name: 'Trigger_Zone5_Rings_Bench',
      position: [-29.5, 4.0, 29.0],
      size: [3.5, 2.0, 6.0],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Encantar Anillos Mágicos',
        objectText: 'Mesa de Joyería Mágica',
        holdDuration: 0.7,
        maxDistance: 10
      },
      billboardGui: {
        text: '💍 Mesa de Lapidario\n[Mejorar & Encantar Anillos]',
        offsetY: 2.8,
        textColor: [255, 130, 220]
      }
    },
    {
      className: 'Part',
      name: 'Trigger_Zone5_ElfDwarf_NPC',
      position: [-30.0, 4.0, 22.8],
      size: [2.5, 3.5, 2.5],
      transparency: 0.95,
      anchored: true,
      canCollide: false,
      proximityPrompt: {
        actionText: 'Hablar con Thistlebeard',
        objectText: 'Maestro Enano-Elfo',
        holdDuration: 0.4,
        maxDistance: 12
      },
      billboardGui: {
        text: '🧔 Thistlebeard el Artífice\n[Maestro Forjador & Joyero]',
        offsetY: 3.5,
        textColor: [140, 240, 160]
      }
    }
  ];

  console.log(`📦 Spawning ${triggers.length} interactive prompt triggers...`);
  await sendCommand('BATCH_SPAWN', {
    modelName: 'MagicLobby_V3_Interactions',
    parent: 'workspace',
    instances: triggers
  }, true);

  console.log('✅ Interactive Prompts and Guis attached successfully!');
}

attachInteractiveElements().catch(err => {
  console.error('❌ Failed to attach interactive triggers:', err);
  process.exit(1);
});
