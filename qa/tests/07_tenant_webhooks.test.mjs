import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { TEST_CONFIG } from '../config/test-config.mjs';
import { adminClient } from '../helpers/db-helper.mjs';
import { FIXTURES } from '../fixtures/sample-payloads.mjs';

export async function runTenantWebhookTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 7: Outbound Tenant Webhooks Queueing ---');

  const wabaId = 'WABA_WH_' + crypto.randomBytes(4).toString('hex');
  const { data: org } = await adminClient.from('organizations').insert({ name: 'Tenant Webhook QA Org' }).select().single();

  await adminClient.from('whatsapp_accounts').insert({
    organization_id: org.id,
    waba_id: wabaId,
    phone_number_id: 'PN_' + wabaId,
    access_token: 'EAAG_MOCK_TOKEN'
  });

  const { data: webhook } = await adminClient.from('tenant_webhooks').insert({
    organization_id: org.id,
    url: 'https://webhook.site/test-endpoint',
    secret: 'whsec_test_secret_123',
    active: true,
    events: ['message.received']
  }).select().single();

  await check('Subscribed event (message.received) is queued into tenant_webhook_deliveries on inbound message', async () => {
    const msgId = 'wamid.wh_' + crypto.randomBytes(6).toString('hex');
    const payload = FIXTURES.metaWebhookText(wabaId, '+919988776655', msgId, 'Testing tenant webhook dispatch');

    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);

    const { data: deliveries } = await adminClient
      .from('tenant_webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhook.id);

    assert.ok(deliveries && deliveries.length > 0, 'Webhook event was not queued into deliveries table');
    assert.equal(deliveries[0].status, 'PENDING');
  });

  await check('Unsubscribed event (message.failed) is NOT queued for this endpoint', async () => {
    const beforeCount = (await adminClient.from('tenant_webhook_deliveries').select('id').eq('webhook_id', webhook.id)).data?.length || 0;

    // Send a message.failed status webhook
    const statusPayload = FIXTURES.metaWebhookStatus(wabaId, 'wamid.nonexistent', 'failed', '+919988776655');
    await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusPayload)
    });

    const afterCount = (await adminClient.from('tenant_webhook_deliveries').select('id').eq('webhook_id', webhook.id)).data?.length || 0;
    assert.equal(beforeCount, afterCount, 'Unsubscribed event was incorrectly queued');
  });

  // Cleanup
  await adminClient.from('organizations').delete().eq('id', org.id);

  return results;
}
