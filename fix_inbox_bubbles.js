const fs = require('fs');
let content = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

// Fix the outbound message styling which was accidentally broken by global text replacements
content = content.replace(
  /'bg-\[\#DCF8C6\] text-white rounded-tr-xs border border-\[\#C2EDB0\]'/g,
  "'bg-[var(--color-cyber-purple)] text-white rounded-tr-xs neon-glow-purple border-none'"
);

fs.writeFileSync('src/app/inbox/page.tsx', content);
console.log('Fixed invisible text in outbound bubbles.');
