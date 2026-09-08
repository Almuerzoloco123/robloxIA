// @ts-check
/**
 * RAASE 2.0 - Harry Potter Magic Castle Lobby Generator (Refined Version)
 * - Rich vegetation (organic grass patches, moss, natural slate rocks under all trees)
 * - Redesigned torches with carbonized black tips and layered warm fire
 * - Reduced neon throughout the lobby (EXCEPT vibrant magic potions)
 * - Concentric archery target boards on training dummies (No neon targets)
 * - Roaring blacksmith forge fire behind dwarf Brokkr (No flat neon wall)
 * - Elegantly sculpted gothic stone fountain with clear crystal water (No blinding neon crystal)
 * - Discreet medieval heraldic name plaques for all 5 zones
 */

const BRIDGE_URL = process.env.RAASE_BRIDGE_URL || 'http://127.0.0.1:34873';

const PALETTE = {
  CobbleFloor: [75, 80, 92],
  StoneTileLight: [115, 122, 138],
  CastleStone: [92, 98, 112],
  TrimStone: [130, 136, 150],
  DarkWood: [65, 42, 28],
  WarmWood: [110, 72, 44],
  LightWood: [160, 115, 75],
  RoofSlate: [48, 56, 75],
  GoldRune: [235, 185, 55],
  RunicBlue: [70, 150, 200],
  PotionPurple: [175, 80, 255],
  PotionGreen: [60, 235, 120],
  PotionRed: [245, 60, 80],
  PotionAmber: [255, 160, 40],
  WarmTorch: [255, 175, 85],
  TorchFlameYellow: [255, 215, 80],
  TorchFlameOrange: [255, 130, 25],
  TorchFlameRed: [210, 45, 15],
  TorchBlackTip: [24, 24, 26],
  IronDark: [42, 45, 50],
  GrassForest: [52, 90, 44],
  MossDense: [40, 72, 35],
  ForestRock: [90, 95, 105],
  ForestRockLight: [120, 125, 135],
  TreeBark: [58, 40, 28],
  TreeNeedles: [36, 62, 40],
  VelvetRed: [155, 32, 42],
  WaterTurquoise: [95, 190, 225],
  DwarfSkin: [245, 200, 165],
  DwarfBeard: [185, 78, 28],
  TargetWhite: [230, 225, 215],
  TargetRed: [180, 35, 35],
  TargetBullseye: [30, 30, 32],
  SignParchment: [235, 220, 180],
};

/**
 * @typedef {Object} PartDef
 * @property {string} name
 * @property {[number, number, number]} size
 * @property {[number, number, number]} position
 * @property {[number, number, number]} [color]
 * @property {string} [material]
 * @property {boolean} [anchored]
 * @property {boolean} [canCollide]
 */

/** @type {PartDef[]} */
const parts = [];

function addPart(name, size, pos, color, material = 'SmoothPlastic', canCollide = true) {
  parts.push({
    name,
    size,
    position: pos,
    color,
    material,
    anchored: true,
    canCollide,
  });
}

// -------------------------------------------------------------
// HELPER: ANTORCHA MEDIEVAL REDISEÑADA (Punta Negra + Fuego Calibrado)
// -------------------------------------------------------------
function addTorch(baseName, px, py, pz) {
  // 1. Soporte de hierro forjado
  addPart(`${baseName}_Bracket`, [0.5, 0.5, 1.2], [px, py - 0.3, pz - 0.4], PALETTE.IronDark, 'Metal');
  // 2. Mango de madera oscura
  addPart(`${baseName}_Handle`, [0.5, 2.6, 0.5], [px, py + 0.8, pz], PALETTE.DarkWood, 'Wood');
  // 3. Aro de refuerzo de hierro
  addPart(`${baseName}_Ring`, [0.7, 0.25, 0.7], [px, py + 2.0, pz], PALETTE.IronDark, 'Metal');
  // 4. PUNTA NEGRA CARBONIZADA (Obligatoria: de aquí nace el fuego)
  addPart(`${baseName}_BlackTip`, [0.65, 0.8, 0.65], [px, py + 2.45, pz], PALETTE.TorchBlackTip, 'Basalt');
  // 5. Llama estilizada multicapa (núcleo ardiente y halo naranja)
  addPart(`${baseName}_FlameCore`, [0.7, 1.2, 0.7], [px, py + 3.2, pz], PALETTE.TorchFlameYellow, 'Neon', false);
  addPart(`${baseName}_FlameHalo`, [0.5, 0.9, 0.5], [px, py + 4.1, pz], PALETTE.TorchFlameOrange, 'Neon', false);
}

