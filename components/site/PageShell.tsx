import type { ReactNode } from "react";
import SmoothScroll from "@/components/site/fx/SmoothScroll";
import Cursor from "@/components/site/fx/Cursor";
import IntroDone from "@/components/site/fx/IntroDone";
import Header from "@/components/site/sections/Header";
import Footer, { FabInstagram } from "@/components/site/sections/Footer";
import { getInstagram, getSocialLinks } from "@/lib/site/data";

/**
 * The frame around every inner page (/treatments, /packages, /products,
 * /inquiry): the same header and footer as the landing page, without its
 * preloader and hero.
 */
export default async function PageShell({ children }: { children: ReactNode }) {
  const [instagram, social] = await Promise.all([getInstagram(), getSocialLinks()]);
  return (
    <>
      <SmoothScroll />
      <IntroDone />
      <Cursor />
      <Header alwaysSolid />
      <main>{children}</main>
      <Footer social={social} />
      <FabInstagram url={instagram?.url ?? null} />
      <div className="grain" aria-hidden />
    </>
  );
}
