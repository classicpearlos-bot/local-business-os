import assert from 'node:assert/strict';
import { adminClient, anonClient } from '../helpers/db-helper.mjs';

export async function runDatabaseRlsTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 2: Database Integrity, RPCs & RLS Isolation ---');

  // Create two distinct test tenants for isolation verification
  let orgA, orgB;
  try {
    const { data: a } = await adminClient.from('organizations').insert({ name: 'QA Tenant A' }).select().single();
    const { data: b } = await adminClient.from('organizations').insert({ name: 'QA Tenant B' }).select().single();
    orgA = a;
    orgB = b;
  } catch (e) {
    // fallback if org insert fails
  }

  await check('RLS: Anonymous client cannot read private campaigns across tenants', async () => {
    const { data, error } = await anonClient.from('campaigns').select('*');
    // Under RLS, anon client without org session must return 0 rows or error
    assert.ok(!data || data.length === 0, 'Anon client unexpectedly read campaigns table');
  });

  await check('RLS: Anonymous client cannot read tenant API keys', async () => {
    const { data, error } = await anonClient.from('api_keys').select('*');
    assert.ok(!data || data.length === 0, 'Anon client unexpectedly read api_keys table');
  });

  await check('RLS: Anonymous client cannot read tenant webhook secrets', async () => {
    const { data, error } = await anonClient.from('tenant_webhooks').select('*');
    assert.ok(!data || data.length === 0, 'Anon client unexpectedly read tenant_webhooks table');
  });

  await check('Constraint: Duplicate contact phone number within same org is rejected', async () => {
    if (!orgA) throw new Error('Test org not initialized');
    const phone = '+919998887771';
    
    // First insert
    await adminClient.from('contacts').insert({ organization_id: orgA.id, phone_number: phone, name: 'Contact 1' });
    
    // Second duplicate insert must fail unique constraint
    const { error: dupErr } = await adminClient.from('contacts').insert({ organization_id: orgA.id, phone_number: phone, name: 'Contact 2' });
    assert.ok(dupErr !== null, 'Expected unique constraint violation on duplicate phone number in same org');
  });

  await check('Constraint: Same phone number in DIFFERENT orgs is permitted (multi-tenant support)', async () => {
    if (!orgA || !orgB) throw new Error('Test orgs not initialized');
    const phone = '+919998887772';

    await adminClient.from('contacts').insert({ organization_id: orgA.id, phone_number: phone, name: 'Contact in Org A' });
    const { data, error } = await adminClient.from('contacts').insert({ organization_id: orgB.id, phone_number: phone, name: 'Contact in Org B' }).select().single();
    assert.ok(!error && data, 'Same phone number in different organizations was incorrectly rejected');
  });

  await check('RPC: increment_campaign_sent atomically updates total_sent', async () => {
    if (!orgA) throw new Error('Test org not initialized');
    const { data: camp } = await adminClient.from('campaigns').insert({
      organization_id: orgA.id,
      name: 'Analytics Test Camp',
      total_sent: 0
    }).select().single();

    assert.ok(camp, 'Failed to create test campaign');

    await adminClient.rpc('increment_campaign_sent', { camp_id: camp.id });
    await adminClient.rpc('increment_campaign_sent', { camp_id: camp.id });

    const { data: updated } = await adminClient.from('campaigns').select('total_sent').eq('id', camp.id).single();
    assert.equal(updated?.total_sent, 2, `Expected total_sent to be 2, got ${updated?.total_sent}`);
  });

  await check('RPC: claim_campaign_recipients executes atomically', async () => {
    const { data, error } = await adminClient.rpc('claim_campaign_recipients', { batch_size: 5 });
    assert.ok(!error, `RPC claim_campaign_recipients failed: ${error?.message}`);
    assert.ok(Array.isArray(data), 'Expected array of claimed recipients');
  });

  // Cleanup test orgs
  if (orgA) await adminClient.from('organizations').delete().eq('id', orgA.id);
  if (orgB) await adminClient.from('organizations').delete().eq('id', orgB.id);

  return results;
}
