import { certsIntro } from "@/lib/site/content";
import type { SiteLink } from "@/lib/site/data";
import { certIcons } from "@/components/site/Icons";

/**
 * Two marquee rows running opposite ways; hovering pauses them. Each chip is
 * a society or certificate the owner added in the dashboard, shown as its
 * logo when it has one, and opens its link in a new tab. With only a few
 * entries one row is enough.
 */
export default function Certifications({ items }: { items: SiteLink[] }) {
  if (items.length === 0) return null;

  // Repeated so a short list still fills the width before the loop restarts.
  const filled = Array.from({ length: Math.max(1, Math.ceil(6 / items.length)) }, () => items).flat();

  const row = (reverse: boolean) => (
    <div className={`marquee cert-marquee ${reverse ? "is-reverse" : ""}`}>
      <div className="marquee-track">
        {[0, 1].map((dup) => (
          <div className="marquee-group" key={dup} aria-hidden={dup === 1 || reverse}>
            {filled.map((c, i) => {
              const Icon = certIcons[i % certIcons.length];
              const reachable = !reverse && dup === 0 && i < items.length;
              return (
                <a
                  key={i}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`cert-chip ${c.logo ? "has-logo" : ""}`}
                  tabIndex={reachable ? undefined : -1}
                  aria-label={c.logo ? c.title : undefined}
                  title={c.logo ? c.title : undefined}
                >
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logo from storage
                    <img src={c.logo} alt="" className="cert-logo" loading="lazy" />
                  ) : (
                    <>
                      <Icon width={20} height={20} />
                      {c.title}
                    </>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="certs" id="certifications" aria-labelledby="certs-title">
      <div className="wrap sec-head center">
        <span className="kicker">{certsIntro.kicker}</span>
        <h2 id="certs-title" className="display sm">
          Certifications <em>&amp;</em> Societies
        </h2>
      </div>
      {row(false)}
      {items.length >= 4 && row(true)}
    </section>
  );
}
