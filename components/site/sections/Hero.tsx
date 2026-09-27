"use client";

import { useRef } from "react";
import { brand, hero } from "@/lib/site/content";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import { onIntroDone } from "@/lib/site/intro";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Magnetic from "@/components/site/fx/Magnetic";
import { Arrow } from "@/components/site/Icons";

/**
 * Athena-style full-bleed video hero. The film opens out of a rounded window
 * as the preloader curtain lifts, then drifts and dims as you scroll away.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const frame = ".hero-frame";

      if (!reduced) {
        gsap.set(frame, { clipPath: "inset(22% 28% 22% 28% round 400px)" });
        gsap.set(".hero-video", { scale: 1.35 });
        gsap.set(".hero-fade", { opacity: 0, y: 24 });
      }

      const off = onIntroDone(() => {
        if (reduced) return;
        const tl = gsap.timeline({ defaults: { ease: "expo.inOut" } });
        tl.to(frame, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.8 }, 0.1)
          .to(".hero-video", { scale: 1.08, duration: 2.4, ease: "expo.out" }, 0.1)
          .to(".hero-fade", { opacity: 1, y: 0, duration: 1.2, stagger: 0.08, ease: "expo.out" }, 1.1);
      });

      if (!reduced) {
        gsap.to(".hero-video", {
          yPercent: 18,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(".hero-content", {
          yPercent: -30,
          opacity: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "70% top", scrub: true },
        });
        gsap.to(".hero-frame", {
          filter: "brightness(0.45)",
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      }
      return off;
    },
    { scope: root }
  );

  return (
    <section className="hero" id="top" ref={root}>
      <div className="hero-frame">
        <video
          className="hero-video"
          src="/media/hero.mp4"
          poster="/media/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="hero-shade" />
      </div>

      <div className="hero-content">
        <div className="hero-eyebrow hero-fade">
          <span className="stem" />
          <span>{hero.eyebrow}</span>
        </div>

        <SplitReveal as="h1" className="hero-title" on="intro" delay={0.9} stagger={0.12}>
          {hero.title[0]}
          <br />
          {hero.title[1]} <em>{hero.accent}</em>
        </SplitReveal>

        <div className="hero-actions hero-fade">
          <Magnetic>
            <a href="#cta" className="btn btn-light">
              <span>Book a Consultation</span>
              <Arrow width={18} />
            </a>
          </Magnetic>
          <a href="#treatments" className="btn-text">
            View Treatments
          </a>
        </div>
      </div>

      <div className="hero-foot hero-fade">
        <span>{brand.hours[0]}</span>
        <a href="#statement" className="scroll-cue" aria-label="Scroll to discover">
          <span className="scroll-cue-line" />
          Scroll
        </a>
        <span>{brand.address[2]}</span>
      </div>

      <span className="roam-anchor hero-roam" data-roam data-roam-scale="1.15" />
    </section>
  );
}
