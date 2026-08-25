const fs = require('fs');
let content = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

content = content.replace(
  /useEffect\(\(\) => \{\s+messagesEndRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth' \}\);\s+\}, \[messages\]\);/g,
  `useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]); // Only auto-scroll on new messages or conversation change`
);

fs.writeFileSync('src/app/inbox/page.tsx', content);
console.log('Fixed auto-scroll bug.');
