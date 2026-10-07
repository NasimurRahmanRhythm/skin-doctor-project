/**
 * The website's owner-managed lists, described once.
 *
 * The dashboard builds each list's form and rows from these definitions, and
 * the server action validates against the same ones, so a field cannot be
 * shown in one place and forgotten in the other. Plain data only: this module
 * is imported by both the client form and the server action.
 */

/**
 * text/textarea/url/image are one column each. The rest are treatment-page
 * extras: "slug" is a web address made from another field when left blank,
 * "faq" is a list of question/answer pairs (a jsonb array), and "relations"
 * picks other rows of the same list (a uuid array).
 */
export type FieldType = "text" | "textarea" | "url" | "image" | "slug" | "faq" | "relations";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  placeholder?: string;
  hint?: string;
  /** For urls: what the link must look like, and what to say if it does not. */
  pattern?: string;
  patternMessage?: string;
  /** For slugs: the field the address is made from when left blank. */
  from?: string;
  /** Starts a new block in the form, under this heading. */
  group?: string;
  /** Suggestions offered while typing (text fields). */
  suggestions?: string[];
  /** For images: a logo, whose transparent background must survive. */
  logo?: boolean;
};

export type SectionKey =
  | "treatments"
  | "packages"
  | "results"
  | "products"
  | "instagram"
  | "press"
  | "certifications";

export type SiteTable =
  | "site_treatments"
  | "site_packages"
  | "site_results"
  | "site_products"
  | "site_instagram_posts"
  | "site_links";

export type SectionDef = {
  key: SectionKey;
  table: SiteTable;
  /** Columns every row of this list has, e.g. site_links.kind. */
  fixed?: Record<string, string>;
  /** Tab label in the dashboard. */
  tab: string;
  title: string;
  hint: string;
  noun: string;
  fields: FieldDef[];
  /** Which field names a row in the list, and which one sits under it. */
  titleField: string;
  subField?: string;
  /** At least one of these must be filled. */
  oneOf?: string[];
  /** Where it shows on the site, for the hint under the list. */
  note?: string;
};

const HTTP_URL = "^https?://.+";
const INSTAGRAM_URL = "^https://(www\\.)?instagram\\.com/.+";

