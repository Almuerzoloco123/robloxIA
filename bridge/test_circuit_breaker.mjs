// @ts-check
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 34881;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_TOKEN = 'test_secret_circuit_breaker_token_1234567890';

async function runCircuitBreakerTests() {
  console.log('🧪 Starting Full Circuit Breaker & Real Mutation Delta Tests...');

  // Spawn server
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
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Initial State
    const status1 = await (await fetch(`${BASE_URL}/api/status`)).json();
    assert.strictEqual(status1.captureCircuitBreaker.consecutiveCaptures, 0);

    // 2. Perform Capture 1
    const cap1 = await (await fetch(`${BASE_URL}/api/capture`, { method: 'POST', headers: authHeaders })).json();
    assert.strictEqual(cap1.consecutiveCaptures, 1);
    console.log('  ✓ Capture #1 counted');

    // 3. Perform Capture 2 (Hits MAX)
    const cap2 = await (await fetch(`${BASE_URL}/api/capture`, { method: 'POST', headers: authHeaders })).json();
    assert.strictEqual(cap2.consecutiveCaptures, 2);
    console.log('  ✓ Capture #2 counted (MAX reached)');

    // 4. Capture 3 should be BLOCKED (HTTP 429)
    const cap3 = await fetch(`${BASE_URL}/api/capture`, { method: 'POST', headers: authHeaders });
    assert.strictEqual(cap3.status, 429);
    console.log('  ✓ Capture #3 blocked by circuit breaker (HTTP 429)');

    // 5. Test High Bug 1: A no-op EXECUTE_LUAU should NOT reset the circuit breaker!
    console.log('  -> Testing no-op EXECUTE_LUAU (must NOT reset circuit breaker)...');
    const noopCmd = await (await fetch(`${BASE_URL}/api/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'EXECUTE_LUAU', args: { code: 'game:GetService("Selection"):Set({})' }, wait: false })
    })).json();

    const noopPoll = await (await fetch(`${BASE_URL}/api/poll`, { headers: authHeaders })).json();
    assert.strictEqual(noopPoll.id, noopCmd.enqueued.id);
    assert.ok(noopPoll.reportNonce, 'Poller must receive reportNonce');

    // Verify forged report fails with 403
    const forgedReport = await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: noopPoll.id,
        status: 'SUCCESS',
        details: { executed: true, mutated: true }
      })
    });
    assert.strictEqual(forgedReport.status, 403, 'Report without valid reportNonce must be rejected with 403');

    // Report legitimate no-op execution (mutated: false) with valid reportNonce
    await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: noopPoll.id,
        reportNonce: noopPoll.reportNonce,
        status: 'SUCCESS',
        details: { executed: true, mutated: false }
      })
    });

    // Verify counter is STILL 2 and capture is STILL blocked!
    const statusAfterNoop = await (await fetch(`${BASE_URL}/api/status`)).json();
    assert.strictEqual(statusAfterNoop.captureCircuitBreaker.consecutiveCaptures, 2);
    const capStillBlocked = await fetch(`${BASE_URL}/api/capture`, { method: 'POST', headers: authHeaders });
    assert.strictEqual(capStillBlocked.status, 429);
    console.log('  ✓ No-op EXECUTE_LUAU properly refused to reset circuit breaker');

    // 6. Test Real Mutation: BATCH_SPAWN with createdCount > 0 resets counter!
    console.log('  -> Testing real mutating action BATCH_SPAWN (must reset circuit breaker)...');
    const mutCmd = await (await fetch(`${BASE_URL}/api/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'BATCH_SPAWN', args: { instances: [{ name: 'TestPart' }] }, wait: false })
    })).json();

    const mutPoll = await (await fetch(`${BASE_URL}/api/poll`, { headers: authHeaders })).json();
    assert.strictEqual(mutPoll.id, mutCmd.enqueued.id);

    // Report real mutation delta with matching reportNonce
    await fetch(`${BASE_URL}/api/report`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        commandId: mutPoll.id,
        reportNonce: mutPoll.reportNonce,
        status: 'SUCCESS',
        details: { createdCount: 1, updatedCount: 0 }
      })
    });

    // Verify counter is now RESET to 0!
    const statusAfterMutation = await (await fetch(`${BASE_URL}/api/status`)).json();
    assert.strictEqual(statusAfterMutation.captureCircuitBreaker.consecutiveCaptures, 0);
    console.log('  ✓ Real scene mutation successfully reset circuit breaker to 0!');

    // 7. Verify new capture succeeds now
    const capAfterReset = await fetch(`${BASE_URL}/api/capture`, { method: 'POST', headers: authHeaders });
    assert.strictEqual(capAfterReset.status, 200);
    console.log('  ✓ Capture succeeds after real scene mutation');

    console.log('\n🎉 ALL CIRCUIT BREAKER REAL-DELTA TESTS PASSED PERFECTLY!\n');
  } finally {
    serverProc.kill();
  }
}

runCircuitBreakerTests().catch(err => {
  console.error('❌ Circuit breaker test failed:', err);
  process.exit(1);
});
