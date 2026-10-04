/**
 * The website's owner-managed lists, described once.
 *
 * The dashboard builds each list's form and rows from these definitions, and
 * the server action validates against the same ones, so a field cannot be
 * shown in one place and forgotten in the other. Plain data only: this module
 * is imported by both the client form and the server action.
 */

export type FieldType = "text" | "textarea" | "url" | "image";

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
    hint: "The landing page shows the first 6 with the first one or two sentences of each; “See more” opens the full list, and each treatment opens in a window with its whole description.",
    noun: "treatment",
    titleField: "title",
    subField: "description",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 120, placeholder: "e.g. Acne & Acne Scar Treatment" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        required: true,
        max: 5000,
        placeholder: "What the treatment is, who it is for, how many sessions…",
        hint: "The first 1–2 sentences are shown on the landing page.",
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
    tab: "Instagram",
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
    hint: "Articles that mention the clinic. The titles scroll under the brand statement and each opens its article in a new tab.",
    noun: "article",
    titleField: "title",
    subField: "url",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 120, placeholder: "e.g. The Daily Star — Skin care in Dhaka" },
      { name: "url", label: "Link", type: "url", required: true, placeholder: "https://…", pattern: HTTP_URL, patternMessage: "Use a full link starting with https://" },
    ],
  },
  {
    key: "certifications",
    table: "site_links",
    fixed: { kind: "certification" },
    tab: "Certifications",
    title: "Certifications & Societies",
    hint: "Each name scrolls in the Certifications & Societies band and opens its link in a new tab.",
    noun: "entry",
    titleField: "title",
    subField: "url",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 120, placeholder: "e.g. Bangladesh Society of Dermatologists" },
      { name: "url", label: "Link", type: "url", required: true, placeholder: "https://…", pattern: HTTP_URL, patternMessage: "Use a full link starting with https://" },
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
