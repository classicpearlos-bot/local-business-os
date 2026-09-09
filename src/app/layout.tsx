import "./globals.css";
import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "react-hot-toast";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-sans',
});

const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: "Classic Pearl Salon OS",
  description: "Next Generation Customer Engagement",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased selection:bg-[#D4AF37]/30">
      <body className={`${inter.variable} ${cormorant.variable} font-sans bg-[#FAFAFA] text-[#111111] antialiased`}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
