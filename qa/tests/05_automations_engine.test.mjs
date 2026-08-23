import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { TEST_CONFIG } from '../config/test-config.mjs';
import { adminClient } from '../helpers/db-helper.mjs';
import { FIXTURES } from '../fixtures/sample-payloads.mjs';

export async function runAutomationEngineTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 5: Keyword Automation Engine & Cooldown Logic ---');

  const wabaId = 'WABA_AUTO_' + crypto.randomBytes(4).toString('hex');
  const { data: org } = await adminClient.from('organizations').insert({ name: 'Automation QA Org' }).select().single();
  
  await adminClient.from('whatsapp_accounts').insert({
    organization_id: org.id,
    waba_id: wabaId,
    phone_number_id: 'PN_' + wabaId,
    access_token: 'EAAG_MOCK_TOKEN'
  });

  const { data: contact } = await adminClient.from('contacts').insert({
    organization_id: org.id,
    phone_number: '+919900112233',
    name: 'Auto User'
  }).select().single();

  // Create test automations: 1 EXACT (Priority 10), 1 CONTAINS (Priority 5)
  const { data: autoExact } = await adminClient.from('automations').insert({
    organization_id: org.id,
    name: 'Exact Match Bot',
    active: true,
    priority: 10,
    trigger_type: 'EXACT',
    trigger_config: { keywords: ['demo'] },
    action_type: 'TEXT',
    action_config: { text: 'Here is your demo link!' },
    cooldown_seconds: 60
  }).select().single();

  const { data: autoContains } = await adminClient.from('automations').insert({
    organization_id: org.id,
    name: 'Contains Match Bot',
    active: true,
    priority: 5,
    trigger_type: 'CONTAINS',
    trigger_config: { keywords: ['price', 'pricing', 'cost'] },
    action_type: 'TEXT',
    action_config: { text: 'Our prices start at $49' },
    cooldown_seconds: 0
  }).select().single();

  await check('EXACT match triggers when text matches keyword exactly (case-insensitive & trimmed)', async () => {
    const msgId = 'wamid.exact_' + crypto.randomBytes(6).toString('hex');
    const payload = FIXTURES.metaWebhookText(wabaId, contact.phone_number, msgId, '   DEMO   ');

    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);

    // Verify execution log in database
    const { data: exec } = await adminClient
      .from('automation_executions')
      .select('*')
      .eq('automation_id', autoExact.id)
      .single();

    assert.ok(exec, 'Automation execution log not found for exact match');
    assert.equal(exec.matched_keyword, 'demo');
  });

  await check('EXACT match does NOT trigger on sentence containing the word', async () => {
    const msgId = 'wamid.exact_fail_' + crypto.randomBytes(6).toString('hex');
    const payload = FIXTURES.metaWebhookText(wabaId, contact.phone_number, msgId, 'Can you send me a demo please?');

    // Delete previous execution for clean test
    await adminClient.from('automation_executions').delete().eq('automation_id', autoExact.id);

    await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const { data: exec } = await adminClient
      .from('automation_executions')
      .select('*')
      .eq('automation_id', autoExact.id);

    assert.equal(exec?.length || 0, 0, 'Exact match unexpectedly triggered on full sentence');
  });

  await check('CONTAINS match triggers when keyword is anywhere inside sentence', async () => {
    const msgId = 'wamid.contains_' + crypto.randomBytes(6).toString('hex');
    const payload = FIXTURES.metaWebhookText(wabaId, contact.phone_number, msgId, 'What is the full pricing breakdown?');

    await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const { data: exec } = await adminClient
      .from('automation_executions')
      .select('*')
      .eq('automation_id', autoContains.id)
      .single();

    assert.ok(exec, 'Contains match automation did not log execution');
    assert.equal(exec.matched_keyword, 'pricing');
  });

  // Cleanup
  await adminClient.from('organizations').delete().eq('id', org.id);

  return results;
}
