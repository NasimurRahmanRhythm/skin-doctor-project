"use client";

import { useRef } from "react";
import Image from "next/image";
import { brand } from "@/lib/site/content";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { ArrowUpRight } from "@/components/site/Icons";

/** Athena's location band: where to find us, beside a window into the studio. */
export default function Visit() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        ".visit-media",
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.6,
          ease: "expo.inOut",
          scrollTrigger: { trigger: ".visit-media", start: "top 80%", once: true },
        }
      );
      gsap.fromTo(
        ".visit-media img",
        { scale: 1.3, yPercent: -8 },
        {
          scale: 1.05,
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: ".visit-media", start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    },
    { scope: root }
  );

  return (
    <section className="visit dark" ref={root}>
      <div className="wrap visit-grid">
        <div className="visit-copy">
          <span className="kicker">Visit the studio</span>
          <SplitReveal as="h2" className="display">
            {brand.address[0]}, <em>{brand.address[1]}</em>
            <br />
            {brand.address[2]}
          </SplitReveal>

          <Reveal className="visit-cols" delay={0.2}>
            <div>
              <h4>Hours</h4>
              {brand.hours.map((h) => (
                <p key={h}>{h}</p>
              ))}
            </div>
            <div>
              <h4>Contact</h4>
              <a href={`mailto:${brand.email}`}>{brand.email}</a>
              <a href={`tel:${brand.phone.replace(/\s/g, "")}`}>{brand.phone}</a>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <a href="#cta" className="btn btn-outline-light">
              <span>Book a Consultation</span>
              <ArrowUpRight width={18} />
            </a>
          </Reveal>
        </div>

        <div className="visit-media" data-cursor="Visit">
          <Image src="/media/mirror.jpg" alt="A client in a robe applying a calming cream at the studio mirror" fill sizes="(max-width: 900px) 100vw, 50vw" />
          <span className="roam-anchor visit-roam" data-roam data-roam-scale="1" />
        </div>
      </div>
    </section>
  );
}
