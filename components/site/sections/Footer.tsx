"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { brand, footer } from "@/lib/site/content";
import { Instagram } from "@/components/site/Icons";

/** "Soul" takes the italic gold, echoing the script in the logo. */
const WORD = ["Derma", "Soul"];

export default function Footer() {
  return (
    <footer className="footer dark">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Image
              src="/brand/logo.png"
              alt={`${brand.name} ${brand.byline}`}
              width={933}
              height={866}
              className="foot-logo"
            />
            <p>{footer.blurb}</p>
          </div>
          <div>
            <h4>Visit</h4>
            {brand.address.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          <div>
            <h4>Hours</h4>
            {brand.hours.map((h) => (
              <p key={h}>{h}</p>
            ))}
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`mailto:${brand.email}`} className="roll">
              <span data-text={brand.email}>{brand.email}</span>
            </a>
            <a href={`tel:${brand.phone.replace(/\s/g, "")}`} className="roll">
              <span data-text={brand.phone}>{brand.phone}</span>
            </a>
            <a href="#portal" className="roll">
              <span data-text="Patient Portal">Patient Portal</span>
            </a>
          </div>
        </div>
      </div>

      <div className="foot-giant" aria-hidden>
        {WORD.flatMap((part, w) => part.split("").map((ch) => ({ ch, soul: w === 1 }))).map(({ ch, soul }, i) => (
          <motion.span
            key={i}
            className={soul ? "soul" : ""}
            initial={{ y: "100%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true, margin: "0px 0px -5% 0px" }}
            transition={{ duration: 1.2, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            {ch}
          </motion.span>
        ))}
      </div>

      <div className="wrap foot-bottom">
        <span>{footer.legal}</span>
        <span className="foot-links">
          {footer.links.map((l) => (
            <a key={l} href="#top">
              {l}
            </a>
          ))}
          {/* The console lives in the same app; staff used to reach it from the old home page. */}
          <a href="/super-admin">Staff sign in</a>
        </span>
      </div>
    </footer>
  );
}

export function FabInstagram() {
  return (
    <motion.a
      href={brand.instagram}
      target="_blank"
      rel="noreferrer"
      className="fab-ig"
      aria-label="Message us on Instagram"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 3.4, type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
    >
      <Instagram width={24} />
    </motion.a>
  );
}
