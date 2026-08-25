const fs = require('fs');
let content = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

const replacements = {
  'bg-white': 'bg-[var(--color-cyber-panel)]',
  'bg-slate-50/80': 'bg-white/5',
  'bg-slate-50': 'bg-[var(--color-cyber-bg)]',
  'bg-slate-100': 'bg-white/10',
  'border-slate-200/80': 'border-white/10',
  'border-slate-200/60': 'border-white/10',
  'border-slate-200': 'border-white/10',
  'border-slate-100': 'border-white/5',
  'text-slate-900': 'text-white',
  'text-slate-800': 'text-gray-100',
  'text-slate-700': 'text-gray-200',
  'text-slate-600': 'text-gray-300',
  'text-slate-500': 'text-gray-400',
  'text-slate-400': 'text-gray-500',
  'text-slate-300': 'text-gray-600',
  'bg-indigo-600': 'bg-[var(--color-cyber-purple)] neon-glow-purple border-none',
  'text-indigo-600': 'text-[var(--color-cyber-purple)]',
  'text-indigo-500': 'text-[var(--color-cyber-purple)]',
  'hover:bg-slate-50': 'hover:bg-white/5',
  'hover:bg-slate-100': 'hover:bg-white/10',
  'focus:ring-indigo-500': 'focus:ring-[var(--color-cyber-purple)]',
  'focus:border-indigo-500': 'focus:border-[var(--color-cyber-purple)]',
  'border-indigo-100': 'border-[var(--color-cyber-purple)]/20',
  'bg-indigo-50': 'bg-[var(--color-cyber-purple)]/10',
};

for (const [oldClass, newClass] of Object.entries(replacements)) {
  const regex = new RegExp(`\\b${oldClass.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
  content = content.replace(regex, newClass);
}

// Special overrides for chat bubbles
content = content.replace(
  /bg-\[\#E7FFDB\] text-slate-900 shadow-sm/g,
  'bg-[var(--color-cyber-purple)] text-white shadow-sm neon-glow-purple'
);
content = content.replace(
  /bg-white text-slate-900 shadow-sm border border-slate-100/g,
  'bg-white/10 text-white shadow-sm border border-white/5 backdrop-blur-md'
);
content = content.replace(
  /text-emerald-500/g,
  'text-white'
);

fs.writeFileSync('src/app/inbox/page.tsx', content);
console.log('Inbox styling migrated safely.');
