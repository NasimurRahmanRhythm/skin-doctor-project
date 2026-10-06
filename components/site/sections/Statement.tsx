"use client";

import { useRef } from "react";
import { hero } from "@/lib/site/content";
import type { SiteLink } from "@/lib/site/data";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import { Sprig } from "@/components/site/Icons";

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
          <span className="kicker">DermaSoul — by Dr. Nusrat Liza</span>
        </div>
        <p className="stmt-text">
          {words.map((w, i) => (
            <span key={i} className={`stmt-word ${w === "unhurried," || w === "personal" ? "is-accent" : ""}`}>
              {w}{" "}
            </span>
          ))}
        </p>
        <span className="roam-anchor stmt-roam" data-roam data-roam-scale="0.9" />
      </div>

      {press.length > 0 && (
        <div className="press">
          <span className="press-label">As seen in</span>
          <div className="marquee">
            <div className="marquee-track">
              {[0, 1].map((dup) => (
                <div className="marquee-group" key={dup} aria-hidden={dup === 1}>
                  {/* Repeated so even one or two titles fill the band. */}
                  {Array.from({ length: Math.max(2, Math.ceil(8 / press.length)) }, () => press)
                    .flat()
                    .map((p, i) => (
                      <span key={i} className="press-name">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          // Only the first copy of each title is reachable by Tab.
                          tabIndex={dup === 0 && i < press.length ? undefined : -1}
                          data-cursor="Read"
                          aria-label={p.logo ? p.title : undefined}
                        >
                          {p.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logo from storage
                            <img src={p.logo} alt="" className="press-logo" loading="lazy" />
                          ) : (
                            p.title
                          )}
                        </a>
                        <i>✦</i>
                      </span>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
