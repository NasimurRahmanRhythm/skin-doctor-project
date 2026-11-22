import { brand } from "@/lib/site/content";

/**
 * The Privacy Policy and Terms of Use, as plain text so the owner can read
 * and change them in one place. Each section is a heading and paragraphs; a
 * paragraph that is an array is a bulleted list.
 */
export type LegalSection = { heading: string; body: (string | string[])[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const UPDATED = "22 November 2026";
const contact = `${brand.email}, ${brand.phones.join(" or ")}, or at ${brand.addressLine}`;

export const privacyPolicy: LegalDoc = {
  title: "Privacy Policy",
  updated: UPDATED,
  intro: `This policy explains what information ${brand.name} ${brand.byline} ("we", "us") collects through this website, why we collect it, who we share it with, and the choices you have. It covers this website only; information you give us at the clinic is kept as part of your medical record.`,
  sections: [
    {
      heading: "What we collect",
      body: [
        "When you send us an inquiry or book a consultation, we receive what you type into the form:",
        ["Your name", "Your email address", "Your phone number, if you give it", "Your message"],
        "With every inquiry we also keep the IP address it was sent from, so we can stop automated spam, and the advert or link that brought you to the site (for example, which Facebook campaign), if there was one.",
        "When you browse the site, we count visits for our own statistics: the pages you open, the treatments you look at, whether you tap to call, WhatsApp or book, the type of device (phone or computer), the website that sent you, and a random visit number kept in your browser for that visit. This does not include your name or email.",
      ],
    },
    {
      heading: "Cookies and Meta (Facebook and Instagram)",
      body: [
        "This site uses the Meta Pixel and Meta's Conversions API. They tell Meta when someone visits a page, looks at a treatment, taps to contact us or sends an inquiry, so we can see how well our Facebook and Instagram adverts work and show them to people likely to find them useful.",
        "To do this, Meta places cookies in your browser and receives technical information such as your IP address and browser type. When you send an inquiry, we also send Meta your email address and phone number in a scrambled (hashed) form that Meta uses only to match the inquiry to a Facebook or Instagram account. We do not send Meta your message.",
        "Meta handles this information under its own Data Policy (facebook.com/privacy/policy). You can control the adverts you see in your Facebook or Instagram ad settings, and you can block or delete cookies in your browser settings; the site will still work.",
      ],
    },
    {
      heading: "How we use your information",
      body: [
        [
          "To reply to your inquiry and arrange your consultation",
          "To contact you about the treatment or package you asked about",
          "To understand which pages and adverts are useful, and improve them",
          "To protect the site from spam and abuse",
        ],
        "We do not sell your information, and we do not use it for anything unrelated to your care or your inquiry.",
      ],
    },
    {
      heading: "Who can see it",
      body: [
        "Only our own staff who need it to reply to you or look after you can see your inquiry. Our website and database are run by trusted service providers (Vercel and Supabase) who store it for us securely and may not use it for their own purposes. Meta receives the information described above. We may disclose information if the law requires it.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "We keep inquiries for as long as they are useful for following up with you, and for no more than two years unless you become a patient, in which case they form part of your record. Visit statistics are kept in summary form.",
      ],
    },
    {
      heading: "Your choices",
      body: [
        `You can ask us to show you, correct or delete the information you sent us through this website. Contact us at ${contact}, and we will reply within 30 days.`,
      ],
    },
    {
      heading: "Security",
      body: [
        "The site is served over a secure (HTTPS) connection, and inquiries are stored in a database that only signed-in clinic staff can read. No system is completely secure, but we take reasonable care to protect your information.",
      ],
    },
    {
      heading: "Children",
      body: [
        "This site is meant for adults. If you are under 18, please ask a parent or guardian to contact us for you.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "If we change this policy, we will update it on this page and change the date at the top.",
      ],
    },
    {
      heading: "Contact us",
      body: [`${brand.name} ${brand.byline}: ${contact}.`],
    },
  ],
};

export const termsOfUse: LegalDoc = {
  title: "Terms of Use",
  updated: UPDATED,
  intro: `These terms apply when you use this website of ${brand.name} ${brand.byline} ("we", "us"). By using the site, you agree to them.`,
  sections: [
    {
      heading: "Information, not medical advice",
      body: [
        "Everything on this site, including treatment descriptions and before-and-after photos, is general information. It is not a diagnosis or medical advice for you. Results differ from person to person, and no particular result is guaranteed. Whether a treatment suits you can only be decided by our doctor at a consultation.",
      ],
    },
    {
      heading: "Inquiries and bookings",
      body: [
        "Sending an inquiry does not confirm an appointment. We will contact you to agree on a time. Please give your real name and correct contact details, and do not use the form to send anything unlawful, offensive or automated.",
        "This site is not for emergencies. If you have a medical emergency, contact a hospital or emergency service immediately.",
      ],
    },
    {
      heading: "Prices, packages and products",
      body: [
        "Prices, packages, offers and products shown on the site may change without notice and are confirmed at the clinic. Treatment plans and their final cost are agreed with you after your consultation.",
      ],
    },
    {
      heading: "Content and photos",
      body: [
        "The text, photos, logos and design of this site belong to us or are used with permission. Before-and-after photos are shown with the consent of the people in them. Please do not copy or reuse them without our written permission.",
      ],
    },
    {
      heading: "Links to other sites",
      body: [
        "The site links to other services such as WhatsApp, Instagram, Facebook and Google Maps. Those services have their own terms and privacy policies, and we are not responsible for them.",
      ],
    },
    {
      heading: "Liability",
      body: [
        "We work to keep the site accurate and available, but we cannot promise it will always be error-free or online. To the extent the law allows, we are not responsible for any loss caused by relying on the site's general information instead of a consultation.",
      ],
    },
    {
      heading: "Privacy",
      body: ["How we handle your information is explained in our Privacy Policy."],
    },
    {
      heading: "Changes and governing law",
      body: [
        "We may update these terms from time to time; the date at the top shows the latest version. These terms are governed by the laws of Bangladesh.",
      ],
    },
    {
      heading: "Contact us",
      body: [`${brand.name} ${brand.byline}: ${contact}.`],
    },
  ],
};
