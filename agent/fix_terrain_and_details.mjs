// @ts-check
import { sendCommand, inspectObject, querySceneGraph } from './lib/bridge-client.mjs';

async function introspectTerrain() {
  console.log('🔍 [RN-10 Introspection] Inspecting workspace.Terrain before modifications...');
  try {
    const terrainInfo = await inspectObject('workspace.Terrain');
    if (terrainInfo && terrainInfo.result && terrainInfo.result.found) {
      console.log(`  ℹ️ Verified workspace.Terrain is active in DataModel.`);
      return true;
    }
  } catch (err) {
    console.warn('  ⚠️ Terrain inspection warning:', err.message);
  }
  return false;
}

async function fixTerrain() {
  const cliArgs = process.argv.slice(2);
  const isApply = cliArgs.includes('--apply');
  const isDryRun = !isApply || cliArgs.includes('--dry-run');

  console.log('🏔️ ========================================================');
  console.log('   RAASE 2.1 — Terrain Voxel Leveling & Backdrop Modifier   ');
  console.log(`   Execution Mode: ${isApply ? '⚡ APPLY (Active Mutation)' : '🛡️ DRY-RUN (Simulation Only)'}`);
  console.log('========================================================');

  // 1. Mandatory Introspection
  await introspectTerrain();

  const operations = [
    {
      desc: 'Clear obstructive rock blocks (Central East/West)',
      action: 'SET_TERRAIN_VOXELS',
      args: { shape: 'Block', material: 'Air', position: [0, 20, -100], size: [300, 60, 100] }
    },
    {
      desc: 'Clear West quadrant rock terrain',
      action: 'SET_TERRAIN_VOXELS',
      args: { shape: 'Block', material: 'Air', position: [-95, 20, -40], size: [140, 60, 140] }
    },
    {
      desc: 'Clear East quadrant rock terrain',
      action: 'SET_TERRAIN_VOXELS',
      args: { shape: 'Block', material: 'Air', position: [95, 20, -40], size: [140, 60, 140] }
    },
    {
      desc: 'Fill flat clear grass ground plane',
      action: 'SET_TERRAIN_VOXELS',
      args: { shape: 'Block', material: 'Grass', position: [0, -4, 0], size: [260, 8, 260] }
    },
    {
      desc: 'Build distant mountain backdrop at Z = -135',
      action: 'SET_TERRAIN_VOXELS',
      args: { shape: 'Block', material: 'Rock', position: [0, 16, -135], size: [280, 40, 45] }
    }
  ];

  if (isDryRun) {
    console.log('\n🛡️ [DRY-RUN SUMMARY — No voxel changes sent to Studio]');
    for (const [i, op] of operations.entries()) {
      console.log(`  ${i + 1}. [${op.args.material}] ${op.desc}`);
      console.log(`     Pos: [${op.args.position.join(', ')}] | Size: [${op.args.size.join(', ')}]`);
    }
    console.log('\n➡️ To apply these modifications to Studio, run with: node agent/fix_terrain_and_details.mjs --apply\n');
    return;
  }

  // 2. Apply modifications
  for (const [i, op] of operations.entries()) {
    console.log(`🔨 [${i + 1}/${operations.length}] Executing: ${op.desc}...`);
    await sendCommand(op.action, op.args, true);
  }

  console.log('✅ All terrain voxel operations applied successfully!');
}

fixTerrain().catch(err => {
  console.error('❌ Terrain fix failed:', err);
  process.exit(1);
});
