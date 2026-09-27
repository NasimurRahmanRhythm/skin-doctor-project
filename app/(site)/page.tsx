import { BagProvider } from "@/components/site/Bag";
import SmoothScroll from "@/components/site/fx/SmoothScroll";
import Preloader from "@/components/site/fx/Preloader";
import Cursor from "@/components/site/fx/Cursor";
import RoamingBadge from "@/components/site/fx/RoamingBadge";
import Header from "@/components/site/sections/Header";
import Hero from "@/components/site/sections/Hero";
import Statement from "@/components/site/sections/Statement";
import Visit from "@/components/site/sections/Visit";
import Treatments from "@/components/site/sections/Treatments";
import About from "@/components/site/sections/About";
import FeatureVideo from "@/components/site/sections/FeatureVideo";
import Packages from "@/components/site/sections/Packages";
import Results from "@/components/site/sections/Results";
import Team from "@/components/site/sections/Team";
import Certifications from "@/components/site/sections/Certifications";
import Reviews from "@/components/site/sections/Reviews";
import Shop from "@/components/site/sections/Shop";
import Social from "@/components/site/sections/Social";
import Faq from "@/components/site/sections/Faq";
import Portal from "@/components/site/sections/Portal";
import Cta from "@/components/site/sections/Cta";
import Footer, { FabInstagram } from "@/components/site/sections/Footer";

/*
 * Section order follows athenaderma.com: film hero → brand stamp → location →
 * concerns → philosophy → doctors → popular treatments → journal. The
 * sections that Athena has no slot for (packages, results, shop, portal)
 * sit where their neighbours make sense of them.
 */
export default function Home() {
  return (
    <BagProvider>
      {/* SmoothScroll must mount before Preloader so the preloader can pause it. */}
      <SmoothScroll />
      <Preloader />
      <Cursor />
      <Header />
      <main>
        <Hero />
        <Statement />
        <Visit />
        <Treatments />
        <About />
        <FeatureVideo />
        <Packages />
        <Results />
        <Team />
        <Certifications />
        <Reviews />
        <Shop />
        <Social />
        <Faq />
        <Portal />
        <Cta />
      </main>
      <Footer />
      <RoamingBadge />
      <FabInstagram />
      <div className="grain" aria-hidden />
    </BagProvider>
  );
}
