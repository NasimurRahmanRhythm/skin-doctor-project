import type { SiteLink } from "@/lib/site/data";
import LinkMarquee from "@/components/site/LinkMarquee";

/**
 * "As seen in": articles the owner adds in the dashboard, as a slow marquee
 * of logos (or titles), the same band as Certifications. Nothing added, no
 * section.
 */
export default function Press({ items }: { items: SiteLink[] }) {
  if (items.length === 0) return null;
  return (
    <section className="certs press-section" id="press" aria-label="As seen in">
      <LinkMarquee label="As seen in" items={items} className="certs-band" />
    </section>
  );
}
