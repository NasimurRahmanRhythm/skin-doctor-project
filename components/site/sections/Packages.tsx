"use client";

import { useRef } from "react";
import { packages, packagesIntro } from "@/lib/site/content";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import Magnetic from "@/components/site/fx/Magnetic";
import { Arrow } from "@/components/site/Icons";

/**
 * Three packages as a stacked deck. Each card is sticky; as the next one
 * slides over it, the one underneath sinks back and dims.
 */
export default function Packages() {
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
    { scope: root }
  );

  return (
    <section className="packages" id="packages" ref={root}>
      <div className="wrap">
        <div className="sec-head center">
          <span className="kicker">{packagesIntro.kicker}</span>
          <SplitReveal as="h2" className="display">
            {packagesIntro.title}
          </SplitReveal>
          <Reveal>
            <p className="sec-lede">{packagesIntro.body}</p>
          </Reveal>
        </div>

        <div className="pkg-stack">
          {packages.map((p, i) => (
            <article key={p.name} className={`pkg-card tone-${i}`} style={{ top: `calc(11vh + ${i * 22}px)` }}>
              <div className="pkg-inner">
                <div className="pkg-media" data-cursor="Book">
                  <video src={p.video} poster={p.poster} autoPlay muted loop playsInline preload="metadata" />
                </div>
                <div className="pkg-body">
                  <div className="pkg-top">
                    <span className="pkg-tier">{p.tier}</span>
                    <span className="pkg-num">0{i + 1} / 0{packages.length}</span>
                  </div>
                  <h3 className="pkg-name">{p.name}</h3>
                  <p className="pkg-desc">{p.body}</p>
                  <div className="pkg-foot">
                    <div className="pkg-price">
                      {p.price} <span>{p.unit}</span>
                    </div>
                    <Magnetic>
                      <a href="#cta" className="btn btn-round" aria-label={`Book ${p.name}`}>
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
      </div>
    </section>
  );
}
