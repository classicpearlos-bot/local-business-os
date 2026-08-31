const fs = require('fs');

let content = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

const replacements = [
  { search: /bg-\[#06080F\]/g, replace: 'bg-[#F8F5EF]' },
  { search: /bg-\[#0B0F19\]/g, replace: 'bg-[#FFFDFC]' },
  { search: /bg-\[#080C14\]/g, replace: 'bg-[#F1ECE3]' },
  { search: /bg-\[#05070D\]/g, replace: 'bg-[#E5DED2]' },
  { search: /bg-slate-800/g, replace: 'bg-white shadow-sm' },
  { search: /bg-slate-900/g, replace: 'bg-[#F8F5EF]' },
  { search: /hover:bg-slate-800/g, replace: 'hover:bg-[#E5DED2]' },
  { search: /hover:bg-slate-900/g, replace: 'hover:bg-[#F8F5EF]' },
  { search: /text-white/g, replace: 'text-[#292722]' },
  { search: /text-\[#7C756D\]/g, replace: 'text-[#706B61]' },
  { search: /border-\[#EFE3CF\]/g, replace: 'border-[#E5DED2]' },
  { search: /border-\[#EFE3CF\]\/90/g, replace: 'border-[#E5DED2]' },
  { search: /border-slate-800/g, replace: 'border-[#E5DED2]' },
  { search: /from-\[#0B0F19\]/g, replace: 'from-[#FFFDFC]' },
  { search: /to-\[#0B0F19\]\/0/g, replace: 'to-[#FFFDFC]/0' },
  { search: /from-indigo-500/g, replace: 'from-[#B08D57]' },
  { search: /to-violet-600/g, replace: 'to-[#8C6514]' },
  { search: /hover:from-indigo-400/g, replace: 'hover:from-[#D6B878]' },
  { search: /hover:to-violet-500/g, replace: 'hover:to-[#B08D57]' },
  { search: /shadow-indigo-600\/30/g, replace: 'shadow-[#B08D57]/30' },
  { search: /bg-indigo-950/g, replace: 'bg-[#F1ECE3]' },
  { search: /text-indigo-300/g, replace: 'text-[#B08D57]' },
  { search: /border-indigo-800\/60/g, replace: 'border-[#B08D57]/40' },
  { search: /text-emerald-400/g, replace: 'text-[#3F7D58]' },
  { search: /bg-emerald-400\/10/g, replace: 'bg-[#3F7D58]/10' },
  { search: /bg-\[#111827\]/g, replace: 'bg-white' }, // bubbles
  { search: /bg-gradient-to-tr from-\[#1E1B2E\] to-\[#2C2740\]/g, replace: 'bg-gradient-to-tr from-[#FFFDFC] to-[#F8F5EF]' },
  { search: /text-blue-400/g, replace: 'text-[#B08D57]' }
];

replacements.forEach(({ search, replace }) => {
  content = content.replace(search, replace);
});

fs.writeFileSync('src/app/inbox/page.tsx', content, 'utf8');
console.log('Inbox theme updated.');
