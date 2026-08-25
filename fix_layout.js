const fs = require('fs');
let content = fs.readFileSync('src/app/layout.tsx');
// Remove null bytes and fix encoding
const cleanStr = content.toString('utf8').replace(/\0/g, '').replace(/\/\/\s*Trigger Vercel rebuild/g, '');
fs.writeFileSync('src/app/layout.tsx', cleanStr, 'utf8');
console.log('Fixed layout.tsx encoding');
