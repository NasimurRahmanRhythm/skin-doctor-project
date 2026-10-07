import type { SiteLink } from "@/lib/site/data";

/**
 * A labelled band with a slow marquee of names or logos: "As seen in" under
 * the brand statement, and "Certifications & Societies". An entry with a logo
 * scrolls past as the logo (its title read out for it); one without, as its
 * title. An entry with a link opens it in a new tab.
 */
export default function LinkMarquee({
  label,
  items,
  className = "",
}: {
  label: string;
  items: SiteLink[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`press ${className}`}>
      <span className="press-label">{label}</span>
      <div className="marquee">
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div className="marquee-group" key={dup} aria-hidden={dup === 1}>
              {/* Repeated so even one or two entries fill the band. */}
              {Array.from({ length: Math.max(2, Math.ceil(8 / items.length)) }, () => items)
                .flat()
                .map((p, i) => {
                  const content = p.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logo from storage
                    <img src={p.logo} alt="" className="press-logo" loading="lazy" />
                  ) : (
                    p.title
                  );
                  return (
                    <span key={i} className="press-name">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          // Only the first copy of each entry is reachable by Tab.
                          tabIndex={dup === 0 && i < items.length ? undefined : -1}
                          data-cursor="Open"
                          aria-label={p.logo ? (p.title ?? undefined) : undefined}
                        >
                          {content}
                        </a>
                      ) : (
                        <span role={p.logo ? "img" : undefined} aria-label={p.logo ? (p.title ?? undefined) : undefined}>
                          {content}
                        </span>
                      )}
                      <i>✦</i>
                    </span>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