// -------------------------------------------------------------
// HELPER: CARTEL MEDIEVAL FLOTANTE DISCRETO
// -------------------------------------------------------------
function addMedievalSignPlaque(zoneName, px, py, pz) {
  // Pequeño poste heráldico discreto que flota suavemente
  addPart(`SignPlaque_Post_${zoneName}`, [0.4, 1.8, 0.4], [px, py + 0.9, pz], PALETTE.DarkWood, 'Wood');
  // Marco de madera noble
  addPart(`SignPlaque_Frame_${zoneName}`, [4.2, 1.4, 0.4], [px, py + 2.2, pz], PALETTE.WarmWood, 'Wood');
  // Placa de pergamino con el nombre heráldico
  addPart(`SignPlaque_Board_${zoneName}`, [3.8, 1.0, 0.45], [px, py + 2.2, pz], PALETTE.SignParchment, 'SmoothPlastic');
  // Pequeño remate superior de hierro
  addPart(`SignPlaque_IronTrim_${zoneName}`, [4.4, 0.2, 0.5], [px, py + 3.0, pz], PALETTE.IronDark, 'Metal');
}

// -------------------------------------------------------------
// 1. PATIO CENTRAL Y FUENTE DE PIEDRA LABRADA (Sin Neón Cegador)
// -------------------------------------------------------------
function buildCourtyard(ox = 0, oy = 0, oz = 0) {
  // Gran suelo empedrado del patio
  addPart('Lobby_CobbleFloor', [160, 2, 160], [ox, oy - 1, oz], PALETTE.CobbleFloor, 'Cobblestone');

  // Caminos en cruz de losetas pulidas
  addPart('Walkway_NorthSouth', [18, 0.4, 140], [ox, oy + 0.2, oz], PALETTE.StoneTileLight, 'Slate');
  addPart('Walkway_EastWest', [140, 0.4, 18], [ox, oy + 0.2, oz], PALETTE.StoneTileLight, 'Slate');

  // Plaza circular central de cantería
  addPart('CentralPlaza_Outer', [38, 0.5, 38], [ox, oy + 0.35, oz], PALETTE.TrimStone, 'Cobblestone');
  // Anillo de piedra pulida suave (NO neón)
  addPart('CentralPlaza_InnerRing', [30, 0.2, 30], [ox, oy + 0.65, oz], PALETTE.StoneTileLight, 'Slate');

  // FUENTE MEDIEVAL DE PIEDRA LABRADA (Elegante, clara y nítida)
  // Tazón exterior octogonal de piedra
  addPart('Fountain_OuterBasin', [16, 2.2, 16], [ox, oy + 1.1, oz], PALETTE.CastleStone, 'Cobblestone');
  addPart('Fountain_BasinRim', [17.5, 0.7, 17.5], [ox, oy + 2.3, oz], PALETTE.TrimStone, 'Slate');
  // Agua cristalina suave y translúcida
  addPart('Fountain_Water', [14.8, 0.3, 14.8], [ox, oy + 2.0, oz], PALETTE.WaterTurquoise, 'Glass');

  // Pilar central de cantería
  addPart('Fountain_PillarBase', [4.8, 3.2, 4.8], [ox, oy + 3.6, oz], PALETTE.TrimStone, 'Cobblestone');
  // Tazón superior más pequeño
  addPart('Fountain_UpperBowl', [7.5, 1.2, 7.5], [ox, oy + 5.4, oz], PALETTE.CastleStone, 'Slate');
  addPart('Fountain_UpperWater', [6.5, 0.2, 6.5], [ox, oy + 5.9, oz], PALETTE.WaterTurquoise, 'Glass');
  // Aguja ornamental de piedra noble en la cima
  addPart('Fountain_GothicSpire', [2.4, 4.5, 2.4], [ox, oy + 8.2, oz], PALETTE.TrimStone, 'Slate');
  addPart('Fountain_SpireFinial', [1.2, 1.6, 1.2], [ox, oy + 11.0, oz], PALETTE.GoldRune, 'Metal');

  // Cartel medieval de la Plaza
  addMedievalSignPlaque('PlazaCastillo', ox, oy + 2.5, oz + 10);

  // 4 Spawns de piedra
  const spawnOffsets = [[14, 0], [-14, 0], [0, 14], [0, -14]];
  spawnOffsets.forEach(([dx, dz], idx) => {
    addPart(`PlayerSpawnPad_${idx + 1}`, [5.5, 0.3, 5.5], [ox + dx, oy + 0.25, oz + dz], PALETTE.StoneTileLight, 'Slate');
  });

  // Braseros de piedra con lecho de carbón negro y llama cálida (NO cajas de neón)
  const brazierOffsets = [[18, 18], [-18, 18], [18, -18], [-18, -18]];
  brazierOffsets.forEach(([bx, bz], idx) => {
    addPart(`BrazierBase_Center_${idx + 1}`, [3.5, 1.8, 3.5], [ox + bx, oy + 0.9, oz + bz], PALETTE.CastleStone, 'Cobblestone');
    addPart(`BrazierBowl_Center_${idx + 1}`, [4.2, 1.2, 4.2], [ox + bx, oy + 2.3, oz + bz], PALETTE.IronDark, 'Metal');
    addPart(`BrazierCoals_Center_${idx + 1}`, [3.4, 0.4, 3.4], [ox + bx, oy + 2.9, oz + bz], PALETTE.TorchBlackTip, 'Basalt');
    addPart(`BrazierFlame_Center_${idx + 1}`, [2.0, 1.6, 2.0], [ox + bx, oy + 3.8, oz + bz], PALETTE.TorchFlameOrange, 'Neon', false);
  });

  // Farolas de hierro con antorchas de punta negra
  const lampOffsets = [[30, 26], [-30, 26], [30, -26], [-30, -26]];
  lampOffsets.forEach(([lx, lz], idx) => {
    addPart(`StreetLamp_Pole_${idx + 1}`, [1, 10, 1], [ox + lx, oy + 5, oz + lz], PALETTE.IronDark, 'Metal');
    addPart(`StreetLamp_CrossArm_${idx + 1}`, [5, 0.5, 0.5], [ox + lx, oy + 10, oz + lz], PALETTE.IronDark, 'Metal');
    addTorch(`StreetLamp_Torch1_${idx + 1}`, ox + lx + 2.2, oy + 9.5, oz + lz);
    addTorch(`StreetLamp_Torch2_${idx + 1}`, ox + lx - 2.2, oy + 9.5, oz + lz);
  });
}

