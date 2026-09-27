import type { Metadata, Viewport } from "next";
import { Fraunces, Jost } from "next/font/google";
import "./site.css";

/** Display voice — the same Fraunces the original page used, set light and large. */
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

/** Geometric sans for tracked caps, the badge ring and body copy. */
const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DermaSoul Aesthetics — Medical Aesthetics by Dr. Nusrat Liza",
  description:
    "A boutique dermatology studio blending clinical treatments with an unhurried, personal experience — for skin that changes with you.",
};

export const viewport: Viewport = {
  themeColor: "#f4eee3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
