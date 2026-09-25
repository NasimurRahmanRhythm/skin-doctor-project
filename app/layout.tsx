import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

/**
 * Manrope carries the whole console. It holds its shape at 11px in a table
 * header and still has real weight at 800 for a heading, which is what lets
 * one family do all the hierarchy work — mixing display faces reads as
 * marketing, not as a tool.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Record codes, vitals and prescriptions, where 0 vs O has to be obvious. */
const monoCode = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Only for the letterhead: the doctor's name and the brand on the
 * prescription pad, where the logo's serif voice belongs. Never for UI text.
 */
const display = Cormorant_Garamond({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DermaSoul Aesthetics",
  description: "DermaSoul Medical Aesthetics by Dr. Nusrat Liza — clinic console",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${monoCode.variable} ${display.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
