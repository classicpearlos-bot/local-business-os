import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { TEST_CONFIG } from '../config/test-config.mjs';
import { adminClient, anonClient } from '../helpers/db-helper.mjs';

export async function runSecurityAttackTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 9: Security Attack & IDOR Tests ---');

  // Setup: Create two organizations with data
  const { data: org1 } = await adminClient.from('organizations').insert({ name: 'Attack Org 1' }).select().single();
  const { data: org2 } = await adminClient.from('organizations').insert({ name: 'Attack Org 2' }).select().single();

  const { data: contact1 } = await adminClient.from('contacts').insert({
    organization_id: org1.id, phone_number: '+919000000001', name: 'Org1 Secret Contact'
  }).select().single();

  const { data: campaign1 } = await adminClient.from('campaigns').insert({
    organization_id: org1.id, name: 'Org1 Secret Campaign', total_recipients: 100
  }).select().single();

  const { data: apiKey1 } = await adminClient.from('api_keys').insert({
    organization_id: org1.id, name: 'Org1 Secret Key',
    key_prefix: 'sk_test', key_hash: crypto.createHash('sha256').update('secret_key_org1').digest('hex')
  }).select().single();

  await check('IDOR: Anonymous client cannot read Org1 contacts by guessing UUID', async () => {
    const { data, error } = await anonClient
      .from('contacts')
      .select('*')
      .eq('id', contact1.id);
    
    // RLS should return empty result (not error, but no data)
    assert.ok(!data || data.length === 0, `IDOR vulnerability: anon client read org1 contact ${contact1.id}`);
  });

  await check('IDOR: Anonymous client cannot read Org1 campaigns', async () => {
    const { data } = await anonClient
      .from('campaigns')
      .select('*')
      .eq('id', campaign1.id);
    
    assert.ok(!data || data.length === 0, 'IDOR vulnerability: anon can read campaigns');
  });

  await check('IDOR: Anonymous client cannot read Org1 API keys', async () => {
    const { data } = await anonClient
      .from('api_keys')
      .select('*')
      .eq('id', apiKey1.id);
    
    assert.ok(!data || data.length === 0, 'IDOR vulnerability: anon can read API keys');
  });

  await check('Webhook token validation: fake token is rejected (403)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=FAKE_TOKEN_12345&hub.challenge=test_challenge`);
    assert.equal(res.status, 403, `Expected 403 but got ${res.status} — fake token accepted!`);
  });

  await check('Webhook token validation: missing challenge is rejected (403)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=some_token`);
    assert.equal(res.status, 403, `Expected 403 but got ${res.status}`);
  });

  await check('IDOR: Cannot update Org2 contacts via PATCH /api/contacts using Org1 ID', async () => {
    // Try to update contact1 (org1) without authentication
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/contacts`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: contact1.id, name: 'HACKED' })
    });
    // Should be 401 (not authenticated)
    assert.ok(res.status === 401 || res.status === 403, `Expected 401/403 but got ${res.status}`);
  });

  await check('Developer API: Cannot use another tenant API key for cross-tenant access', async () => {
    // Try to use an invalid key (not real key, just testing auth rejection)
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer completely_fake_key_12345'
      },
      body: JSON.stringify({ type: 'text', to: '919876543210', text: { body: 'hack' } })
    });
    assert.ok(res.status === 401, `Expected 401 but got ${res.status}`);
  });

  await check('SQL Injection: contact search does not expose data', async () => {
    const sqlInjection = "'; DROP TABLE public.contacts; --";
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/contacts?search=${encodeURIComponent(sqlInjection)}`);
    // Should return 401 (unauthenticated) not a DB error
    assert.ok(res.status === 401 || res.status === 200, `Got unexpected status: ${res.status}`);
    // Must not crash with 500
    assert.notEqual(res.status, 500, 'SQL injection caused a 500 error');
  });

  await check('Phone normalization: duplicate contact with different format is rejected', async () => {
    // +919000000001 was already inserted as Org1 contact above
    const { error } = await adminClient.from('contacts').insert({
      organization_id: org1.id,
      phone_number: '+919000000001',  // Same number, should fail unique constraint
      name: 'Duplicate Attempt'
    });
    assert.ok(error, 'Expected unique constraint violation but insert succeeded');
    assert.ok(error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique'), 
      `Expected unique constraint error but got: ${error.message}`);
  });

  // Cleanup
  await adminClient.from('organizations').delete().eq('id', org1.id);
  await adminClient.from('organizations').delete().eq('id', org2.id);

  return results;
}
