const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// I will just replace the import statement.
const oldImport = "import { Search, Bell, Settings, MessageSquare, TrendingUp, TrendingDown, Users, Send, Percent, Megaphone, Plus, MoreHorizontal, User } from 'lucide-react';";
const newImport = "import { Search, Bell, Settings, MessageSquare, TrendingUp, TrendingDown, Users, Send, Percent, Megaphone, Plus, MoreHorizontal, User, Phone, CheckCheck, Zap, LayoutTemplate } from 'lucide-react';";

content = content.replace(oldImport, newImport);

fs.writeFileSync('src/app/page.tsx', content);
console.log('Fixed lucide imports');
