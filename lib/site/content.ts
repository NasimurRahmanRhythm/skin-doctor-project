/**
 * Every word on the landing page. The copy comes from lumen-leaf-website.html,
 * rebranded to DermaSoul Aesthetics (the name and logo the clinic console
 * already uses). Contact details are still the template's placeholders.
 * Components only lay this out — edit copy here, not in JSX.
 */

export const brand = {
  name: "DermaSoul Aesthetics",
  short: "DermaSoul",
  tagline: "Medical Aesthetics",
  byline: "by Dr. Nusrat Liza",
  handle: "@dermasoul.aesthetics",
  instagram: "https://instagram.com",
  email: "hello@dermasoul.demo",
  phone: "+880 0000 000000",
  address: ["142 Willow Street", "Suite 3B", "Dhaka, Bangladesh"],
  hours: ["Tue–Sat, 10am–6pm", "Closed Sun & Mon"],
};

export const nav = [
  { label: "Treatments", href: "#treatments" },
  { label: "Packages", href: "#packages" },
  { label: "Results", href: "#results" },
  { label: "About", href: "#about" },
  { label: "Reviews", href: "#reviews" },
];

export const hero = {
  eyebrow: "A quiet approach to skin & body care",
  title: ["Care that meets", "your skin"],
  accent: "where it is.",
  lede:
    "DermaSoul Aesthetics is a boutique dermatology studio blending clinical treatments with an unhurried, personal experience — for skin that changes with you.",
};

export const press = [
  "City & Skin Journal",
  "The Quiet Beauty Report",
  "Field Notes on Wellness",
  "Studio Weekly",
];

export const treatmentsIntro = {
  kicker: "What we offer",
  title: "Our Treatments",
  body: "Every treatment is built around your skin's own pace — no rush, no guesswork.",
};

export const treatments = [
  {
    title: "Custom Facials",
    body: "Hydrating, resurfacing, and calming facials tailored to your skin's current needs.",
    image: "/media/facial.jpg",
  },
  {
    title: "Injectables",
    body: "Subtle, precise work — softening lines while keeping your expression your own.",
    image: "/media/eye.jpg",
  },
  {
    title: "Laser Resurfacing",
    body: "Targeted treatment for texture, tone, and sun damage using gentle protocols.",
    image: "/media/led.jpg",
  },
  {
    title: "Body Contouring",
    body: "Non-invasive sculpting for stubborn areas, with realistic outcomes discussed upfront.",
    image: "/media/mirror.jpg",
  },
  {
    title: "Skin Health & Screening",
    body: "Routine checks and consultations for lasting skin health, not just appearance.",
    image: "/media/cleanse.jpg",
  },
  {
    title: "Hair & Scalp Care",
    body: "Treatment for hair thinning and scalp health, grounded in current research.",
    image: "/media/mask-a.jpg",
  },
];

export const packagesIntro = {
  kicker: "Curated combinations",
  title: "Packages",
  body: "Multi-session plans built around common goals, priced as a whole.",
};

export const packages = [
  {
    tier: "Starter",
    name: "SmartGlow",
    body: "A single-session reset — brightening facial plus a take-home care plan.",
    price: "$180",
    unit: "/ session",
    video: "/media/p51185.mp4",
    poster: "/media/p51185.jpg",
  },
  {
    tier: "Popular",
    name: "Skin Reset",
    body: "Four sessions over eight weeks, combining resurfacing and hydration therapy.",
    price: "$620",
    unit: "/ package",
    video: "/media/p51186.mp4",
    poster: "/media/p51186.jpg",
  },
  {
    tier: "Comprehensive",
    name: "Skin Reset Plus",
    body: "Our full protocol — resurfacing, injectables consult, and quarterly check-ins.",
    price: "$1,140",
    unit: "/ package",
    video: "/media/p51183.mp4",
    poster: "/media/p51183.jpg",
  },
];

export const resultsIntro = {
  kicker: "See for yourself",
  title: "Transformative Results",
  body: "Drag each divider to compare before and after. Placeholder visuals — real client photography (with consent) replaces these.",
  note: "Individual results vary. Photos used with patient consent in a live deployment.",
};

export const results = [
  { caption: "Body Contouring", image: "/media/mirror.jpg" },
  { caption: "Injectable Filler", image: "/media/serum.jpg" },
  { caption: "Vein Treatment", image: "/media/facial.jpg" },
];

export const about = {
  kicker: "Our story",
  title: "About DermaSoul",
  paragraphs: [
    "We started DermaSoul on a simple idea: skin care works best when it isn't rushed. Our studio pairs board-certified expertise with an unhurried, one-on-one approach — every visit begins with a real conversation, not a menu.",
    "Our practitioners specialize across medical and cosmetic dermatology, from routine skin health screenings to advanced resurfacing and injectable work, always grounded in what's right for your skin rather than what's trending.",
  ],
  signature: "— Dr. Nusrat Liza & the DermaSoul team",
};