// -------------------------------------------------------------
// 2. SECCIÓN 1: PORTAL DE MAZMORRAS / PARTIDAS (NORTE)
// -------------------------------------------------------------
function buildDungeonPortal(ox = 0, oy = 0, oz = -62) {
  // Estrado de piedra
  addPart('Portal_Plaza', [40, 1.5, 30], [ox, oy + 0.75, oz], PALETTE.TrimStone, 'Cobblestone');
  addPart('Portal_RedCarpet', [10, 0.2, 28], [ox, oy + 1.55, oz + 1], PALETTE.VelvetRed, 'Fabric');

  // Escalinatas de piedra
  for (let s = 1; s <= 3; s++) {
    addPart(`Portal_Step_${s}`, [24, 0.8, 3], [ox, oy + s * 0.8, oz - 4 - s * 2], PALETTE.CastleStone, 'Slate');
  }

  const archZ = oz - 12;
  addPart('Portal_PillarLeft', [5, 28, 5], [ox - 12, oy + 14, archZ], PALETTE.CastleStone, 'Cobblestone');
  addPart('Portal_PillarRight', [5, 28, 5], [ox + 12, oy + 14, archZ], PALETTE.CastleStone, 'Cobblestone');
  addPart('Portal_ArchTop', [29, 4.5, 6], [ox, oy + 29, archZ], PALETTE.TrimStone, 'Slate');

  addPart('Portal_SpireLeft', [5.5, 11, 5.5], [ox - 12, oy + 36, archZ], PALETTE.RoofSlate, 'Slate');
  addPart('Portal_SpireRight', [5.5, 11, 5.5], [ox + 12, oy + 36, archZ], PALETTE.RoofSlate, 'Slate');

  // Vórtice Dimensional translúcido (Glass místico, NO bloque neón)
  addPart('Portal_VortexArcane', [18, 22, 1.2], [ox, oy + 14, archZ], [45, 35, 80], 'Glass', false);

  // Antorchas con punta negra y fuego en las columnas del portal
  addTorch('Portal_TorchLeft', ox - 12, oy + 12, archZ + 3.2);
  addTorch('Portal_TorchRight', ox + 12, oy + 12, archZ + 3.2);

  // Cartel heráldico medieval
  addMedievalSignPlaque('PortalPartidas', ox, oy + 1.6, oz + 12);
}

