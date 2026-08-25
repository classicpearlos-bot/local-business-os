const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

// I will find the catch block for the AI fallback
const oldCatch = `      } catch (err) {
        console.error("AI Fallback Error:", err);
      }`;
      
const newCatch = `      } catch (err) {
        console.error("AI Fallback Error:", err);
        // Log the error to automation_executions so we can see it in diagnosis
        await supabaseAdmin.from('automation_executions').insert({
          organization_id: orgId,
          conversation_id: conversationId,
          inbound_message_id: messageId,
          matched_keyword: 'AI_ERROR',
          action_type: 'TEXT',
          status: 'FAILED',
          error: String(err.message || err)
        });
      }`;

content = content.replace(oldCatch, newCatch);
fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Added AI error logging to DB.');