export const teamIntro = {
  kicker: "Meet the team",
  title: "Doctors & Practitioners",
  body: "Board-certified expertise, delivered by people who take the time to know your skin.",
};

export const team = [
  // Founder per the logo. Her credentials aren't on file, so none are shown.
  { initials: "NL", name: "Dr. Nusrat Liza", role: "Founder, Dermatologist", cred: "" },
  { initials: "RK", name: "Dr. Rafi Karim", role: "Cosmetic Physician", cred: "MBBS, DDV" },
  { initials: "NA", name: "Nadia Alam", role: "Lead Aesthetician", cred: "Licensed Esthetician" },
  { initials: "TR", name: "Tamanna Rahim", role: "Patient Care Lead", cred: "RN, BSN" },
];

export const certsIntro = { kicker: "Trust & affiliations", title: "Certifications & Societies" };

export const certs = [
  "Board Certified Dermatology",
  "American Academy of Dermatology",
  "Society for Dermatologic Surgery",
  "Healthgrades Verified",
  "Top Rated Local Studio",
];

export const reviewsSummary = { score: 4.8, count: 94 };

export const reviews = [
  {
    quote: "Loved my treatment — the whole visit felt calm and unrushed. Exactly what I needed.",
    name: "Brittany F.",
    when: "1 year ago",
  },
  {
    quote:
      "The procedure was exactly as described. Professional, thorough, and I never felt rushed through questions.",
    name: "Jody W.",
    when: "1 year ago",
  },
  {
    quote:
      "Booked through the patient portal and the whole process, from scheduling to check-in, was seamless.",
    name: "Maya R.",
    when: "8 months ago",
  },
];

export const galleryIntro = {
  kicker: "More stories",
  title: "Before & After Gallery",
  body: "A closer look at real outcomes across our most-requested treatments.",
  note: "Placeholder gallery — real, consented patient photography replaces these tiles.",
};

export const gallery = [
  "/media/facial.jpg",
  "/media/eye.jpg",
  "/media/mask.jpg",
  "/media/cleanse.jpg",
  "/media/serum.jpg",
  "/media/mirror.jpg",
];

export const shopIntro = {
  kicker: "Take it home",
  title: "Skincare Shop",
  body: "Practitioner-selected products to support your treatment plan between visits.",
};

export const products = [
  { name: "Barrier Repair Cream", price: "$42", image: "/media/eye.jpg" },
  { name: "Vitamin C Serum", price: "$58", image: "/media/serum.jpg" },
  { name: "Mineral SPF 45", price: "$36", image: "/media/cleanse.jpg" },
  { name: "Gentle Renewal Cleanser", price: "$28", image: "/media/mask.jpg" },
];

export const social = {
  kicker: "Follow along",
  tiles: [
    "/media/mask.jpg",
    "/media/led.jpg",
    "/media/eye.jpg",
    "/media/mirror.jpg",
    "/media/cleanse.jpg",
    "/media/facial.jpg",
  ],
};

export const faqs = [
  {
    q: "Do I need a consultation before booking a treatment?",
    a: "Yes — every new patient starts with a consultation so we can understand your skin and goals before recommending anything.",
  },
  {
    q: "How do I access the patient portal?",
    a: "Existing patients can sign in through the Patient Portal section below using the email on file. New patients can create an account there too.",
  },
  {
    q: "Are results permanent?",
    a: "It depends on the treatment. We'll walk through expected longevity and any maintenance during your consultation.",
  },
  {
    q: "Can I purchase products without booking a treatment?",
    a: "Yes, the Skincare Shop is open to anyone — you don't need to be an active patient to order.",
  },
  {
    q: "What's your cancellation policy?",
    a: "We ask for at least 24 hours' notice so we can offer the slot to another patient.",
  },
];

export const portal = {
  kicker: "Patient Portal",
  title: "Your care, on your time.",
  body: "Sign in to manage appointments, review treatment history, and message your care team directly.",
  perks: [
    "View and reschedule upcoming visits",
    "See past treatment notes and photos",
    "Message your practitioner securely",
    "Pay invoices online",
  ],
  note: "This is a demo template — no account data is created or stored.",
};

export const cta = {
  title: "Ready to talk about your skin?",
  body: "Consultations are unhurried, honest, and never sales-driven.",
};

export const footer = {
  blurb: "A boutique skin & body studio focused on unhurried, personal care.",
  legal: "© 2026 DermaSoul Medical Aesthetics. Demo template — placeholder content.",
  links: ["Privacy", "Terms", "Accessibility"],
};