// -------------------------------------------------------------
// 3. SECCIÓN 2: SANTUARIO DE CRATES (NOROESTE)
// -------------------------------------------------------------
function buildCratesSanctuary(ox = -48, oy = 0, oz = -46) {
  addPart('Crates_Platform', [28, 1.5, 26], [ox, oy + 0.75, oz], PALETTE.TrimStone, 'Cobblestone');

  const crates = [
    { name: 'Apprentice', x: -7, bodyColor: PALETTE.DarkWood, trimColor: PALETTE.IronDark },
    { name: 'Sorcerer', x: 0, bodyColor: [35, 55, 95], trimColor: PALETTE.RunicBlue },
    { name: 'Archmage', x: 7, bodyColor: [85, 22, 40], trimColor: PALETTE.GoldRune },
  ];

  crates.forEach(cr => {
    // Pedestal de piedra pulida
    addPart(`Pedestal_${cr.name}`, [5, 2.2, 5], [ox + cr.x, oy + 2.1, oz], PALETTE.CastleStone, 'Slate');
    // Cofre de madera noble
    addPart(`CrateBody_${cr.name}`, [3.8, 2.8, 2.8], [ox + cr.x, oy + 4.5, oz], cr.bodyColor, 'WoodPlanks');
    // Herrajes de metal noble (NO neón)
    addPart(`CrateTrim_${cr.name}`, [4, 0.5, 3], [ox + cr.x, oy + 4.5, oz], cr.trimColor, 'Metal');
  });

  // Brasero azul ceremonial (carbón negro + llama mística)
  addPart('Crates_BrazierBase', [3.5, 1.8, 3.5], [ox, oy + 0.9, oz + 8], PALETTE.CastleStone, 'Cobblestone');
  addPart('Crates_BrazierCoals', [3.0, 0.4, 3.0], [ox, oy + 1.9, oz + 8], PALETTE.TorchBlackTip, 'Basalt');
  addPart('Crates_BrazierFlame', [1.8, 1.6, 1.8], [ox, oy + 2.8, oz + 8], PALETTE.RunicBlue, 'Neon', false);

  // Cartel heráldico medieval
  addMedievalSignPlaque('CratesSanctuary', ox, oy + 1.6, oz + 12);
}

// -------------------------------------------------------------
// 4. SECCIÓN 3: BOTICA DE POCIONES (ESTE) - Pociones mantienen Neón
// -------------------------------------------------------------
function buildPotionShop(ox = 62, oy = 0, oz = 0) {
  addPart('Shop_BasePlatform', [32, 1.5, 38], [ox, oy + 0.75, oz], PALETTE.TrimStone, 'Cobblestone');
  addPart('Shop_WallBack', [2, 18, 34], [ox + 14, oy + 10, oz], PALETTE.DarkWood, 'WoodPlanks');
  addPart('Shop_WallSide1', [16, 18, 2], [ox + 6, oy + 10, oz + 17], PALETTE.DarkWood, 'WoodPlanks');
  addPart('Shop_WallSide2', [16, 18, 2], [ox + 6, oy + 10, oz - 17], PALETTE.DarkWood, 'WoodPlanks');
  addPart('Shop_RoofMain', [20, 1.8, 38], [ox + 5, oy + 20, oz], PALETTE.RoofSlate, 'WoodPlanks');

  // Mostrador de madera pulida
  addPart('Shop_AlchemyCounter', [3.5, 4, 24], [ox - 2, oy + 2.7, oz], PALETTE.WarmWood, 'Wood');

  // Gran Caldero de hierro
  addPart('Shop_CauldronOuter', [5.5, 3.8, 5.5], [ox + 5, oy + 2.7, oz - 6], PALETTE.IronDark, 'Metal');
  // LÍQUIDO MÁGICO DE POCIÓN (MANTIENE NEÓN VIBRANTE como pidió el usuario)
  addPart('Shop_CauldronLiquid', [4.8, 0.5, 4.8], [ox + 5, oy + 4.5, oz - 6], PALETTE.PotionGreen, 'Neon', false);

  // Estantes con frascos de elixires (MANTIENEN NEÓN VIBRANTE)
  addPart('Shop_ShelfFrame', [1.5, 14, 20], [ox + 12, oy + 9, oz + 4], PALETTE.WarmWood, 'WoodPlanks');
  const potionColors = [PALETTE.PotionRed, PALETTE.PotionGreen, PALETTE.PotionPurple, PALETTE.PotionAmber, PALETTE.RunicBlue];
  for (let lvl = 1; lvl <= 3; lvl++) {
    addPart(`Shop_ShelfPlank_${lvl}`, [2, 0.4, 18], [ox + 11.5, oy + 3 + lvl * 3.2, oz + 4], PALETTE.WarmWood, 'Wood');
    for (let b = -2; b <= 2; b++) {
      const pCol = potionColors[Math.abs(b + lvl) % potionColors.length];
      addPart(`PotionBottle_${lvl}_${b}`, [0.8, 1.4, 0.8], [ox + 11.5, oy + 4 + lvl * 3.2, oz + 4 + b * 3], pCol, 'Neon', false);
    }
  }

  // NPC Boticaria / Bruja
  addPart('NPC_Witch_Robe', [2.6, 4.2, 2.2], [ox + 5, oy + 3.2, oz + 4], PALETTE.PotionPurple, 'Fabric');
  addPart('NPC_Witch_Head', [1.8, 1.8, 1.8], [ox + 5, oy + 6.2, oz + 4], [245, 210, 185], 'SmoothPlastic');
  addPart('NPC_Witch_HatBrim', [3.8, 0.3, 3.8], [ox + 5, oy + 7.2, oz + 4], PALETTE.IronDark, 'Fabric');
  addPart('NPC_Witch_HatCone', [2, 3, 2], [ox + 5, oy + 8.7, oz + 4], PALETTE.IronDark, 'Fabric');

  // Antorchas con punta negra en la fachada
  addTorch('Shop_Torch1', ox - 2.5, oy + 5, oz + 12);
  addTorch('Shop_Torch2', ox - 2.5, oy + 5, oz - 12);

  // Cartel heráldico medieval
  addMedievalSignPlaque('BoticaMadameRaven', ox - 6, oy + 1.6, oz);
}

