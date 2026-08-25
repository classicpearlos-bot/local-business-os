const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

// Replace background color
content = content.replace(/bg-\[#0B0F17\]/g, 'bg-[var(--color-cyber-panel)]');

// Update active tab styles
content = content.replace(
  /'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600\/20'/g,
  "'bg-[var(--color-cyber-purple)] text-white font-semibold neon-glow-purple'"
);

// Update inactive tab hover styles
content = content.replace(
  /'text-slate-400 hover:text-slate-200 hover:bg-slate-900\/60'/g,
  "'text-slate-400 hover:text-white hover:bg-white/5'"
);

// Update badge styles
content = content.replace(
  /'bg-indigo-500\/20 text-indigo-400 border border-indigo-500\/30'/g,
  "'bg-[var(--color-cyber-cyan)]/20 text-[var(--color-cyber-cyan)] border border-[var(--color-cyber-cyan)]/30'"
);

// Update quick command launcher
content = content.replace(/bg-slate-900\/90/g, 'bg-white/5');
content = content.replace(/border-slate-800/g, 'border-white/10');
content = content.replace(/hover:border-slate-700/g, 'hover:border-[var(--color-cyber-purple)]');

fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
console.log('Sidebar styles updated safely.');
