const fs = require('fs');
let content = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

const regex = /\{\/\*\s*Render Media Payload\s*\*\/\}/;
const replaceWith = `
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className={\`absolute top-2 \${isInbound ? '-right-8' : '-left-8'} opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all cursor-pointer z-10\`}
                            title="Delete for me"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Render Media Payload */}`;

content = content.replace(regex, replaceWith);
fs.writeFileSync('src/app/inbox/page.tsx', content);
console.log('Fixed button injection.');
