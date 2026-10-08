import SmoothScroll from "@/components/site/fx/SmoothScroll";
import Preloader from "@/components/site/fx/Preloader";
import Cursor from "@/components/site/fx/Cursor";
import RoamingBadge from "@/components/site/fx/RoamingBadge";
import Header from "@/components/site/sections/Header";
import Hero from "@/components/site/sections/Hero";
import Statement from "@/components/site/sections/Statement";
import Press from "@/components/site/sections/Press";
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
import Cta from "@/components/site/sections/Cta";
import Footer, { FabInstagram } from "@/components/site/sections/Footer";
import { socialDefaults } from "@/lib/site/content";
import {
  getDoctors,
  getInstagram,
  getLinks,
  getPackages,
  getProducts,
  getResults,
  getReviews,
  getSocialLinks,
  getTreatments,
} from "@/lib/site/data";

/**
 * Rebuilt at most hourly; every save in the dashboard also rebuilds it at
 * once (revalidatePath), so the hour only matters for Google's reviews.
 */
export const revalidate = 3600;

/*
 * Section order: film hero → brand stamp → (team) → location →
 * certifications → treatments → "As seen in" → philosophy → video →
 * results → reviews → shop → Instagram → FAQ → call to book. Anything the
 * owner has not filled in yet hides itself.
 */
export default async function Home() {
  const [
    treatments,
    packages,
    results,
    doctors,
    press,
    certifications,
    reviews,
    products,
    instagram,
    social,
  ] = await Promise.all([
    getTreatments(6),
    getPackages(3),
    getResults(3),
    getDoctors(4),
    getLinks("press"),
    getLinks("certification"),
    getReviews(),
    getProducts(4),
    getInstagram(),
    getSocialLinks(),
  ]);

  return (
    <>
      {/* SmoothScroll must mount before Preloader so the preloader can pause it. */}
      <SmoothScroll />
      <Preloader />
      <Cursor />
      <Header
        hide={[
          ...(doctors.length ? [] : (["team"] as const)),
          ...(packages.length ? [] : (["packages"] as const)),
        ]}
      />
      <main>
        <Hero />
        <Statement />
        {/* Our Team and Packages hide themselves, and their nav links, while empty. */}
        <Team doctors={doctors} />
        <Visit />
        <Certifications items={certifications} />
        <Treatments items={treatments} />
        <Press items={press} />
        <About />
        <FeatureVideo />
        <Packages items={packages} />
        <Results items={results} />
        <Reviews data={reviews} />
        <Shop items={products} />
        <Social data={instagram} />
        <Faq />
        <Cta />
      </main>
      <Footer social={social} />
      <RoamingBadge />
      <FabInstagram profileUrl={social.find((s) => s.network === "instagram")?.url ?? socialDefaults.instagram} />
      <div className="grain" aria-hidden />
    </>
  );
}