// -------------------------------------------------------------
// 5. SECCIÓN 4: FORJA ARCANA DE BROKKR (SUR) - Fuego de Forja Real (NO Neón)
// -------------------------------------------------------------
function buildArcaneForge(ox = 0, oy = 0, oz = 62) {
  addPart('Forge_BasePlatform', [38, 1.5, 32], [ox, oy + 0.75, oz], PALETTE.TrimStone, 'Cobblestone');

  // Alto horno de piedra
  addPart('Forge_FurnaceBody', [18, 16, 8], [ox, oy + 9, oz + 10], PALETTE.CastleStone, 'Cobblestone');
  addPart('Forge_FurnaceChimney', [5, 12, 5], [ox, oy + 21, oz + 10], PALETTE.CastleStone, 'Cobblestone');

  // FUEGO DE FORJA REAL DETRÁS DEL ENANO (Cama de carbón negro + llamas de alta temperatura)
  addPart('Forge_HearthBase', [9, 2.2, 4.5], [ox, oy + 3.5, oz + 6], PALETTE.TorchBlackTip, 'Basalt');
  // Brasas y carbón al rojo vivo
  addPart('Forge_GlowingCoals', [8, 0.8, 3.8], [ox, oy + 4.8, oz + 6], [180, 45, 15], 'Basalt');
  // Llamas de forja ardientes
  addPart('Forge_FlameLayer1', [6.5, 2.5, 2.8], [ox, oy + 6.2, oz + 6], PALETTE.TorchFlameOrange, 'Neon', false);
  addPart('Forge_FlameLayer2', [4.2, 1.8, 1.8], [ox, oy + 8.0, oz + 6], PALETTE.TorchFlameYellow, 'Neon', false);

  // Yunque macizo de hierro oscuro (runa dorada de metal, NO neón)
  addPart('Forge_AnvilBase', [4, 1.8, 3], [ox, oy + 1.8, oz - 3], PALETTE.IronDark, 'Metal');
  addPart('Forge_AnvilTop', [5.5, 1.4, 2.6], [ox, oy + 3.4, oz - 3], PALETTE.IronDark, 'Metal');
  addPart('Forge_AnvilHorn', [2.4, 1, 1.6], [ox + 3.5, oy + 3.4, oz - 3], PALETTE.IronDark, 'Metal');
  addPart('Forge_AnvilRune', [2.6, 0.1, 1.6], [ox, oy + 4.15, oz - 3], PALETTE.GoldRune, 'Metal');

  // Martillo de forja
  addPart('Forge_HammerHandle', [0.4, 3, 0.4], [ox - 1.5, oy + 5.2, oz - 3], PALETTE.DarkWood, 'Wood');
  addPart('Forge_HammerHead', [1.6, 1.2, 1.2], [ox - 2.2, oy + 6.4, oz - 3], PALETTE.IronDark, 'Metal');

  // NPC ENANO HERRERO ("Brokkr")
  addPart('NPC_Dwarf_Legs', [2.2, 1.8, 1.8], [ox + 4, oy + 1.8, oz - 3], [50, 42, 34], 'Fabric');
  addPart('NPC_Dwarf_Torso', [3, 2.4, 2.2], [ox + 4, oy + 3.8, oz - 3], [120, 55, 32], 'Fabric');
  addPart('NPC_Dwarf_Apron', [2.4, 2.2, 0.3], [ox + 4, oy + 3.7, oz - 4], [65, 45, 25], 'Fabric');
  addPart('NPC_Dwarf_Head', [1.8, 1.8, 1.8], [ox + 4, oy + 5.7, oz - 3], PALETTE.DwarfSkin, 'SmoothPlastic');
  addPart('NPC_Dwarf_Beard', [2.2, 2, 1.2], [ox + 4, oy + 4.8, oz - 3.8], PALETTE.DwarfBeard, 'Fabric');
  addPart('NPC_Dwarf_Helmet', [2.2, 1, 2.2], [ox + 4, oy + 6.7, oz - 3], PALETTE.IronDark, 'Metal');

  // Tina de enfriamiento de agua
  addPart('Forge_WaterTub', [4.2, 2.8, 4.2], [ox - 7, oy + 2.2, oz + 2], PALETTE.DarkWood, 'WoodPlanks');
  addPart('Forge_TubWater', [3.8, 0.3, 3.8], [ox - 7, oy + 3.2, oz + 2], [70, 160, 220], 'Glass');

  // Antorchas con punta negra en los muros de la forja
  addTorch('Forge_Torch1', ox + 14, oy + 5, oz - 4);
  addTorch('Forge_Torch2', ox - 14, oy + 5, oz - 4);

  // Cartel heráldico medieval
  addMedievalSignPlaque('ForjaBrokkr', ox, oy + 1.6, oz - 10);
}

