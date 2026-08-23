import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { TEST_CONFIG } from '../config/test-config.mjs';
import { adminClient } from '../helpers/db-helper.mjs';
import { FIXTURES } from '../fixtures/sample-payloads.mjs';

export async function runMetaWebhookTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 4: Meta Webhook Inbound & Status Tick Processing ---');

  // Create test org and link a WABA ID
  const wabaId = 'WABA_TEST_' + crypto.randomBytes(6).toString('hex');
  const { data: org } = await adminClient.from('organizations').insert({ name: 'Webhook QA Org' }).select().single();
  await adminClient.from('whatsapp_accounts').insert({
    organization_id: org.id,
    waba_id: wabaId,
    phone_number_id: 'PN_' + wabaId,
    access_token: 'EAAG_MOCK_TOKEN',
    webhook_verify_token: 'valid_token'
  });

  await check('Meta Webhook GET: Responds with challenge on valid subscription', async () => {
    const challenge = 'test_challenge_123456';
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=valid_token&hub.challenge=${challenge}`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.equal(body, challenge);
  });

  await check('Meta Webhook GET: Rejects missing verification challenge (403)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook?hub.mode=invalid`);
    assert.equal(res.status, 403);
  });

  await check('Meta Webhook POST: Gracefully handles malformed / non-whatsapp payload (404)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(FIXTURES.malformedWebhook)
    });
    assert.equal(res.status, 404);
  });

  await check('Meta Webhook POST: Inbound text message auto-creates contact and conversation', async () => {
    const phone = '+919911223344';
    const msgId = 'wamid.HBgL' + crypto.randomBytes(8).toString('hex');
    const textBody = 'Hello from automated QA test!';

    const payload = FIXTURES.metaWebhookText(wabaId, phone, msgId, textBody);

    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    // Verify contact in database (stored in normalized E.164 format)
    const { data: contact } = await adminClient
      .from('contacts')
      .select('id, phone_number')
      .eq('organization_id', org.id)
      .eq('phone_number', phone)
      .single();

    assert.ok(contact, 'Contact was not created in database');

    // Verify message in database
    const { data: msg } = await adminClient
      .from('messages')
      .select('id, content, direction')
      .eq('organization_id', org.id)
      .eq('wam_id', msgId)
      .single();

    assert.ok(msg, 'Message was not inserted into database');
    assert.equal(msg.direction, 'INBOUND');
  });

  await check('Meta Webhook POST: Status update (DELIVERED/READ) updates message status', async () => {
    const phone = '+919911223355';
    const msgId = 'wamid.HBgL' + crypto.randomBytes(8).toString('hex');

    // Insert an outbound message first
    const { data: contact } = await adminClient.from('contacts').insert({
      organization_id: org.id,
      phone_number: phone,
      name: 'Status Test User'
    }).select().single();

    await adminClient.from('messages').insert({
      organization_id: org.id,
      contact_id: contact.id,
      wam_id: msgId,
      direction: 'OUTBOUND',
      type: 'text',
      content: { text: { body: 'Outbound test' } },
      status: 'SENT'
    });

    // Send DELIVERED status webhook
    const statusPayload = FIXTURES.metaWebhookStatus(wabaId, msgId, 'delivered', phone);
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusPayload)
    });

    assert.equal(res.status, 200);

    // Verify message updated to DELIVERED
    const { data: updatedMsg } = await adminClient
      .from('messages')
      .select('status')
      .eq('wam_id', msgId)
      .single();

    assert.equal(updatedMsg?.status, 'DELIVERED');
  });

  // Cleanup
  await adminClient.from('organizations').delete().eq('id', org.id);

  return results;
}
