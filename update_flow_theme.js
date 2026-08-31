const fs = require('fs');
let content = fs.readFileSync('src/components/flows/FlowCanvas.tsx', 'utf8');

const replacements = [
  { search: /bg-\[#070A12\]/g, replace: 'bg-[#F8F5EF]' },
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
  { search: /border-slate-800/g, replace: 'border-[#E5DED2]' }
];

replacements.forEach(({ search, replace }) => {
  content = content.replace(search, replace);
});

fs.writeFileSync('src/components/flows/FlowCanvas.tsx', content, 'utf8');
console.log('FlowCanvas theme updated.');
