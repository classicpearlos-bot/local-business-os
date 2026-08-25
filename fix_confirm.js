const fs = require('fs');
let content = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

content = content.replace(
  /if \(!confirm\('/g,
  "if (!window.confirm('"
);

fs.writeFileSync('src/app/inbox/page.tsx', content);
console.log('Fixed window.confirm issue.');
