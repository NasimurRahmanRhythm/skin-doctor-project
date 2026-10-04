"use client";

import { useRef } from "react";
import { social } from "@/lib/site/content";
import type { SiteInstagram } from "@/lib/site/data";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import { Instagram, ArrowUpRight } from "@/components/site/Icons";

/**
 * Instagram strip: tiles drift at different speeds as the section passes.
 * Each tile is a post the owner added and opens that post; the heading and
 * button open the profile. No profile set, no section.
 */
export default function Social({ data }: { data: SiteInstagram | null }) {
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
    { scope: root, dependencies: [data?.posts.length ?? 0] }
  );

  if (!data) return null;

  return (
    <section className="social" id="social" ref={root}>
      <div className="wrap social-head">
        <div>
          <span className="kicker">{social.kicker}</span>
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="social-handle">
            {data.handle}
          </a>
        </div>
        <a href={data.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          <span>View on Instagram</span>
          <ArrowUpRight width={18} />
        </a>
      </div>
      {data.posts.length > 0 && (
        <div className="social-grid">
          {data.posts.map((p, i) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="social-tile"
              data-cursor="Open"
              aria-label={`Instagram post ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded, any host */}
              <img src={p.image} alt="" loading="lazy" />
              <span className="social-over">
                <Instagram width={26} />
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
