import assert from 'node:assert/strict';
import { TEST_CONFIG } from '../config/test-config.mjs';

export async function runFrontendPagesIntegrityTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  console.log('\n--- Running Suite 8: Frontend Pages & Routing Integrity ---');

  const pages = [
    { path: '/', name: 'Dashboard' },
    { path: '/inbox', name: 'Multi-Agent Inbox' },
    { path: '/campaigns', name: 'Campaigns Dashboard' },
    { path: '/contacts', name: 'Contacts CRM' },
    { path: '/templates', name: 'Message Templates' },
    { path: '/automations', name: 'Keyword Automations' },
    { path: '/whatsapp', name: 'WhatsApp Meta Settings' },
    { path: '/developers', name: 'Developers & Webhooks' },
    { path: '/login', name: 'Sign In' },
    { path: '/signup', name: 'Sign Up' }
  ];

  for (const page of pages) {
    await check(`Page [${page.name}] (${page.path}) responds with HTTP 200`, async () => {
      const res = await fetch(`${TEST_CONFIG.baseUrl}${page.path}`, {
        headers: {
          'Cookie': 'demo-session=true'
        }
      });
      assert.equal(res.status, 200, `Page ${page.path} returned status ${res.status}`);
      const text = await res.text();
      assert.ok(text.length > 100, `Page ${page.path} returned empty HTML payload`);
    });
  }

  return results;
}
