"use client";

import { useRef } from "react";
import { brand, mapEmbedUrl } from "@/lib/site/content";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { ArrowUpRight } from "@/components/site/Icons";

/** Athena's location band: where to find us, beside a map with the clinic pinned. */
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
          </SplitReveal>
          <Reveal className="visit-address" delay={0.1}>
            {brand.addressLines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </Reveal>

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
              {brand.phones.map((phone) => (
                <a key={phone} href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                  {phone}
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.3} className="visit-actions">
            <a href="/inquiry" className="btn btn-outline-light">
              <span>Book a Consultation</span>
              <ArrowUpRight width={18} />
            </a>
            <a href={brand.mapUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light">
              <span>Get Directions</span>
              <ArrowUpRight width={18} />
            </a>
          </Reveal>
        </div>

        <div className="visit-media visit-map">
          <iframe
            src={mapEmbedUrl}
            title={`Map: ${brand.name}, ${brand.addressLine}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <span className="roam-anchor visit-roam" data-roam data-roam-scale="1" />
        </div>
      </div>
    </section>
  );
}
