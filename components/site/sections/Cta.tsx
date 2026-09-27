"use client";

import { useRef } from "react";
import { brand, cta } from "@/lib/site/content";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Magnetic from "@/components/site/fx/Magnetic";
import { Arrow } from "@/components/site/Icons";

export default function Cta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        ".cta-media",
        { clipPath: "inset(12% 8% 12% 8% round 32px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "top 20%", scrub: true },
        }
      );
      gsap.fromTo(
        ".cta-media video",
        { yPercent: -12 },
        {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    },
    { scope: root }
  );

  const mail = `mailto:${brand.email}?subject=${encodeURIComponent("Consultation request")}`;

  return (
    <section className="cta" id="cta" ref={root}>
      <div className="cta-media">
        <video src="/media/ritual.mp4" poster="/media/ritual-poster.jpg" autoPlay muted loop playsInline preload="metadata" />
        <div className="cta-shade" />
      </div>
      <div className="cta-content">
        <SplitReveal as="h2" className="cta-title">
          Ready to talk about <em>your skin?</em>
        </SplitReveal>
        <p>{cta.body}</p>
        <Magnetic strength={0.4}>
          <a href={mail} className="cta-orb" data-cursor="Book">
            <span>Book a Consultation</span>
            <Arrow width={26} />
          </a>
        </Magnetic>
      </div>
      <span className="roam-anchor cta-roam" data-roam data-roam-scale="0.8" />
    </section>
  );
}
