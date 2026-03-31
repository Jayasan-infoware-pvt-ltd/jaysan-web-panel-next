import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "JRPL | Inventory & Repair Panel",
  description: "Jaysan Resource (P) Ltd. — Inventory, Billing, Repairs & Analytics Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-800`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
