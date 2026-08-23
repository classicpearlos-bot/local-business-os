import assert from 'node:assert/strict';
import { TEST_CONFIG } from '../config/test-config.mjs';
import { diagnoseMetaError } from '../../src/lib/meta/errorDiagnosis.ts';

export async function runExcelAndDiagnosticsTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 11: Excel Import, Audience & Meta Error Diagnostics ---');

  // Test 1: Diagnose "Not on WhatsApp" (#131026 / #131051)
  await check('Diagnostic Engine: Identifies "Not on WhatsApp" error (#131026)', async () => {
    const diag = diagnoseMetaError('131026', 'Message undeliverable');
    assert.strictEqual(diag.category, 'Not on WhatsApp');
    assert.strictEqual(diag.categoryBadgeVariant, 'danger');
    assert.ok(diag.explanation.includes('does not have an active WhatsApp account'));
  });

  // Test 2: Diagnose "24-Hour Window Expired" (#131047)
  await check('Diagnostic Engine: Identifies 24-Hour customer service window expired (#131047)', async () => {
    const diag = diagnoseMetaError('131047', 'Customer service window closed');
    assert.strictEqual(diag.category, '24hr Window Expired');
    assert.strictEqual(diag.categoryBadgeVariant, 'warning');
  });

  // Test 3: Diagnose "Rate Limit / Concurrency Cap" (#131056)
  await check('Diagnostic Engine: Identifies Meta API rate limit (#131056)', async () => {
    const diag = diagnoseMetaError('131056', 'Too many requests');
    assert.strictEqual(diag.category, 'Rate Limited');
    assert.strictEqual(diag.categoryBadgeVariant, 'info');
  });

  // Test 4: Diagnose "Billing / Payment Restriction" (#131042)
  await check('Diagnostic Engine: Identifies Meta billing restriction (#131042)', async () => {
    const diag = diagnoseMetaError('131042', 'Payment issue on account');
    assert.strictEqual(diag.category, 'Billing Restriction');
    assert.strictEqual(diag.categoryBadgeVariant, 'danger');
  });

  // Test 5: Diagnose "Template Parameter Mismatch" (#132000)
  await check('Diagnostic Engine: Identifies template variable/parameter mismatch (#132000)', async () => {
    const diag = diagnoseMetaError('132000', 'Parameter count mismatch');
    assert.strictEqual(diag.category, 'Template Mismatch');
    assert.strictEqual(diag.categoryBadgeVariant, 'warning');
  });

  // Test 6: Bulk Import API rejects unauthenticated requests
  await check('Bulk Contact Import API: Unauthenticated requests protected (401)', async () => {
    const res = await fetch(`${TEST_CONFIG.baseUrl}/api/contacts/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: [{ name: 'Test Client', phone_number: '+919876543210' }]
      })
    });

    assert.strictEqual(res.status, 401, 'Unauthenticated bulk import must return 401');
  });

  return results;
}
