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
// Hidden for now — see the note above <Team /> below.
// import Packages from "@/components/site/sections/Packages";
import Results from "@/components/site/sections/Results";
// import Team from "@/components/site/sections/Team";
import Certifications from "@/components/site/sections/Certifications";
import Reviews from "@/components/site/sections/Reviews";
import Shop from "@/components/site/sections/Shop";
import Social from "@/components/site/sections/Social";
import Faq from "@/components/site/sections/Faq";
import Cta from "@/components/site/sections/Cta";
import Footer, { FabInstagram } from "@/components/site/sections/Footer";
import {
  // getDoctors,
  getInstagram,
  getLinks,
  // getPackages,
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
 * Section order follows athenaderma.com: film hero → brand stamp → team →
 * location → concerns → philosophy → popular treatments → journal. The
 * sections that Athena has no slot for (packages, results, shop) sit where
 * their neighbours make sense of them. Anything the owner has not filled in
 * yet hides itself.
 */
export default async function Home() {
  const [
    treatments,
    // packages,
    results,
    // doctors,
    press,
    certifications,
    reviews,
    products,
    instagram,
    social,
  ] = await Promise.all([
    getTreatments(6),
    // getPackages(3),
    getResults(3),
    // getDoctors(4),
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
      <Header />
      <main>
        <Hero />
        <Statement press={press} />
        {/*
         * Our Team and Packages are hidden for now. To bring them back,
         * uncomment them here together with their imports and their entries
         * in the Promise.all above, and point their nav links in
         * lib/site/content.ts back at "/#team" and "/#packages".
         */}
        {/* <Team doctors={doctors} /> */}
        <Visit />
        <Treatments items={treatments} />
        <About />
        <FeatureVideo />
        {/* <Packages items={packages} /> */}
        <Results items={results} />
        <Certifications items={certifications} />
        <Reviews data={reviews} />
        <Shop items={products} />
        <Social data={instagram} />
        <Faq />
        <Cta />
      </main>
      <Footer social={social} />
      <RoamingBadge />
      <FabInstagram url={instagram?.url ?? null} />
      <div className="grain" aria-hidden />
    </>
  );
}
