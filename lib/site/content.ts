import { CLINIC_ADDRESS, CLINIC_PHONE } from "@/lib/clinic";

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
  name: "DermaSoul Aesthetics",
  short: "DermaSoul",
  tagline: "Medical Aesthetics",
  byline: "by Dr. Nusrat Liza",
  // Not given yet; still the template's placeholder.
  email: "hello@dermasoul.demo",
  phone: CLINIC_PHONE,
  /** One line, as printed on the prescription. */
  addressLine: CLINIC_ADDRESS,
  /** The same address split for display: area, then city. */
  address: ["Banani", "Dhaka"],
  hours: ["Open every day", "11:30 am – 8:00 pm"],
};

/** The hours on one line, for places with room for only one. */
export const hoursLine = brand.hours.join(" · ");

/**
 * Links work from every page, not only the landing page: "/#packages" from
 * /treatments goes back home and scrolls there.
 */
export const nav = [
  { label: "Treatments", href: "/#treatments" },
  { label: "Packages", href: "/#packages" },
  { label: "Results", href: "/#results" },
  { label: "Reviews", href: "/#reviews" },
  { label: "About", href: "/#about" },
];

export const hero = {
  eyebrow: "A quiet approach to skin & body care",
  title: ["Care that meets", "your skin"],
  accent: "where it is.",
  lede:
    "DermaSoul Aesthetics is a boutique dermatology studio blending clinical treatments with an unhurried, personal experience — for skin that changes with you.",
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
  title: "About DermaSoul",
  paragraphs: [
    "We created DermaSoul with a simple belief: beautiful skin begins with healthy skin, and great care begins with understanding you.",
    "At DermaSoul, we bring together clinical dermatology and aesthetic medicine in a calm, personalized environment where every skin concern is approached with care, knowledge, and attention to detail.",
    "From everyday skin conditions and personalized skincare plans to advanced aesthetic treatments, our focus is never simply on following trends. Every treatment is chosen according to your skin, your needs, and your individual goals.",
    "We believe aesthetic medicine should enhance—not change—who you are. Our approach is centred on natural-looking results, evidence-based care, safety, and long-term skin health.",
  ],
  closing: [
    "Because your skin is more than what you see in the mirror.",
    "It is part of how you feel about yourself.",
  ],
  signature: "— Dr. Nusrat Liza & the DermaSoul Team",
  brandLine: {
    name: "DermaSoul Medical Aesthetics",
    tagline: "We elevate your skin & confidence.",
  },
};

export const teamIntro = {
  kicker: "Meet the team",
  title: "Our Doctors",
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

export const faqs = [
  {
    q: "Do I need a consultation before booking a treatment?",
    a: "Yes — every new patient starts with a consultation so we can understand your skin and goals before recommending anything.",
  },
  {
    q: "Are results permanent?",
    a: "It depends on the treatment. We'll walk through expected longevity and any maintenance during your consultation.",
  },
  {
    q: "Can I purchase products without booking a treatment?",
    a: "Yes, the Skincare Shop is open to anyone — you don't need to be an active patient. Ask at the clinic.",
  },
  {
    q: "What's your cancellation policy?",
    a: "We ask for at least 24 hours' notice so we can offer the slot to another patient.",
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
  links: ["Privacy", "Terms", "Accessibility"],
};