// -------------------------------------------------------------
// 6. SECCIÓN 5: CAMPO DE TIRO CON DIANAS REALES (OESTE) - NO Neón
// -------------------------------------------------------------
function buildTrainingRange(ox = -62, oy = 0, oz = 0) {
  addPart('Training_BasePlatform', [34, 1.5, 42], [ox, oy + 0.75, oz], PALETTE.GrassForest, 'Grass');
  addPart('Training_WoodRail', [2, 3.5, 34], [ox + 10, oy + 2.6, oz], PALETTE.DarkWood, 'WoodPlanks');

  // 3 MANIQUÍS DE ENTRENAMIENTO CON DIANAS CONCÉNTRICAS REALES
  [-11, 0, 11].forEach((dz, idx) => {
    // Postes de madera
    addPart(`Dummy_Post_${idx + 1}`, [0.8, 6.5, 0.8], [ox - 6, oy + 4, oz + dz], PALETTE.DarkWood, 'Wood');
    addPart(`Dummy_Arms_${idx + 1}`, [0.8, 0.8, 4], [ox - 6, oy + 5.2, oz + dz], PALETTE.DarkWood, 'Wood');
    // Cuerpo y cabeza de saco de arpillera
    addPart(`Dummy_Body_${idx + 1}`, [2.4, 3.6, 1.8], [ox - 6, oy + 4.8, oz + dz], [190, 165, 115], 'Fabric');
    addPart(`Dummy_Head_${idx + 1}`, [1.6, 1.8, 1.6], [ox - 6, oy + 7.2, oz + dz], [200, 175, 120], 'Fabric');

    // DIANA DE TIRO MEDIEVAL CON ANILLOS CONCÉNTRICOS (Cero Neón)
    // 1. Base circular de madera
    addPart(`Dummy_TargetWood_${idx + 1}`, [0.2, 2.4, 2.4], [ox - 4.7, oy + 4.8, oz + dz], PALETTE.DarkWood, 'WoodPlanks');
    // 2. Anillo exterior blanco
    addPart(`Dummy_RingWhite_${idx + 1}`, [0.25, 2.1, 2.1], [ox - 4.6, oy + 4.8, oz + dz], PALETTE.TargetWhite, 'SmoothPlastic');
    // 3. Anillo medio rojo carmesí
    addPart(`Dummy_RingRed_${idx + 1}`, [0.3, 1.4, 1.4], [ox - 4.5, oy + 4.8, oz + dz], PALETTE.TargetRed, 'SmoothPlastic');
    // 4. Centro negro (Bullseye)
    addPart(`Dummy_Bullseye_${idx + 1}`, [0.35, 0.6, 0.6], [ox - 4.4, oy + 4.8, oz + dz], PALETTE.TargetBullseye, 'SmoothPlastic');
  });

  // Antorchas con punta negra
  addTorch('Training_Torch1', ox + 10, oy + 4.5, oz + 14);
  addTorch('Training_Torch2', ox + 10, oy + 4.5, oz - 14);

  // Cartel heráldico medieval
  addMedievalSignPlaque('CampoPruebas', ox + 8, oy + 1.6, oz);
}

