const fs = require('fs');
let content = fs.readFileSync('src/app/api/messages/[id]/route.ts', 'utf8');

content = content.replace(
  'const messageId = params.id;',
  'const { id: messageId } = await params;'
);

// We also need to change the function signature if Next.js expects Promise
content = content.replace(
  '{ params }: { params: { id: string } }',
  '{ params }: { params: Promise<{ id: string }> }'
);

fs.writeFileSync('src/app/api/messages/[id]/route.ts', content);
console.log('Fixed Next.js 15+ params promise issue.');
