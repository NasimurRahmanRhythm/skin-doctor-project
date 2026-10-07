import type { SiteLink } from "@/lib/site/data";
import LinkMarquee from "@/components/site/LinkMarquee";

/**
 * Certifications & Societies, in the same band as "As seen in": a label on
 * the left and a slow marquee of logos (or names) the owner added in the
 * dashboard, each opening its link in a new tab. Nothing added, no band.
 */
export default function Certifications({ items }: { items: SiteLink[] }) {
  if (items.length === 0) return null;
  return (
    <section className="certs" id="certifications" aria-label="Certifications and Societies">
      <LinkMarquee label="Certifications & Societies" items={items} className="certs-band" />
    </section>
  );
}
