// @ts-check
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 34879;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

async function runTests() {
  console.log('🧪 Starting RAASE 2.1 Bridge Test Suite on port', TEST_PORT);

  // 1. Spawn bridge server with custom port and known Bearer token
  const serverProc = spawn('node', ['server.mjs'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      ROBLOXIA_BRIDGE_TOKEN: TEST_TOKEN,
      ROBLOXIA_NO_WRITE_TOKEN_FILE: '1'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProc.stdout.on('data', d => {
    // console.log('[Bridge]', d.toString().trim());
  });

  serverProc.stderr.on('data', d => {
    console.error('[Bridge Error]', d.toString().trim());
  });

  // Wait for server to start by polling /api/status up to 5s
  let started = false;
  const startTime = Date.now();
  while (Date.now() - startTime < 5000) {
    try {
      const res = await fetch(`${BASE_URL}/api/status`);
      if (res.ok) {
        started = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!started) {
    throw new Error(`Server failed to start and respond on ${BASE_URL}/api/status within 5s`);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`
  };

  try {
    // Test 1: Health and status endpoint (Public)
    console.log('Test 1: Health & Status (Public)');
    const resStatus = await fetch(`${BASE_URL}/api/status`);
    assert.strictEqual(resStatus.status, 200);
    const dataStatus = await resStatus.json();
    assert.strictEqual(dataStatus.bridge, 'running');
    assert.strictEqual(dataStatus.port, TEST_PORT);
    assert.strictEqual(dataStatus.authRequired, true);
    console.log('  ✓ Status endpoint OK');

    // Test 2: C1 Security - Reject unauthenticated requests
    console.log('Test 2: C1 Security - Reject unauthenticated calls with HTTP 401');
    const unauthPoll = await fetch(`${BASE_URL}/api/poll`);
    assert.strictEqual(unauthPoll.status, 401, 'Poll without auth should return 401');
    const unauthCmd = await fetch(`${BASE_URL}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SPAWN_PART' })
    });
    assert.strictEqual(unauthCmd.status, 401, 'Command without auth should return 401');
    console.log('  ✓ Unauthenticated requests rejected with 401');

    // Test 3: Batch command enqueueing (authenticated)
    console.log('Test 3: Batch command enqueueing with Bearer Auth');
    const batchRes = await fetch(`${BASE_URL}/api/command/batch`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        parent: 'Workspace.TestModel',
        wait: false,
        instances: [
          { name: 'Spawn1', className: 'SpawnLocation', position: [0, 5, 0], duration: 0 },
          { name: 'Part2', size: [2, 2, 2], position: [0, 10, 0], material: 'Cobblestone' }
        ]
      })
    });
    assert.strictEqual(batchRes.status, 202);
    const batchData = await batchRes.json();
    assert.strictEqual(batchData.success, true);
    assert.strictEqual(batchData.enqueued.action, 'BATCH_SPAWN');
    console.log('  ✓ Batch command enqueued OK');

    // Test 4: Studio long-poll retrieval (authenticated)
    console.log('Test 4: Studio long-poll retrieval');
    const pollRes = await fetch(`${BASE_URL}/api/poll`, { headers: authHeaders });
    assert.strictEqual(pollRes.status, 200);
    const pollData = await pollRes.json();
    assert.strictEqual(pollData.action, 'BATCH_SPAWN');
    assert.strictEqual(pollData.id, batchData.enqueued.id);
    assert.ok(pollData.reportNonce, 'Poller must receive reportNonce');
    assert.strictEqual(batchData.enqueued.reportNonce, undefined, 'Client must NOT receive reportNonce');
    console.log('  ✓ Poller received BATCH_SPAWN action with exclusive reportNonce');

    // Test 5: C4 Security - Reject orphan reports with invalid commandId
    console.log('Test 5: C4 Security - Reject orphan reports (HTTP 400)');
    const orphanRes = await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: 'cmd_non_existent_12345',
        status: 'SUCCESS'
      })
    });
    assert.strictEqual(orphanRes.status, 400, 'Orphan report must be rejected with 400');
    console.log('  ✓ Orphan report rejected cleanly with HTTP 400');

    // Test 5b: Anti-Forgery - Reject report without valid reportNonce (HTTP 403)
    console.log('Test 5b: Anti-Forgery - Reject report with forged or missing reportNonce (HTTP 403)');
    const forgedRes = await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: pollData.id,
        reportNonce: 'forged_fake_nonce_999',
        status: 'SUCCESS'
      })
    });
    assert.strictEqual(forgedRes.status, 403, 'Forged report without correct reportNonce must return 403');
    console.log('  ✓ Forged report rejected cleanly with HTTP 403');

    // Test 6: Report submission and C4 fail-closed behavior
    console.log('Test 6: Valid report submission and Fail-Closed status');
    const reportRes = await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: pollData.id,
        reportNonce: pollData.reportNonce,
        status: 'SUCCESS',
        details: { createdCount: 2, parent: 'Workspace.TestModel' },
        telemetry: { memoryMb: 350.2, primitives: 120, instances: 450 }
      })
    });
    assert.strictEqual(reportRes.status, 200);
    const reportData = await reportRes.json();
    assert.strictEqual(reportData.success, true);
    assert.strictEqual(reportData.recorded.status, 'SUCCESS');
    console.log('  ✓ Valid report recorded OK with matching reportNonce');

    // Test 7: Idempotency support
    console.log('Test 7: Command Idempotency with idempotencyKey');
    const idempotencyKey = 'idem_key_test_999';
    // Enqueue command with idempotency key
    const cmd1Res = await fetch(`${BASE_URL}/api/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        action: 'SPAWN_PART',
        args: { name: 'IdempotentPart' },
        wait: false,
        idempotencyKey
      })
    });
    assert.strictEqual(cmd1Res.status, 201);
    const cmd1Data = await cmd1Res.json();
    const cmd1Id = cmd1Data.enqueued.id;

    // Simulate poll
    const pollIdem = await (await fetch(`${BASE_URL}/api/poll`, { headers: authHeaders })).json();
    assert.strictEqual(pollIdem.id, cmd1Id);

    // Report success
    await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: cmd1Id,
        reportNonce: pollIdem.reportNonce,
        status: 'SUCCESS',
        details: { spawned: 'IdempotentPart' }
      })
    });

    // Replay command with identical idempotencyKey
    const replayRes = await fetch(`${BASE_URL}/api/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        action: 'SPAWN_PART',
        args: { name: 'IdempotentPart' },
        wait: true,
        idempotencyKey
      })
    });
    assert.strictEqual(replayRes.status, 200);
    const replayData = await replayRes.json();
    assert.strictEqual(replayData.idempotentReplay, true, 'Replayed command should return cached result');
    assert.strictEqual(replayData.commandId, cmd1Id);
    console.log('  ✓ Idempotent replay returned cached result without duplicate execution');

    // Test 8: Synchronous Scene Graph Query
    console.log('Test 8: Synchronous Scene Graph Query with waiter resolution');
    const queryPromise = fetch(`${BASE_URL}/api/scene-graph/query`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ rootPath: 'Workspace.TestModel', maxDepth: 2 })
    });

    const queryPollData = await (await fetch(`${BASE_URL}/api/poll`, { headers: authHeaders })).json();
    assert.strictEqual(queryPollData.action, 'GET_SCENE_GRAPH');

    await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: queryPollData.id,
        reportNonce: queryPollData.reportNonce,
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
    console.log('  ✓ Synchronous Scene Graph query resolved cleanly');

    console.log('\n🎉 ALL RAASE 2.1 BRIDGE SECURITY & FUNCTIONAL TESTS PASSED!\n');
  } finally {
    serverProc.kill();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
