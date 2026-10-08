import type { ReactNode } from "react";
import SmoothScroll from "@/components/site/fx/SmoothScroll";
import Cursor from "@/components/site/fx/Cursor";
import IntroDone from "@/components/site/fx/IntroDone";
import Header from "@/components/site/sections/Header";
import Footer, { FabInstagram } from "@/components/site/sections/Footer";
import { getSocialLinks } from "@/lib/site/data";
import { socialDefaults } from "@/lib/site/content";

/**
 * The frame around every inner page (/treatments, /packages, /products,
 * /inquiry): the same header and footer as the landing page, without its
 * preloader and hero.
 */
export default async function PageShell({ children }: { children: ReactNode }) {
  const social = await getSocialLinks();
  return (
    <>
      <SmoothScroll />
      <IntroDone />
      <Cursor />
      <Header alwaysSolid />
      <main>{children}</main>
      <Footer social={social} />
      <FabInstagram profileUrl={social.find((s) => s.network === "instagram")?.url ?? socialDefaults.instagram} />
      <div className="grain" aria-hidden />
    </>
  );
}
