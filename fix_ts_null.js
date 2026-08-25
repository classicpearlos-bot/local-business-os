const fs = require('fs');
let content = fs.readFileSync('src/lib/automations/service.ts', 'utf8');

// Replace the loop to handle null safely
content = content.replace(
  'for (const automation of automations) {',
  'for (const automation of (automations || [])) {'
);

// Also verify there aren't any other strict null check failures
fs.writeFileSync('src/lib/automations/service.ts', content);
console.log('Fixed TypeScript null check error.');
