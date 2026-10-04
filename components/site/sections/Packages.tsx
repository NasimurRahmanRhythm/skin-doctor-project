"use client";

import { useRef } from "react";
import { packagesIntro } from "@/lib/site/content";
import type { SitePackage } from "@/lib/site/data";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import Magnetic from "@/components/site/fx/Magnetic";
import { Arrow } from "@/components/site/Icons";

const bookHref = (p: SitePackage) => `/inquiry?about=${encodeURIComponent(p.title)}`;

function Head({ as = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <div className="sec-head center">
      <span className="kicker">{packagesIntro.kicker}</span>
      <SplitReveal as={as} className="display">
        {packagesIntro.title}
      </SplitReveal>
      <Reveal>
        <p className="sec-lede">{packagesIntro.body}</p>
      </Reveal>
    </div>
  );
}

/**
 * The first packages as a stacked deck. Each card is sticky; as the next one
 * slides over it, the one underneath sinks back and dims. The rest are one
 * click away on /packages.
 */
export default function Packages({ items }: { items: SitePackage[] }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const cards = gsap.utils.toArray<HTMLElement>(".pkg-card");
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card.querySelector(".pkg-inner"), {
          scale: 0.92,
          filter: "brightness(0.82) saturate(0.8)",
          ease: "none",
          scrollTrigger: { trigger: next, start: "top bottom", end: "top 15%", scrub: true },
        });
      });
    },
    { scope: root, dependencies: [items.length] }
  );

  if (items.length === 0) return null;

  return (
    <section className="packages" id="packages" ref={root}>
      <div className="wrap">
        <Head />

        <div className="pkg-stack">
          {items.map((p, i) => (
            <article key={p.id} className={`pkg-card tone-${i % 3}`} style={{ top: `calc(11vh + ${i * 22}px)` }}>
              <div className="pkg-inner">
                <div className="pkg-media" data-cursor="Book">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded, any host
                    <img src={p.image} alt="" loading="lazy" />
                  )}
                </div>
                <div className="pkg-body">
                  <div className="pkg-top">
                    <span className="pkg-num">
                      {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="pkg-name">{p.title}</h3>
                  <p className="pkg-desc">{p.description}</p>
                  <div className="pkg-foot">
                    {p.price ? <div className="pkg-price">{p.price}</div> : <span />}
                    <Magnetic>
                      <a href={bookHref(p)} className="btn btn-round" aria-label={`Book ${p.title}`}>
                        <Arrow width={22} />
                      </a>
                    </Magnetic>
                  </div>
                </div>
              </div>
              {i === 1 && <span className="roam-anchor pkg-roam" data-roam data-roam-scale="0.9" />}
            </article>
          ))}
        </div>

        <div className="see-more">
          <a href="/packages" className="btn btn-outline">
            <span>See all packages</span>
            <Arrow width={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/** /packages: every package as a card grid. */
export function PackageCatalog({ items }: { items: SitePackage[] }) {
  return (
    <section className="packages page-section" id="packages">
      <div className="wrap">
        <Head as="h1" />
        {items.length ? (
          <div className="card-grid">
            {items.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 6) * 0.06} className="pkg-tile">
                <div className="pkg-tile-media">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded, any host
                    <img src={p.image} alt="" loading="lazy" />
                  )}
                </div>
                <div className="pkg-tile-body">
                  <h2 className="pkg-tile-title">{p.title}</h2>
                  <p className="pkg-tile-desc">{p.description}</p>
                  <div className="pkg-tile-foot">
                    {p.price ? <span className="pkg-tile-price">{p.price}</span> : <span />}
                    <a href={bookHref(p)} className="btn btn-dark">
                      <span>Book</span>
                      <Arrow width={16} />
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="page-empty">Packages will be listed here soon.</p>
        )}
      </div>
    </section>
  );
}
