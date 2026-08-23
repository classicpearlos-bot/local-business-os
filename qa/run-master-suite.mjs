import fs from 'node:fs';
import path from 'node:path';

try {
  process.loadEnvFile('.env');
} catch (e) {}
import { runAuthTests } from './tests/01_auth_security.test.mjs';
import { runDatabaseRlsTests } from './tests/02_database_rls.test.mjs';
import { runDeveloperApiTests } from './tests/03_developer_api_idempotency.test.mjs';
import { runMetaWebhookTests } from './tests/04_meta_webhook_adversarial.test.mjs';
import { runAutomationEngineTests } from './tests/05_automations_engine.test.mjs';
import { runCampaignQueueWorkerTests } from './tests/06_campaign_queue_worker.test.mjs';
import { runTenantWebhookTests } from './tests/07_tenant_webhooks.test.mjs';
import { runFrontendPagesIntegrityTests } from './tests/08_frontend_pages_api_integrity.test.mjs';
import { runSecurityAttackTests } from './tests/09_security_attack_tests.test.mjs';
import { runMediaCampaignsTests } from './tests/10_media_campaigns_test_send.test.mjs';
import { runExcelAndDiagnosticsTests } from './tests/11_excel_import_and_diagnostics.test.mjs';

async function runMasterQaMission() {
  console.log('================================================================');
  console.log('🚀 MASTER QA, VERIFICATION, VALIDATION & ADVERSARIAL TEST RUNNER');
  console.log('================================================================\n');

  const startTime = Date.now();
  const suiteResults = [];

  const suites = [
    { name: 'Suite 1: Authentication & Authorization Security', runner: runAuthTests },
    { name: 'Suite 2: Database Integrity, RPCs & RLS Isolation', runner: runDatabaseRlsTests },
    { name: 'Suite 3: Developer API (/api/v1/send) & Idempotency', runner: runDeveloperApiTests },
    { name: 'Suite 4: Meta Webhook Inbound & Status Tick Processing', runner: runMetaWebhookTests },
    { name: 'Suite 5: Keyword Automation Engine & Cooldown Logic', runner: runAutomationEngineTests },
    { name: 'Suite 6: Campaign Queue Worker Execution', runner: runCampaignQueueWorkerTests },
    { name: 'Suite 7: Outbound Tenant Webhooks Queueing', runner: runTenantWebhookTests },
    { name: 'Suite 8: Frontend Pages & Routing Integrity', runner: runFrontendPagesIntegrityTests },
    { name: 'Suite 9: Security Attack, IDOR & Adversarial Tests', runner: runSecurityAttackTests },
    { name: 'Suite 10: Media Campaigns, Validation & Test Send', runner: runMediaCampaignsTests },
    { name: 'Suite 11: Excel Import, Audience & Meta Error Diagnostics', runner: runExcelAndDiagnosticsTests }
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    try {
      const tests = await suite.runner();
      const passed = tests.filter(t => t.status === 'PASS').length;
      const failed = tests.filter(t => t.status === 'FAIL').length;

      totalTests += tests.length;
      totalPassed += passed;
      totalFailed += failed;

      suiteResults.push({
        suite: suite.name,
        total: tests.length,
        passed,
        failed,
        tests
      });

      console.log(`\n📊 ${suite.name}: ${passed}/${tests.length} PASS`);
      for (const t of tests) {
        if (t.status === 'PASS') {
          console.log(`  ✅ [PASS] ${t.name}`);
        } else {
          console.log(`  ❌ [FAIL] ${t.name}`);
          if (t.error) console.log(`     Error: ${t.error}`);
        }
      }
    } catch (suiteError) {
      console.error(`💥 Suite failed with crash: ${suite.name}`, suiteError);
      totalFailed++;
      suiteResults.push({
        suite: suite.name,
        error: suiteError.message,
        tests: []
      });
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  const reportJson = {
    timestamp: new Date().toISOString(),
    durationSeconds: parseFloat(durationSec),
    summary: {
      totalSuites: suites.length,
      totalTests,
      totalPassed,
      totalFailed,
      passRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) + '%' : '0%'
    },
    suiteResults
  };

  // Write JSON report
  const jsonReportPath = path.join(process.cwd(), 'qa', 'reports', 'master-qa-report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportJson, null, 2));

  // Write Markdown report
  let mdReport = `# Master QA, Verification & Validation Report\n\n`;
  mdReport += `**Timestamp**: ${reportJson.timestamp}  \n`;
  mdReport += `**Duration**: ${durationSec}s  \n`;
  mdReport += `**Total Tests Executed**: ${totalTests}  \n`;
  mdReport += `**Passed**: ${totalPassed} (✅ ${reportJson.summary.passRate})  \n`;
  mdReport += `**Failed**: ${totalFailed}  \n\n`;

  mdReport += `## Test Suite Breakdown\n\n`;
  for (const s of suiteResults) {
    mdReport += `### ${s.suite}\n`;
    mdReport += `* **Results**: ${s.passed || 0}/${s.total || 0} Passed\n`;
    if (s.tests && s.tests.length > 0) {
      for (const t of s.tests) {
        mdReport += `  * ${t.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}: ${t.name}${t.error ? ` (*${t.error}*)` : ''}\n`;
      }
    }
    mdReport += `\n`;
  }

  const mdReportPath = path.join(process.cwd(), 'qa', 'reports', 'master-qa-report.md');
  fs.writeFileSync(mdReportPath, mdReport);

  console.log('\n================================================================');
  console.log(`🏁 MASTER QA RUN COMPLETED in ${durationSec}s`);
  console.log(`Total: ${totalTests} | Passed: ${totalPassed} | Failed: ${totalFailed} | Pass Rate: ${reportJson.summary.passRate}`);
  console.log(`Reports saved to:`);
  console.log(`- ${jsonReportPath}`);
  console.log(`- ${mdReportPath}`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

runMasterQaMission().catch(console.error);
