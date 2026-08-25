const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

const debugLog = `  if (!inboundText) return;

  // DEBUG LOG
  await supabaseAdmin.from('automation_executions').insert({
    organization_id: orgId,
    conversation_id: conversationId,
    inbound_message_id: messageId,
    matched_keyword: 'DEBUG_START',
    action_type: 'TEXT',
    status: 'EXECUTED',
    error: 'Gemini Key Exists: ' + !!process.env.GEMINI_API_KEY
  });
`;

content = content.replace('  if (!inboundText) return;', debugLog);
fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Injected debug log');
