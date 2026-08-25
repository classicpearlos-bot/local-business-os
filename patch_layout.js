const fs = require('fs');
let content = fs.readFileSync('src/app/layout.tsx', 'utf8');
content = content.replace('bg-[#F9FAFB] text-slate-900', 'bg-[var(--color-cyber-bg)] text-white');
fs.writeFileSync('src/app/layout.tsx', content);
console.log('Layout patched');
