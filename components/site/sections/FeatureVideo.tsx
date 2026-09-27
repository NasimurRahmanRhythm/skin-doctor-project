"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";

/**
 * A pinned beat between the story and the menu: the LED treatment film grows
 * from a pill-shaped window to the full screen while the line splits apart
 * around it.
 */
export default function FeatureVideo() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=160%",
          scrub: 0.8,
          pin: true,
        },
      });
      tl.fromTo(
        ".fv-frame",
        { clipPath: "inset(24% 30% 24% 30% round 999px)" },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 },
        0
      )
        .fromTo(".fv-frame video", { scale: 1.5 }, { scale: 1, ease: "power2.inOut", duration: 1 }, 0)
        .to(".fv-left", { xPercent: -60, opacity: 0, ease: "power2.in", duration: 0.6 }, 0)
        .to(".fv-right", { xPercent: 60, opacity: 0, ease: "power2.in", duration: 0.6 }, 0)
        .fromTo(".fv-caption", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 0.7);
    },
    { scope: root }
  );

  return (
    <section className="fv" ref={root} aria-label="Laser Resurfacing">
      <div className="fv-frame">
        <video src="/media/laser.mp4" poster="/media/laser-poster.jpg" autoPlay muted loop playsInline preload="metadata" />
        <div className="fv-shade" />
      </div>
      <div className="fv-lines" aria-hidden>
        <span className="fv-left">Skin care</span>
        <span className="fv-right">
          <em>unhurried.</em>
        </span>
      </div>
      <div className="fv-caption">
        <span className="kicker">Laser Resurfacing</span>
        <p>Targeted treatment for texture, tone, and sun damage using gentle protocols.</p>
      </div>
      <span className="roam-anchor fv-roam" data-roam data-roam-scale="1.2" />
    </section>
  );
}
