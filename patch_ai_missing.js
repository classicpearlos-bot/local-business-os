const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

const missingKeyFind = `  // AI Fallback if no keywords matched
  if (process.env.GEMINI_API_KEY && inboundText && inboundText.length > 0) {`;

const missingKeyReplace = `  // AI Fallback if no keywords matched
  if (!process.env.GEMINI_API_KEY) {
    await supabaseAdmin.from('messages').insert({
      organization_id: orgId,
      conversation_id: conversationId,
      direction: 'OUTBOUND',
      type: 'internal_note',
      content: { internal_note: { body: "SYSTEM ERROR: GEMINI_API_KEY is not set in Vercel Environment Variables. AI cannot respond." } },
      status: 'READ'
    });
  } else if (process.env.GEMINI_API_KEY && inboundText && inboundText.length > 0) {`;

content = content.replace(missingKeyFind, missingKeyReplace);
fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Added missing key internal note check.');
