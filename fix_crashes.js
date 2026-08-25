const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

// 1. Remove the DEBUG_START crash block
content = content.replace(/ \/\/ DEBUG LOG[\s\S]*?status: 'EXECUTED',[\s\S]*?error: 'Gemini Key Exists: ' \+ !!process\.env\.GEMINI_API_KEY\n  \}\);\n/, '');

// 2. Remove the AI_ERROR crash block
content = content.replace(/await supabaseAdmin\.from\('automation_executions'\)\.insert\(\{\n\s*organization_id: orgId,\n\s*conversation_id: conversationId,\n\s*inbound_message_id: messageId,\n\s*matched_keyword: 'AI_ERROR',\n\s*action_type: 'TEXT',\n\s*status: 'FAILED',\n\s*error: String\(aiErr\.message \|\| aiErr\)\n\s*\}\);/g, '');

// 3. Remove the AI_FALLBACK crash block
content = content.replace(/\/\/ Log execution for AI\n\s*await supabaseAdmin\.from\('automation_executions'\)\.insert\(\{\n\s*organization_id: orgId,\n\s*conversation_id: conversationId,\n\s*inbound_message_id: messageId,\n\s*matched_keyword: 'AI_FALLBACK',\n\s*action_type: 'TEXT',\n\s*status: 'EXECUTED'\n\s*\}\);/g, '');

fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Removed all crashing inserts from AI fallback.');
