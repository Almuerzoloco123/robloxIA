// @ts-check
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 34879;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runTests() {
  console.log('🧪 Starting RAASE 2.1 Bridge Test Suite on port', TEST_PORT);

  // 1. Spawn bridge server with custom port
  const serverProc = spawn('node', ['server.mjs'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProc.stdout.on('data', d => {
    // console.log('[Bridge]', d.toString().trim());
  });

  serverProc.stderr.on('data', d => {
    console.error('[Bridge Error]', d.toString().trim());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Test 1: Status endpoint
    console.log('Test 1: Health & Status');
    const resStatus = await fetch(`${BASE_URL}/api/status`);
    assert.strictEqual(resStatus.status, 200);
    const dataStatus = await resStatus.json();
    assert.strictEqual(dataStatus.bridge, 'running');
    assert.strictEqual(dataStatus.port, TEST_PORT);
    console.log('  ✓ Status endpoint OK');

    // Test 2: Batch command enqueueing (async mode)
    console.log('Test 2: Batch command enqueueing');
    const batchRes = await fetch(`${BASE_URL}/api/command/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent: 'Workspace.TestModel',
        wait: false,
        instances: [
          { name: 'Part1', size: [4, 1, 4], position: [0, 5, 0], material: 'Glass' },
          { name: 'Part2', size: [2, 2, 2], position: [0, 10, 0], material: 'Cobblestone' }
        ]
      })
    });
    assert.strictEqual(batchRes.status, 202);
    const batchData = await batchRes.json();
    assert.strictEqual(batchData.success, true);
    assert.strictEqual(batchData.enqueued.action, 'BATCH_SPAWN');
    console.log('  ✓ Batch command enqueued OK');

    // Test 3: Polling by simulated Studio plugin
    console.log('Test 3: Studio long-poll retrieval');
    const pollRes = await fetch(`${BASE_URL}/api/poll`);
    assert.strictEqual(pollRes.status, 200);
    const pollData = await pollRes.json();
    assert.strictEqual(pollData.action, 'BATCH_SPAWN');
    assert.strictEqual(pollData.id, batchData.enqueued.id);
    console.log('  ✓ Poller received BATCH_SPAWN action');

    // Test 4: Report submission from simulated Studio plugin
    console.log('Test 4: Studio report execution');
    const reportRes = await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId: pollData.id,
        status: 'SUCCESS',
        details: { createdCount: 2, parent: 'Workspace.TestModel' },
        telemetry: { memoryMb: 350.2, primitives: 120, instances: 450 }
      })
    });
    assert.strictEqual(reportRes.status, 200);
    const reportData = await reportRes.json();
    assert.strictEqual(reportData.success, true);
    console.log('  ✓ Report recorded OK');

    // Test 5: Synchronous Scene Graph Query (GET_SCENE_GRAPH with wait)
    console.log('Test 5: Synchronous Scene Graph Query with waiter resolution');
    const queryPromise = fetch(`${BASE_URL}/api/scene-graph/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootPath: 'Workspace.TestModel', maxDepth: 2 })
    });

    // Simulate Studio polling the command
    const queryPollRes = await fetch(`${BASE_URL}/api/poll`);
    const queryPollData = await queryPollRes.json();
    assert.strictEqual(queryPollData.action, 'GET_SCENE_GRAPH');

    // Simulate Studio fulfilling the report
    await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId: queryPollData.id,
        status: 'SUCCESS',
        details: {
          totalScanned: 2,
          returnedCount: 2,
          root: { name: 'TestModel', className: 'Model', childCount: 2 }
        }
      })
    });

    const queryRes = await queryPromise;
    assert.strictEqual(queryRes.status, 200);
    const queryData = await queryRes.json();
    assert.strictEqual(queryData.success, true);
    assert.strictEqual(queryData.result.returnedCount, 2);
    assert.strictEqual(queryData.result.root.name, 'TestModel');
    console.log('  ✓ Synchronous Scene Graph query resolved cleanly!');

    console.log('\n🎉 ALL RAASE 2.1 BRIDGE UNIT & INTEGRATION TESTS PASSED!\n');
  } finally {
    serverProc.kill();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
