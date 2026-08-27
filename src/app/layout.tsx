import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";

const font = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "NEXCHAT - Classic Pearls Salon",
  description: "Next Generation Customer Engagement & Marketing Automation OS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased selection:bg-amber-500/30">
      <body className={`${font.variable} font-sans bg-[#F7F3EA] text-[#1E1B18]`}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
