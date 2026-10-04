"use client";

import { useRef } from "react";
import Image from "next/image";
import { about } from "@/lib/site/content";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";

/** Athena's philosophy split: a tall photograph that unshutters, the story beside it. */
export default function About() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".about-media", start: "top 75%", once: true },
      });
      tl.fromTo(
        ".about-shutter",
        { scaleY: 1 },
        { scaleY: 0, duration: 1.5, stagger: 0.08, ease: "expo.inOut" }
      ).fromTo(".about-media img", { scale: 1.4 }, { scale: 1, duration: 2, ease: "expo.out" }, 0.3);

      gsap.to(".about-inset", {
        yPercent: -35,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
      });
    },
    { scope: root }
  );

  return (
    <section className="about" id="about" ref={root}>
      <div className="wrap about-grid">
        <div className="about-visual">
          <div className="about-media">
            <Image src="/media/facial.jpg" alt="A calming facial treatment in progress" fill sizes="(max-width: 900px) 100vw, 45vw" />
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="about-shutter" style={{ left: `${i * 25}%` }} />
            ))}
          </div>
          <div className="about-inset">
            <Image src="/media/serum.jpg" alt="" fill sizes="220px" />
          </div>
          <span className="roam-anchor about-roam" data-roam data-roam-scale="1.05" />
        </div>

        <div className="about-copy">
          <span className="kicker">{about.kicker}</span>
          <SplitReveal as="h2" className="display">
            About <em>DermaSoul</em>
          </SplitReveal>
          {about.paragraphs.map((p, i) => (
            <Reveal key={i} delay={0.1 + i * 0.1}>
              <p className={i === 0 ? "about-lead" : ""}>{p}</p>
            </Reveal>
          ))}
          <Reveal delay={0.1 + about.paragraphs.length * 0.1}>
            <p className="about-closing">
              {about.closing.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          </Reveal>
          <Reveal delay={0.2 + about.paragraphs.length * 0.1}>
            <div className="signature">{about.signature}</div>
          </Reveal>
          <Reveal delay={0.3 + about.paragraphs.length * 0.1}>
            <p className="about-brandline">
              <strong>{about.brandLine.name}</strong>
              <span>{about.brandLine.tagline}</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
