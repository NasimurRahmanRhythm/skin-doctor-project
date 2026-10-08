import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./site.css";

/**
 * Roboto everywhere on the website, display headings and body copy alike.
 * Light (300) for the large headings, 400–700 for the rest; no italics.
 */
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DermaSoul Medical Aesthetics — by Dr. Nusrat Liza",
  description:
    "A boutique dermatology studio blending clinical treatments with an unhurried, personal experience — for skin that changes with you.",
};

export const viewport: Viewport = {
  themeColor: "#f4eee3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
