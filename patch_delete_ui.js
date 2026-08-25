const fs = require('fs');
let content = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

// 1. Add Trash to lucide-react imports
if (!content.includes('Trash2')) {
  content = content.replace(
    /import \{\s*([^}]*?)\s*\}\s*from\s*["']lucide-react["'];/,
    (match, imports) => {
      return `import { ${imports}, Trash2 } from "lucide-react";`;
    }
  );
}

// 2. Add deleteMessage function inside InboxPage component
const deleteFunc = `
  const deleteMessage = async (msgId: string) => {
    if (!confirm('Delete this message for yourself? (Note: WhatsApp API does not allow deleting messages for the customer once sent)')) return;
    try {
      const res = await fetch(\`/api/messages/\${msgId}\`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(messages.filter(m => m.id !== msgId));
      }
    } catch (err) {}
  };
`;
content = content.replace(
  'const fetchMessagesForConv = useCallback(async (convId: string) => {',
  `${deleteFunc}\n\n  const fetchMessagesForConv = useCallback(async (convId: string) => {`
);

// 3. Add delete button to message bubbles
// Find the div wrapper for the message bubble
const messageBubbleFind = `<div\n                        key={msg.id}\n                        className={\`flex \${isNote ? 'justify-end' : (isInbound ? 'justify-start' : 'justify-end')}\`}\n                      >`;
const messageBubbleReplace = `<div\n                        key={msg.id}\n                        className={\`flex group \${isNote ? 'justify-end' : (isInbound ? 'justify-start' : 'justify-end')}\`}\n                      >`;
content = content.replace(messageBubbleFind, messageBubbleReplace);

const bubbleInnerFind = `                          {/* Render Media Payload */}`;
const bubbleInnerReplace = `
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className={\`absolute top-2 \${isInbound ? '-right-8' : '-left-8'} opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all cursor-pointer\`}
                            title="Delete for me"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Render Media Payload */}`;
content = content.replace(bubbleInnerFind, bubbleInnerReplace);

fs.writeFileSync('src/app/inbox/page.tsx', content);
console.log('Added delete functionality to UI.');
