const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Global backgrounds
content = content.replace(/bg-\[#F9FAFB\]/g, 'bg-[var(--color-cyber-bg)]');
content = content.replace(/bg-slate-50\/80/g, 'bg-white/5');
content = content.replace(/bg-slate-50/g, 'bg-[var(--color-cyber-bg)]');
content = content.replace(/bg-white\/80/g, 'bg-[var(--color-cyber-panel)]');
content = content.replace(/bg-white/g, 'bg-[var(--color-cyber-panel)]');

// Borders
content = content.replace(/border-slate-100/g, 'border-white/10');
content = content.replace(/border-slate-200/g, 'border-white/20');
content = content.replace(/border-indigo-100/g, 'border-[var(--color-cyber-purple)]/30');
content = content.replace(/border-emerald-100/g, 'border-[var(--color-cyber-cyan)]/30');
content = content.replace(/border-sky-100/g, 'border-[var(--color-cyber-cyan)]/30');
content = content.replace(/border-purple-100/g, 'border-[var(--color-cyber-pink)]/30');

// Text Colors
content = content.replace(/text-slate-900/g, 'text-white');
content = content.replace(/text-slate-800/g, 'text-gray-200');
content = content.replace(/text-slate-600/g, 'text-gray-300');
content = content.replace(/text-slate-500/g, 'text-gray-400');
content = content.replace(/text-slate-400/g, 'text-gray-500');

// Stat Icons
content = content.replace(/text-indigo-600/g, 'text-[var(--color-cyber-purple)]');
content = content.replace(/bg-indigo-50/g, 'bg-[var(--color-cyber-purple)]/10');
content = content.replace(/text-emerald-600/g, 'text-[var(--color-cyber-cyan)]');
content = content.replace(/bg-emerald-50/g, 'bg-[var(--color-cyber-cyan)]/10');
content = content.replace(/text-sky-600/g, 'text-[var(--color-cyber-cyan)]');
content = content.replace(/bg-sky-50/g, 'bg-[var(--color-cyber-cyan)]/10');
content = content.replace(/text-purple-600/g, 'text-[var(--color-cyber-pink)]');
content = content.replace(/bg-purple-50/g, 'bg-[var(--color-cyber-pink)]/10');

// Shadows
content = content.replace(/shadow-sm/g, 'shadow-md shadow-black/20');
content = content.replace(/shadow-emerald-600\/30/g, 'shadow-[var(--color-cyber-purple)]/40 neon-glow-purple');
content = content.replace(/bg-emerald-600/g, 'bg-[var(--color-cyber-purple)] border-none');
content = content.replace(/hover:bg-emerald-700/g, 'hover:bg-[var(--color-cyber-purple)]/90');

fs.writeFileSync('src/app/page.tsx', content);
console.log('Dashboard styles updated safely.');
