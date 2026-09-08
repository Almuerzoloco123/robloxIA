// @ts-check
import assert from 'node:assert';

const BASE_URL = 'http://127.0.0.1:34873';

async function testCircuitBreaker() {
  console.log('🧪 Testing Viewport Capture Circuit Breaker...');

  // 1. Reset circuit breaker
  const resetRes = await fetch(`${BASE_URL}/api/capture/reset`, { method: 'POST' });
  assert.strictEqual(resetRes.status, 200, 'Reset should return 200');
  const resetData = await resetRes.json();
  assert.strictEqual(resetData.success, true);
  console.log('✅ Reset endpoint works');

  // 2. Check /api/status
  const statusRes = await fetch(`${BASE_URL}/api/status`);
  const statusData = await statusRes.json();
  assert.strictEqual(statusData.captureCircuitBreaker.consecutiveCaptures, 0);
  assert.strictEqual(statusData.captureCircuitBreaker.maxConsecutive, 2);
  console.log('✅ /api/status reports circuit breaker state: 0 / 2');

  // 3. First capture
  console.log('📸 Performing capture #1...');
  const cap1 = await fetch(`${BASE_URL}/api/capture`, { method: 'POST' });
  const cap1Data = await cap1.json();
  assert.strictEqual(cap1.status, 200);
  assert.strictEqual(cap1Data.consecutiveCaptures, 1);
  console.log('✅ Capture #1 succeeded (count: 1)');

  // 4. Second capture
  console.log('📸 Performing capture #2...');
  const cap2 = await fetch(`${BASE_URL}/api/capture`, { method: 'POST' });
  const cap2Data = await cap2.json();
  assert.strictEqual(cap2.status, 200);
  assert.strictEqual(cap2Data.consecutiveCaptures, 2);
  console.log('✅ Capture #2 succeeded (count: 2)');

  // 5. Third capture without scene mutation -> MUST BE BLOCKED BY CIRCUIT BREAKER!
  console.log('🛑 Attempting capture #3 (should be BLOCKED by circuit breaker)...');
  const cap3 = await fetch(`${BASE_URL}/api/capture`, { method: 'POST' });
  const cap3Data = await cap3.json();
  assert.strictEqual(cap3.status, 429, 'Expected HTTP 429 Too Many Requests');
  assert.strictEqual(cap3Data.circuitBreaker, true, 'Expected circuitBreaker: true');
  assert.ok(cap3Data.error.includes('CIRCUIT_BREAKER_TRIGGERED'), 'Expected error text to include CIRCUIT_BREAKER_TRIGGERED');
  console.log('🎯 Circuit breaker successfully caught endless loop: HTTP 429 blocked!');

  // 6. Reset via reset endpoint
  await fetch(`${BASE_URL}/api/capture/reset`, { method: 'POST' });
  const statusAfterReset = await (await fetch(`${BASE_URL}/api/status`)).json();
  assert.strictEqual(statusAfterReset.captureCircuitBreaker.consecutiveCaptures, 0);
  console.log('✅ Counter reset back to 0 successfully');

  console.log('\n🎉 ALL CIRCUIT BREAKER TESTS PASSED PERFECTLY!');
}

testCircuitBreaker().catch(err => {
  console.error('❌ Circuit Breaker Test Failed:', err);
  process.exit(1);
});