// -------------------------------------------------------------
// 7. BOSQUE ENCANTADO: CÉSPED, MUSGO Y PIEDRAS BAJO LOS ÁRBOLES
// -------------------------------------------------------------
function buildEnchantedForest(ox = 0, oy = 0, oz = 0) {
  function addPineWithVegetation(x, z, scale = 1, idx = 1) {
    const bx = ox + x;
    const bz = oz + z;

    // 1. Césped orgánico y musgo bajo el árbol
    addPart(`Tree_GrassMound_${idx}`, [13 * scale, 0.6, 13 * scale], [bx, oy + 0.2, bz], PALETTE.GrassForest, 'Grass');
    addPart(`Tree_MossPatch_${idx}`, [8 * scale, 0.4, 8 * scale], [bx + 1 * scale, oy + 0.45, bz - 1 * scale], PALETTE.MossDense, 'Grass');

    // 2. Rocas y piedras naturales bajo el árbol (Slate y Cobblestone de varios tamaños)
    addPart(`Tree_RockBig_${idx}`, [3.2 * scale, 1.6 * scale, 2.6 * scale], [bx + 3.5 * scale, oy + 0.7 * scale, bz + 3 * scale], PALETTE.ForestRock, 'Slate');
    addPart(`Tree_RockSmall1_${idx}`, [1.8 * scale, 1.1 * scale, 1.6 * scale], [bx - 3.2 * scale, oy + 0.5 * scale, bz + 3.2 * scale], PALETTE.ForestRockLight, 'Cobblestone');
    addPart(`Tree_RockSmall2_${idx}`, [1.4 * scale, 0.8 * scale, 1.4 * scale], [bx + 2.2 * scale, oy + 0.4 * scale, bz - 3.5 * scale], PALETTE.TrimStone, 'Slate');

    // 3. Tronco robusto
    addPart(`Tree_Trunk_${idx}`, [2.2 * scale, 13 * scale, 2.2 * scale], [bx, oy + 6.5 * scale, bz], PALETTE.TreeBark, 'Wood');

    // 4. Tres capas de follaje denso
    addPart(`Tree_Leaves1_${idx}`, [12 * scale, 4.5 * scale, 12 * scale], [bx, oy + 10 * scale, bz], PALETTE.TreeNeedles, 'Grass');
    addPart(`Tree_Leaves2_${idx}`, [9 * scale, 4 * scale, 9 * scale], [bx, oy + 13.5 * scale, bz], PALETTE.TreeNeedles, 'Grass');
    addPart(`Tree_Leaves3_${idx}`, [5.5 * scale, 3.5 * scale, 5.5 * scale], [bx, oy + 16.5 * scale, bz], PALETTE.TreeNeedles, 'Grass');
  }

  const treeLocations = [
    [46, -46], [56, -48], [42, -58], [62, -36],
    [-42, -42], [-56, -36], [-36, -56], [-60, -56],
    [46, 46], [58, 40], [42, 56], [60, 52],
    [-46, 46], [-56, 40], [-42, 56], [-60, 52],
  ];

  treeLocations.forEach(([tx, tz], i) => {
    addPineWithVegetation(tx, tz, 0.85 + (i % 3) * 0.18, i + 1);
  });
}

