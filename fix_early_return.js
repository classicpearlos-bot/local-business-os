const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

const buggyCheck = `  if (!automations || automations.length === 0) return;`;

content = content.replace(buggyCheck, `  // If no automations, we still proceed to AI fallback`);

fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Fixed early return bug.');