export const SECTIONS: SectionDef[] = [
  {
    key: "treatments",
    table: "site_treatments",
    tab: "Treatments",
    title: "Treatments",
    hint: "Every field is optional; save a treatment half-written and finish it later. Each one gets its own page, laid out like athenaderma.com: the picture and name, the introduction, then What to expect, Results and recovery, Before and After as folding sections, the FAQ, a closing call to book, and Similar treatments. A part left empty is simply not shown. A treatment without a title stays off the website. The landing page shows the first 6.",
    noun: "treatment",
    titleField: "title",
    subField: "category",
    fields: [
      { name: "title", label: "Title", type: "text", max: 120, placeholder: "e.g. Microneedling", group: "Basics" },
      {
        name: "category",
        label: "Category",
        type: "text",
        max: 60,
        placeholder: "e.g. Aesthetics",
        hint: "Treatments are grouped under this on the Treatments page.",
        suggestions: ["Dermatology", "Aesthetics", "Hair"],
      },
      {
        name: "subtitle",
        label: "Line under the name",
        type: "text",
        max: 200,
        placeholder: "e.g. Profhilo, Volite, Restylane Vital and more",
      },
      {
        name: "slug",
        label: "Page address",
        type: "slug",
        from: "title",
        max: 120,
        placeholder: "e.g. microneedling",
        hint: "The end of the page's link: /treatments/microneedling. Leave empty to make it from the title.",
      },
      { name: "image_path", label: "Picture", type: "image", hint: "The top of the page, and its card under Similar treatments." },
      {
        name: "description",
        label: "Introduction",
        type: "textarea",
        max: 10000,
        placeholder: "What the treatment is, how it works, who it is for…",
        hint: "Leave a blank line between paragraphs. The first 1–2 sentences are shown on the landing page.",
        group: "Page sections",
      },
      {
        name: "what_to_expect",
        label: "What to expect",
        type: "textarea",
        max: 10000,
        placeholder: "How a session goes, how long it takes, how it feels…",
      },
      {
        name: "results_recovery",
        label: "Results and recovery",
        type: "textarea",
        max: 10000,
        placeholder: "When results show, how long they last, how many sessions…",
      },
      {
        name: "before_care",
        label: "Before the treatment",
        type: "textarea",
        max: 10000,
        placeholder: "e.g. Avoid sun exposure for two weeks before…",
      },
      {
        name: "after_care",
        label: "After the treatment",
        type: "textarea",
        max: 10000,
        placeholder: "e.g. Expect mild redness for 24–48 hours…",
      },
      { name: "faqs", label: "Questions and answers", type: "faq", max: 3000, group: "FAQ" },
      {
        name: "closing_title",
        label: "Closing heading",
        type: "text",
        max: 200,
        placeholder: "e.g. Reveal a new layer of confidence",
        group: "Closing",
      },
      {
        name: "closing_body",
        label: "Closing text",
        type: "textarea",
        max: 3000,
        placeholder: "A short paragraph inviting the visitor to book.",
      },
      {
        name: "related_ids",
        label: "Similar treatments",
        type: "relations",
        hint: "Shown as cards at the bottom of the page, in the order of the list below. Leave all unticked to show others from the same category.",
        group: "Similar treatments",
      },
    ],
  },
  {
    key: "packages",
    table: "site_packages",
    tab: "Packages",
    title: "Packages",
    hint: "The landing page shows the first 3; “See more” opens all of them. Leave the price empty to show none.",
    noun: "package",
    titleField: "title",
    subField: "price",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 120, placeholder: "e.g. Glow Reset" },
      { name: "description", label: "Description", type: "textarea", required: true, max: 3000 },
      { name: "image_path", label: "Image", type: "image", required: true },
      { name: "price", label: "Price", type: "text", max: 60, placeholder: "Leave empty to hide the price, e.g. ৳ 12,000" },
    ],
  },
  {
    key: "results",
    table: "site_results",
    tab: "Before & After",
    title: "Transformative Results",
    hint: "Each result is a before/after slider. The landing page shows the first 3; “See all results” opens every one. Use two photos taken from the same angle and crop so the slider lines up. Only upload photos the patient has agreed to share.",
    noun: "result",
    titleField: "title",
    subField: "description",
    fields: [
      { name: "before_image_path", label: "Before", type: "image", required: true },
      { name: "after_image_path", label: "After", type: "image", required: true },
      { name: "title", label: "Title", type: "text", required: true, max: 120, placeholder: "e.g. Acne Scar Treatment" },
      { name: "description", label: "Description", type: "textarea", max: 500, placeholder: "e.g. 3 sessions over 8 weeks" },
    ],
  },
  {
    key: "products",
    table: "site_products",
    tab: "Shop",
    title: "Shop",
    hint: "Every field is optional, but a product needs at least a title or an image. The landing page shows the first 4; “See more” opens all of them, and each opens in a window with its details.",
    noun: "product",
    titleField: "title",
    subField: "price",
    oneOf: ["title", "image_path"],
    fields: [
      { name: "title", label: "Title", type: "text", max: 120, placeholder: "e.g. Barrier Repair Cream" },
      { name: "description", label: "Description", type: "textarea", max: 1000 },
      { name: "price", label: "Price", type: "text", max: 60, placeholder: "e.g. ৳ 1,800" },
      { name: "image_path", label: "Image", type: "image" },
    ],
  },
  {
    key: "instagram",
    table: "site_instagram_posts",
    tab: "Social media",
    title: "Instagram posts",
    hint: "Each picture on the website opens its own post on Instagram. The grid looks best with 6.",
    noun: "post",
    titleField: "url",
    fields: [
      { name: "image_path", label: "Image", type: "image", required: true },
      {
        name: "url",
        label: "Post link",
        type: "url",
        required: true,
        placeholder: "https://www.instagram.com/p/…",
        pattern: INSTAGRAM_URL,
        patternMessage: "Use the post's instagram.com link.",
      },
    ],
  },
  {
    key: "press",
    table: "site_links",
    fixed: { kind: "press" },
    tab: "As seen in",
    title: "As seen in",
    hint: "Articles that mention the clinic. They scroll under the brand statement. Every field is optional: one with a logo scrolls past as the logo, without one as its title, and one with a link opens it in a new tab. An entry with neither a title nor a logo is not shown.",
    noun: "article",
    titleField: "title",
    subField: "url",
    fields: [
      { name: "title", label: "Title", type: "text", max: 120, placeholder: "e.g. The Daily Star — Skin care in Dhaka", hint: "Shown when there is no logo, and read out for the logo otherwise." },
      { name: "logo_path", label: "Logo", type: "image", logo: true, hint: "Optional. A PNG with a transparent background looks best." },
      { name: "url", label: "Link", type: "url", placeholder: "https://…", pattern: HTTP_URL, patternMessage: "Use a full link starting with https://", hint: "Opens in a new tab. Without one, the entry is shown but not clickable." },
    ],
  },
  {
    key: "certifications",
    table: "site_links",
    fixed: { kind: "certification" },
    tab: "Certifications",
    title: "Certifications & Societies",
    hint: "Each entry scrolls in the Certifications & Societies band. Every field is optional: one with a logo scrolls past as the logo, without one as its name, and one with a link opens it in a new tab. An entry with neither a title nor a logo is not shown.",
    noun: "entry",
    titleField: "title",
    subField: "url",
    fields: [
      { name: "title", label: "Title", type: "text", max: 120, placeholder: "e.g. Bangladesh Society of Dermatologists", hint: "Shown when there is no logo, and read out for the logo otherwise." },
      { name: "logo_path", label: "Logo", type: "image", logo: true, hint: "Optional. A PNG with a transparent background looks best." },
      { name: "url", label: "Link", type: "url", placeholder: "https://…", pattern: HTTP_URL, patternMessage: "Use a full link starting with https://", hint: "Opens in a new tab. Without one, the entry is shown but not clickable." },
    ],
  },
];

export function sectionByKey(key: string | null | undefined): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}

/** The storage folder a section's pictures go in. */
export function sectionFolder(def: SectionDef): string {
  return def.key;
}