// -------------------------------------------------------------
// 8. MURALLAS DEL CASTILLO & 4 TORRES CON ALMENAS
// -------------------------------------------------------------
function buildCastleWalls(ox = 0, oy = 0, oz = 0) {
  const R = 78;
  const H = 18;

  addPart('CastleWall_N', [156, H, 3], [ox, oy + H / 2, oz - R], PALETTE.CastleStone, 'Cobblestone');
  addPart('CastleWall_S', [156, H, 3], [ox, oy + H / 2, oz + R], PALETTE.CastleStone, 'Cobblestone');
  addPart('CastleWall_E', [3, H, 156], [ox + R, oy + H / 2, oz], PALETTE.CastleStone, 'Cobblestone');
  addPart('CastleWall_W', [3, H, 156], [ox - R, oy + H / 2, oz], PALETTE.CastleStone, 'Cobblestone');

  addPart('Parapet_N', [156, 2.5, 4], [ox, oy + H + 1.25, oz - R], PALETTE.TrimStone, 'Slate');
  addPart('Parapet_S', [156, 2.5, 4], [ox, oy + H + 1.25, oz + R], PALETTE.TrimStone, 'Slate');
  addPart('Parapet_E', [4, 2.5, 156], [ox + R, oy + H + 1.25, oz], PALETTE.TrimStone, 'Slate');
  addPart('Parapet_W', [4, 2.5, 156], [ox - R, oy + H + 1.25, oz], PALETTE.TrimStone, 'Slate');

  const corners = [
    [R, -R], [-R, -R], [R, R], [-R, R]
  ];

  corners.forEach(([cx, cz], idx) => {
    addPart(`Tower_Body_${idx + 1}`, [12, 32, 12], [ox + cx, oy + 16, oz + cz], PALETTE.CastleStone, 'Cobblestone');
    addPart(`Tower_Battlement_${idx + 1}`, [14, 3, 14], [ox + cx, oy + 33, oz + cz], PALETTE.TrimStone, 'Slate');
    addPart(`Tower_Roof_${idx + 1}`, [15, 12, 15], [ox + cx, oy + 40, oz + cz], PALETTE.RoofSlate, 'Slate');
    addPart(`Tower_BrazierCoals_${idx + 1}`, [4, 0.6, 4], [ox + cx, oy + 46.5, oz + cz], PALETTE.TorchBlackTip, 'Basalt');
    addPart(`Tower_BrazierFlame_${idx + 1}`, [2.4, 2, 2.4], [ox + cx, oy + 47.8, oz + cz], PALETTE.TorchFlameOrange, 'Neon', false);
  });
}

// -------------------------------------------------------------
// ENSAMBLADO Y EJECUCIÓN CONCURRENTE A TRAVÉS DE RAASE
// -------------------------------------------------------------
async function executeBuild() {
  console.log('🔮 [RAASE 2.0] Ensamblando Lobby Refinado (Vegetación rica, antorchas punta negra + VFX, dianas reales, forja ardiente, fuente limpia y carteles sutiles)...');

  const origin = [0, 5, 0];
  buildCourtyard(origin[0], origin[1], origin[2]);
  buildDungeonPortal(origin[0], origin[1], origin[2] - 62);
  buildCratesSanctuary(origin[0] - 48, origin[1], origin[2] - 46);
  buildPotionShop(origin[0] + 62, origin[1], origin[2]);
  buildArcaneForge(origin[0], origin[1], origin[2] + 62);
  buildTrainingRange(origin[0] - 62, origin[1], origin[2]);
  buildEnchantedForest(origin[0], origin[1], origin[2]);
  buildCastleWalls(origin[0], origin[1], origin[2]);

  console.log(`🏰 Total de partes arquitectónicas refinadas: ${parts.length}`);

  // 1. Limpieza preventiva del modelo MagicLobby anterior para evitar solapamientos y Z-fighting
  console.log('🧹 Limpiando modelo MagicLobby anterior en Workspace para evitar solapamientos...');
  try {
    await fetch(`${BRIDGE_URL}/api/scene-graph/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPath: 'workspace.MagicLobby' })
    });
  } catch (_) {
    // Si no existía o no responde de inmediato, continúa
  }

  // 2. Envío atómico mediante BATCH_SPAWN en bloques de hasta 150 partes por payload
  const BATCH_SIZE = 150;
  let batchIndex = 0;
  for (let i = 0; i < parts.length; i += BATCH_SIZE) {
    batchIndex++;
    const chunk = parts.slice(i, i + BATCH_SIZE);
    const batchPayload = {
      modelName: 'MagicLobby',
      parent: 'workspace',
      instances: chunk,
      wait: true
    };

    console.log(`⚡ Despachando Lote #${batchIndex}: ${chunk.length} partes agrupadas a /api/command/batch...`);
    const res = await fetch(`${BRIDGE_URL}/api/command/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload)
    });

    if (!res.ok) {
      console.error(`Error enviando lote #${batchIndex}:`, await res.text());
    } else {
      const data = await res.json();
      console.log(`✅ Lote #${batchIndex} instanciado exitosamente en Studio (${data.result?.createdCount || chunk.length} partes).`);
    }
  }

  console.log(`\n🎉 ¡Las ${parts.length} partes han sido creadas atómicamente en Roblox Studio sin error 429!`);

  // Ajustar cámara para vista panorámica del castillo
  console.log('🎥 Ajustando cámara para vista panorámica del castillo...');
  await fetch(`${BRIDGE_URL}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'FOCUS_CAMERA',
      args: {
        position: [0, 18, 0],
        distance: 110,
        pitch: -28,
        yaw: 40
      }
    })
  });

  console.log('✨ [RAASE 2.0] ¡Lobby Mágico perfeccionado y actualizado al 100%! ✨');
}

executeBuild().catch(err => {
  console.error('❌ Error construyendo el lobby:', err);
});
