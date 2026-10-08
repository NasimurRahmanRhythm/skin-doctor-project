"use client";

import { useRef } from "react";
import { hero } from "@/lib/site/content";
import type { SiteLink } from "@/lib/site/data";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import { Sprig } from "@/components/site/Icons";
import LinkMarquee from "@/components/site/LinkMarquee";

/**
 * The brand stamp: the studio's one-line promise, read word by word as the
 * scroll passes over it, then the press row as a slow marquee: articles the
 * owner adds in the dashboard, each shown as its logo (or else its title) and
 * opening in a new tab. No articles, no row.
 */
export default function Statement({ press }: { press: SiteLink[] }) {
  const root = useRef<HTMLElement>(null);
  const words = hero.lede.split(" ");

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        ".stmt-word",
        { opacity: 0.12, filter: "blur(4px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          stagger: 0.05,
          ease: "none",
          scrollTrigger: { trigger: ".stmt-text", start: "top 78%", end: "bottom 45%", scrub: 0.6 },
        }
      );
      gsap.fromTo(
        ".stmt-sprig path",
        { strokeDasharray: 400, strokeDashoffset: 400 },
        {
          strokeDashoffset: 0,
          duration: 2.2,
          stagger: 0.25,
          ease: "power2.inOut",
          scrollTrigger: { trigger: ".stmt-sprig", start: "top 85%", once: true },
        }
      );
    },
    { scope: root }
  );

  return (
    <section className="statement" id="statement" ref={root}>
      <div className="wrap stmt-grid">
        <div className="stmt-side">
          <Sprig className="stmt-sprig" />
          <span className="kicker stmt-kicker">DermaSoul — by Dr. Nusrat Liza</span>
        </div>
        <p className="stmt-text">
          {words.map((w, i) => (
            <span key={i} className="stmt-word">
              {w}{" "}
            </span>
          ))}
        </p>
        <span className="roam-anchor stmt-roam" data-roam data-roam-scale="0.9" />
      </div>

      <LinkMarquee label="As seen in" items={press} />
    </section>
  );
}
