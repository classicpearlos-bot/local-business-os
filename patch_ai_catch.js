const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

const catchFind = `      } catch (aiErr) {
        console.error("AI Fallback Error:", aiErr);
      }`;
const catchReplace = `      } catch (aiErr: any) {
        console.error("AI Fallback Error:", aiErr);
        // Log AI errors directly into the chat as an internal note so the user can see them
        await supabaseAdmin.from('messages').insert({
          organization_id: orgId,
          conversation_id: conversationId,
          direction: 'OUTBOUND',
          type: 'internal_note',
          content: { internal_note: { body: "SYSTEM ERROR: AI failed to respond. Reason: " + (aiErr.message || "Unknown API Error") } },
          status: 'READ'
        });
      }`;

content = content.replace(catchFind, catchReplace);
fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Added internal note error logging.');
