"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/site/gsap";
import { onIntroDone } from "@/lib/site/intro";

const RING = "DERMASOUL • MEDICAL AESTHETICS • BY DR. NUSRAT LIZA • ";

/**
 * The roaming seal (after luciaclinic.com's circular-text badge).
 *
 * It lives in a fixed layer but never sits still: every section marks a spot
 * with `data-roam`, and whichever section owns the middle of the viewport is
 * the one the badge drifts toward. It chases that spot's live position with a
 * lerp, so it trails the content as you scroll and glides across the screen
 * when the next section takes over. The ring spins at an idle pace and winds
 * up with scroll velocity; the DS mark in the middle stays upright.
 *
 * Ring and mark are sibling layers moved together. The ring inverts against
 * whatever is behind it (mix-blend-mode), which only works on an element with
 * no transformed ancestor; the gold mark must not invert, so it sits on its
 * own dark disc in the second layer.
 *
 * `data-roam-scale` on an anchor resizes the badge for that section. A tall
 * section can hold several anchors by wrapping each in `data-roam-zone`; the
 * zone, not the whole section, then decides when that anchor takes over.
 */
export default function RoamingBadge() {
  const root = useRef<HTMLAnchorElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = root.current;
    const haloEl = halo.current;
    const ringEl = ring.current;
    if (!el || !haloEl || !ringEl) return;
    const layers = [haloEl, el];
    const reduced = prefersReducedMotion();

    const anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-roam]"));
    let active: HTMLElement | null = anchors[0] ?? null;

    const triggers = anchors.map((a) =>
      ScrollTrigger.create({
        trigger: a.closest("[data-roam-zone]") ?? a.closest("section, footer") ?? a,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => {
          if (self.isActive) active = a;
        },
      })
    );

    const setX = gsap.quickSetter(layers, "x", "px");
    const setY = gsap.quickSetter(layers, "y", "px");
    const setS = gsap.quickSetter(layers, "scale");
    const setR = gsap.quickSetter(ringEl, "rotation", "deg");

    let x = window.innerWidth * 0.8;
    let y = window.innerHeight * 0.8;
    let s = 1;
    let rot = 0;
    let spin = 0;
    let lastScroll = window.scrollY;

    const tick = (_t: number, delta: number) => {
      const dt = Math.min(delta, 50) / 16.67;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = el.offsetWidth;
      const margin = size * 0.5 + 12;

      // Single-column layouts have no empty margins to roam into, so on narrow
      // screens the seal rests in the bottom-left corner and only spins.
      const compact = vw < 900;
      if (compact || active) {
        let tx = margin - 4;
        let ty = vh - margin + 4;
        let ts = 1;
        if (!compact && active) {
          const r = active.getBoundingClientRect();
          tx = gsap.utils.clamp(margin, vw - margin, r.left + r.width / 2);
          // Top keeps clear of the header, bottom of the Instagram button.
          ty = gsap.utils.clamp(margin + 60, vh - margin - 84, r.top + r.height / 2);
          ts = parseFloat(active.dataset.roamScale ?? "1");
        }
        const ease = reduced ? 1 : 1 - Math.pow(1 - 0.075, dt);
        x += (tx - x) * ease;
        y += (ty - y) * ease;
        s += (ts - s) * ease;
      }

      const sy = window.scrollY;
      const velocity = sy - lastScroll;
      lastScroll = sy;
      if (!reduced) {
        spin += (velocity * 0.35 - spin) * 0.08;
        rot += (0.18 + spin) * dt;
      }

      setX(x - size / 2);
      setY(y - size / 2);
      setS(s);
      setR(rot);
    };

    gsap.ticker.add(tick);
    const off = onIntroDone(() => {
      gsap.fromTo(
        layers,
        { opacity: 0, filter: "blur(10px)" },
        { opacity: 1, filter: "blur(0px)", duration: 1.4, delay: 0.9, ease: "power2.out" }
      );
    });

    return () => {
      off();
      gsap.ticker.remove(tick);
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <>
      <div ref={halo} className="roam roam-halo" aria-hidden>
        <svg ref={ring} className="roam-ring" viewBox="0 0 200 200">
          <defs>
            <path id="roam-circle" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
          </defs>
          <text>
            <textPath href="#roam-circle" textLength={500} lengthAdjust="spacing">
              {RING}
            </textPath>
          </text>
        </svg>
      </div>
      <a
        ref={root}
        href="/inquiry"
        className="roam roam-core"
        aria-label="DermaSoul Aesthetics — book a consultation"
        data-cursor="Book"
      >
        <span className="roam-disc">
          <Image src="/brand/mark-256.png" alt="" width={256} height={256} />
        </span>
      </a>
    </>
  );
}
