import { CLINIC_ADDRESS, CLINIC_PHONE, CLINIC_PHONES } from "@/lib/clinic";

/**
 * The landing page's fixed copy. The copy comes from lumen-leaf-website.html,
 * rebranded to DermaSoul Aesthetics (the name and logo the clinic console
 * already uses). Components only lay this out — edit copy here, not in JSX.
 *
 * Lists the owner manages — treatments, packages, results, the shop, press
 * and certification links, Instagram, doctors, reviews — come from the
 * database instead (lib/site/data.ts), and are edited from the dashboard.
 */

export const brand = {
  name: "DermaSoul Medical Aesthetics",
  short: "DermaSoul",
  tagline: "Medical Aesthetics",
  byline: "by Dr. Nusrat Liza",
  email: "dermasoulmedicalae@gmail.com",
  phone: CLINIC_PHONE,
  /** All the clinic's numbers, main one first. */
  phones: CLINIC_PHONES,
  /** One line, as printed on the prescription. */
  addressLine: CLINIC_ADDRESS,
  /** The full address over a few lines, for the footer and the location band. */
  addressLines: ["Level-9, BTI Armitage", "House 77, Road 12", "Banani, Dhaka 1213"],
  /** Just the area, then the city: the headline, and where one short line fits. */
  address: ["Banani", "Dhaka"],
  hours: ["Open every day", "11:30 am – 8:00 pm"],
  /** The clinic's Google Maps share link; "Get directions" opens it. */
  mapUrl: "https://maps.app.goo.gl/5K9tGMrZsKLmS5499",
  /**
   * Where the embedded map drops its pin: the clinic's exact coordinates. A
   * share link cannot be embedded, and an address search can land on the
   * wrong building, so the pin goes by these.
   */
  mapQuery: "23.792443629506643,90.40841004952195",
};

/**
 * The clinic's own profiles. The footer icons and the floating Instagram
 * button use these unless the owner saves other links under Social media in
 * the dashboard, which take priority.
 */
export const socialDefaults = {
  instagram: "https://www.instagram.com/dermasoulmedical/",
  youtube: "https://www.youtube.com/@DermaSoulMedical",
  tiktok: "https://www.tiktok.com/@dermasoulmedical",
};

/**
 * Instagram's link that opens a chat with a profile: ig.me/m/<username>.
 * In the Instagram app it opens straight into the conversation; in a browser
 * it opens Instagram's messages (after signing in). Null if the profile link
 * has no username in it.
 */
export function instagramChatUrl(profileUrl: string): string | null {
  const name = profileUrl
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0];
  return name ? `https://ig.me/m/${encodeURIComponent(name)}` : null;
}

