import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";

/**
 * Roboto carries the whole console, headings and the prescription letterhead
 * included. No italics.
 */
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  style: ["normal"],
  display: "swap",
});

/** Record codes, vitals and prescriptions, where 0 vs O has to be obvious. */
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  style: ["normal"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DermaSoul Medical Aesthetics",
  description: "DermaSoul Medical Aesthetics by Dr. Nusrat Liza — clinic console",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoMono.variable} h-full antialiased`}>
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
