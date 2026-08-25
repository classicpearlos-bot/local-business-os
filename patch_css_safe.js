const fs = require('fs');

const cssContent = `@import "tailwindcss";

@theme {
  --color-cyber-bg: #0F103E;
  --color-cyber-panel: #1E1B2E;
  --color-cyber-purple: #8B5CF6;
  --color-cyber-pink: #EC4899;
  --color-cyber-cyan: #06B6D4;
}

@layer base {
  :root {
    --background: 239 61% 15%; /* #0F103E */
    --foreground: 0 0% 100%;

    --card: 250 26% 14%; /* #1E1B2E */
    --card-foreground: 0 0% 100%;

    --popover: 250 26% 14%;
    --popover-foreground: 0 0% 100%;

    --primary: 258 90% 66%; /* #8B5CF6 */
    --primary-foreground: 0 0% 100%;

    --secondary: 330 81% 60%; /* #EC4899 */
    --secondary-foreground: 0 0% 100%;

    --muted: 250 26% 20%;
    --muted-foreground: 215.4 16.3% 70%;

    --accent: 188 95% 43%; /* #06B6D4 */
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 250 26% 24%;
    --input: 250 26% 24%;
    --ring: 258 90% 66%;

    --radius: 1rem;
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #2D2A4A;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #8B5CF6;
}

/* WhatsApp Chat Background Pattern */
.wa-chat-bg {
  background-color: #0F103E;
  background-image: radial-gradient(#2D2A4A 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Smooth Focus Rings */
.focus-ring {
  outline: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.focus-ring:focus-visible {
  box-shadow: 0 0 0 2px #0F103E, 0 0 0 4px #8B5CF6;
}

/* Card Glow Effect */
.card-subtle-glow {
  box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.25s ease, transform 0.25s ease, border 0.25s ease;
  border: 1px solid rgba(139, 92, 246, 0.15);
}
.card-subtle-glow:hover {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  border: 1px solid rgba(139, 92, 246, 0.6);
}

/* Cyber Neon Classes */
.neon-glow-purple { box-shadow: 0 0 15px rgba(139, 92, 246, 0.4); }
.neon-glow-pink { box-shadow: 0 0 15px rgba(236, 72, 153, 0.4); }
.neon-glow-cyan { box-shadow: 0 0 15px rgba(6, 182, 212, 0.4); }

.hover-neon-purple:hover { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
.hover-neon-pink:hover { box-shadow: 0 0 20px rgba(236, 72, 153, 0.6); }

/* Codeblock Styling */
pre, code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
`;

fs.writeFileSync('src/app/globals.css', cssContent);
console.log('globals.css updated safely.');
