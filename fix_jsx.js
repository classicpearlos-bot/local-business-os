const fs = require('fs');
let content = fs.readFileSync('src/components/flows/FlowCanvas.tsx', 'utf8');

content = content.replace(/Greater Than \(>\)/g, 'Greater Than (&gt;)');
content = content.replace(/Less Than \(<\)/g, 'Less Than (&lt;)');

fs.writeFileSync('src/components/flows/FlowCanvas.tsx', content, 'utf8');
console.log('Fixed JSX characters.');
