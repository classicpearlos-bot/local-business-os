import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { TEST_CONFIG } from '../config/test-config.mjs';
import { adminClient } from '../helpers/db-helper.mjs';

export async function runDeveloperApiTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 3: Developer API (/api/v1/send) & Idempotency ---');

  // Create test org and API key
  const { data: org } = await adminClient.from('organizations').insert({ name: 'API QA Org' }).select().single();
  const rawKey = 'nx_test_' + crypto.randomBytes(16).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data: apiKey } = await adminClient.from('api_keys').insert({
    organization_id: org.id,
    name: 'QA Test Key',
    key_prefix: rawKey.substring(0, 10),
    key_hash: keyHash
  }).select().single();

  // Expired API key
  const expiredRawKey = 'nx_expired_' + crypto.randomBytes(16).toString('hex');
  const expiredHash = crypto.createHash('sha256').update(expiredRawKey).digest('hex');
  await adminClient.from('api_keys').insert({
    organization_id: org.id,
    name: 'QA Expired Key',
    key_prefix: expiredRawKey.substring(0, 10),
    key_hash: expiredHash,
    expires_at: new Date(Date.now() - 3600000).toISOString()
  });

  // Revoked API key
  const revokedRawKey = 'nx_revoked_' + crypto.randomBytes(16).toString('hex');
  const revokedHash = crypto.createHash('sha256').update(revokedRawKey).digest('hex');
  await adminClient.from('api_keys').insert({
    organization_id: org.id,
    name: 'QA Revoked Key',
    key_prefix: revokedRawKey.substring(0, 10),
    key_hash: revokedHash,
    revoked_at: new Date().toISOString()
  });

  await check('/api/v1/send rejects requests without Authorization header (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: '+14155552671', type: 'text', text: { body: 'Hello' } })
    });
    assert.equal(res.status, 401);
  });

  await check('/api/v1/send rejects invalid bearer token (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer nx_invalid_nonexistent_key_12345',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to: '+14155552671', type: 'text', text: { body: 'Hello' } })
    });
    assert.equal(res.status, 401);
  });

  await check('/api/v1/send rejects expired API key (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${expiredRawKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to: '+14155552671', type: 'text', text: { body: 'Hello' } })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error?.includes('expired'));
  });

  await check('/api/v1/send rejects revoked API key (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${revokedRawKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to: '+14155552671', type: 'text', text: { body: 'Hello' } })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error?.includes('revoked'));
  });

  await check('/api/v1/send rejects unsupported message types (400)', async () => {
    // Add dummy whatsapp_account so it passes account validation
    await adminClient.from('whatsapp_accounts').insert({
      organization_id: org.id,
      waba_id: 'WABA_QA_123',
      phone_number_id: 'PN_QA_123',
      access_token: 'EAAG_MOCK_TOKEN'
    });

    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to: '+14155552671', type: 'unsupported_video_type', content: {} })
    });
    assert.equal(res.status, 400);
  });

  await check('Idempotency: Concurrent duplicate requests with same Idempotency-Key are protected against duplicate processing', async () => {
    const idempotencyKey = 'idem_' + crypto.randomUUID();

    // Directly test the database table lock for api_requests
    const { error: insert1 } = await adminClient.from('api_requests').insert({
      organization_id: org.id,
      idempotency_key: idempotencyKey,
      status: 'PROCESSING'
    });
    assert.ok(!insert1, 'Initial idempotency claim failed');

    // Duplicate insert with same key in same org must throw unique constraint conflict
    const { error: insert2 } = await adminClient.from('api_requests').insert({
      organization_id: org.id,
      idempotency_key: idempotencyKey,
      status: 'PROCESSING'
    });
    assert.ok(insert2 !== null, 'Expected unique constraint violation on concurrent duplicate idempotency key');
  });

  // Cleanup
  await adminClient.from('organizations').delete().eq('id', org.id);

  return results;
}
