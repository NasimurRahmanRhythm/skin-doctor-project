"use client";

import { useRef } from "react";
import Image from "next/image";
import { brand, social } from "@/lib/site/content";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import { Instagram, ArrowUpRight } from "@/components/site/Icons";

/** Instagram strip: tiles drift at different speeds as the section passes. */
export default function Social() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray<HTMLElement>(".social-tile").forEach((tile, i) => {
        gsap.fromTo(
          tile,
          { yPercent: i % 2 ? 18 : -6 },
          {
            yPercent: i % 2 ? -18 : 6,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      });
    },
    { scope: root }
  );

  return (
    <section className="social" id="social" ref={root}>
      <div className="wrap social-head">
        <div>
          <span className="kicker">{social.kicker}</span>
          <a href={brand.instagram} target="_blank" rel="noreferrer" className="social-handle">
            {brand.handle}
          </a>
        </div>
        <a href={brand.instagram} target="_blank" rel="noreferrer" className="btn btn-outline">
          <span>View on Instagram</span>
          <ArrowUpRight width={18} />
        </a>
      </div>
      <div className="social-grid">
        {social.tiles.map((src, i) => (
          <a
            key={src}
            href={brand.instagram}
            target="_blank"
            rel="noreferrer"
            className="social-tile"
            data-cursor="Open"
            aria-label={`Instagram post ${i + 1}`}
          >
            <Image src={src} alt="" fill sizes="(max-width: 900px) 33vw, 17vw" />
            <span className="social-over">
              <Instagram width={26} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
