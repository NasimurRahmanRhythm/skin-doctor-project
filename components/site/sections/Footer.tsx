"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { brand, footer, instagramChatUrl } from "@/lib/site/content";
import type { SiteSocialLink, SocialNetwork } from "@/lib/site/data";
import { Facebook, Instagram, LinkedIn, XLogo, YouTube } from "@/components/site/Icons";

const NETWORK_ICON: Record<SocialNetwork, typeof Instagram> = {
  facebook: Facebook,
  instagram: Instagram,
  x: XLogo,
  linkedin: LinkedIn,
  youtube: YouTube,
};

/** All gold, as in the header; "Soul" takes the italic, echoing the script in the logo. */
const WORD = ["Derma", "Soul"];

/** `social`: the profiles the owner set under Social media; each shows as an icon. */
export default function Footer({ social = [] }: { social?: SiteSocialLink[] }) {
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
            {social.length > 0 && (
              <div className="foot-social">
                {social.map((s) => {
                  const Icon = NETWORK_ICON[s.network];
                  return (
                    <a
                      key={s.network}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      title={s.label}
                    >
                      <Icon width={18} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <h4>Visit</h4>
            {brand.addressLines.map((l) => (
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
      </div>
    </footer>
  );
}

/**
 * The floating Instagram button, bottom right on every page of the website.
 * It opens a chat with the clinic's Instagram profile (`profileUrl`).
 */
export function FabInstagram({ profileUrl }: { profileUrl: string }) {
  const href = instagramChatUrl(profileUrl) ?? profileUrl;
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fab-ig"
      aria-label="Message us on Instagram"
      title="Message us on Instagram"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 3.4, type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
    >
      <Instagram width={24} />
    </motion.a>
  );
}
