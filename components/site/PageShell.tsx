import type { ReactNode } from "react";
import SmoothScroll from "@/components/site/fx/SmoothScroll";
import Cursor from "@/components/site/fx/Cursor";
import IntroDone from "@/components/site/fx/IntroDone";
import Header from "@/components/site/sections/Header";
import Footer, { FabInstagram } from "@/components/site/sections/Footer";
import { getDoctors, getPackages, getSocialLinks } from "@/lib/site/data";
import { socialDefaults } from "@/lib/site/content";

/**
 * The frame around every inner page (/treatments, /packages, /products,
 * /inquiry): the same header and footer as the landing page, without its
 * hero.
 */
export default async function PageShell({ children }: { children: ReactNode }) {
  // One row each is enough to know whether Our Team and Packages have anything.
  const [social, doctors, packages] = await Promise.all([getSocialLinks(), getDoctors(1), getPackages(1)]);
  return (
    <>
      <SmoothScroll />
      <IntroDone />
      <Cursor />
      <Header
        alwaysSolid
        hide={[
          ...(doctors.length ? [] : (["team"] as const)),
          ...(packages.length ? [] : (["packages"] as const)),
        ]}
      />
      <main>{children}</main>
      <Footer social={social} />
      <FabInstagram profileUrl={social.find((s) => s.network === "instagram")?.url ?? socialDefaults.instagram} />
      <div className="grain" aria-hidden />
    </>
  );
}
