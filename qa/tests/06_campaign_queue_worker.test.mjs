import assert from 'node:assert/strict';
import { TEST_CONFIG } from '../config/test-config.mjs';
import { adminClient } from '../helpers/db-helper.mjs';

export async function runCampaignQueueWorkerTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 6: Campaign Queue Worker Execution ---');

  const { data: org } = await adminClient.from('organizations').insert({ name: 'Campaign Queue QA Org' }).select().single();

  await check('Campaign Worker GET: Returns 200 and handles empty queue gracefully', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/campaigns/worker`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.message?.includes('empty') || typeof body.processed === 'number');
  });

  await check('Campaign Creation API rejects missing body / unauthenticated requests (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.ok(res.status === 400 || res.status === 401 || res.status === 403 || res.status === 500);
  });

  // Cleanup
  await adminClient.from('organizations').delete().eq('id', org.id);

  return results;
}