/** The Google Maps embed for brand.mapQuery; needs no API key. */
export const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(brand.mapQuery)}&z=16&output=embed`;

/** The hours on one line, for places with room for only one. */
export const hoursLine = brand.hours.join(" · ");

/**
 * Links work from every page, not only the landing page: "/#packages" from
 * /treatments goes back home and scrolls there.
 */
/** A nav link that only shows while its section has something in it. */
export type OptionalSection = "team" | "packages";

export const nav: { label: string; href: string; optional?: OptionalSection }[] = [
  { label: "Treatments", href: "/#treatments" },
  // Shown only while there is something in them; see Header's `hide`.
  { label: "Our Team", href: "/#team", optional: "team" },
  { label: "Packages", href: "/#packages", optional: "packages" },
  { label: "Results", href: "/#results" },
  { label: "Reviews", href: "/#reviews" },
  { label: "About", href: "/#about" },
];

export const hero = {
  eyebrow: "A quiet approach to skin & body care",
  title: ["Care that meets", "your skin"],
  accent: "where it is.",
  lede:
    "DermaSoul Medical Aesthetics is a boutique dermatology studio blending clinical treatments with an unhurried, personal experience — for skin that changes with you.",
};

export const treatmentsIntro = {
  kicker: "What we offer",
  title: "Our Treatments",
  body: "Every treatment is built around your skin's own pace — no rush, no guesswork.",
};

export const packagesIntro = {
  kicker: "Curated combinations",
  title: "Packages",
  body: "Multi-session plans built around common goals.",
};

export const resultsIntro = {
  kicker: "See for yourself",
  title: "Transformative Results",
  body: "Drag each divider to compare before and after.",
  note: "Individual results vary. Photos shared with patient consent.",
};

export const about = {
  kicker: "Our story",
  title: "About DermaSoul Medical Aesthetics",
  paragraphs: [
    "We created DermaSoul Medical Aesthetics with a simple belief: beautiful skin begins with healthy skin, and great care begins with understanding you.",
    "At DermaSoul Medical Aesthetics, we bring together clinical dermatology and aesthetic medicine in a calm, personalized environment where every skin concern is approached with care, knowledge, and attention to detail.",
    "From everyday skin conditions and personalized skincare plans to advanced aesthetic treatments, our focus is never simply on following trends. Every treatment is chosen according to your skin, your needs, and your individual goals.",
    "We believe aesthetic medicine should enhance—not change—who you are. Our approach is centred on natural-looking results, evidence-based care, safety, and long-term skin health.",
  ],
  closing: [
    "Because your skin is more than what you see in the mirror.",
    "It is part of how you feel about yourself.",
  ],
  signature: "— Dr. Nusrat Liza & the DermaSoul Medical Aesthetics Team",
  brandLine: {
    name: "DermaSoul Medical Aesthetics",
    tagline: "We elevate your skin & confidence.",
  },
};

export const teamIntro = {
  kicker: "Meet the team",
  title: "Our Team",
  body: "Board-certified expertise, delivered by people who take the time to know your skin.",
};

export const certsIntro = { kicker: "Trust & affiliations", title: "Certifications & Societies" };

export const shopIntro = {
  kicker: "Take it home",
  title: "Skincare Shop",
  body: "Practitioner-selected products to support your treatment plan between visits.",
};

export const social = {
  kicker: "Follow along",
};

/** The landing page's FAQ, in groups; numbered 01, 02… straight through. */
export const faqGroups: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Getting Started",
    items: [
      {
        q: "Do I need a consultation before starting a treatment?",
        a: "Yes. A consultation helps us assess your skin and recommend the safest and most suitable treatment for you.",
      },
      {
        q: "How do I know which treatment is right for my skin?",
        a: "The right treatment depends on your skin type, concerns, medical history, and goals. Our doctor will assess your skin and recommend a personalised treatment plan.",
      },
      {
        q: "Can I combine different treatments?",
        a: "Yes. Depending on your skin concerns and goals, treatments may be safely combined as part of a personalised plan.",
      },
      {
        q: "Do you provide personalised skincare plans?",
        a: "Yes. We create personalised skincare plans based on your skin type, concerns, and individual needs.",
      },
    ],
  },
  {
    title: "Our Care",
    items: [
      {
        q: "Do you treat medical skin conditions as well as aesthetic concerns?",
        a: "Yes. We provide care for a wide range of medical dermatological and aesthetic concerns.",
      },
      {
        q: "Do you treat men as well as women?",
        a: "Yes. DermaSoul Medical Aesthetics welcomes both men and women for dermatological and aesthetic care.",
      },
      {
        q: "Are treatments performed by qualified medical professionals?",
        a: "Yes. All treatments are performed under the supervision of qualified medical professionals, following appropriate safety and clinical standards.",
      },
    ],
  },
  {
    title: "Psychodermatology and Emotional Well-being",
    items: [
      {
        q: "What is psychodermatology?",
        a: "Psychodermatology focuses on the connection between skin health, emotional well-being, and mental health.",
      },
      {
        q: "How can stress and emotional well-being affect the skin?",
        a: "Stress can influence skin health and may worsen conditions such as acne, eczema, psoriasis, and hair loss.",
      },
      {
        q: "Can DermaSoul Medical Aesthetics help if my skin condition is affecting my confidence or emotional well-being?",
        a: "Yes. We take a holistic approach, addressing both your skin concerns and how they may affect your confidence and well-being.",
      },
      {
        q: "Do you provide supportive counselling or psychological guidance for skin-related concerns?",
        a: "Yes. Supportive guidance is available for emotional and psychological concerns related to skin conditions and appearance.",
      },
    ],
  },
  {
    title: "Contact",
    items: [
      {
        q: "How can I contact DermaSoul Medical Aesthetics for more information?",
        a: "You can contact us by phone, WhatsApp, or through our social media pages.",
      },
    ],
  },
];

export const cta = {
  title: "Ready to talk about your skin?",
  body: "Consultations are unhurried, honest, and never sales-driven.",
};

export const inquiry = {
  kicker: "Book a Consultation",
  title: "Tell us about your skin",
  body: "Leave your name, email and a few words about what you'd like help with. We'll reply by email to find a time that suits you.",
  thanks: "Thanks — we've received your inquiry and will get back to you by email.",
};

export const footer = {
  blurb: "A boutique skin & body studio focused on unhurried, personal care.",
  legal: "© 2026 DermaSoul Medical Aesthetics. Demo template — placeholder content.",
};
