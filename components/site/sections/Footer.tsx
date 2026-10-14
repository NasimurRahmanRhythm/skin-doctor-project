"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { brand, footer, instagramChatUrl, whatsappUrl } from "@/lib/site/content";
import type { SiteSocialLink, SocialNetwork } from "@/lib/site/data";
import {
  Facebook,
  Instagram,
  InstagramDirect,
  LinkedIn,
  TikTok,
  WhatsApp,
  XLogo,
  YouTube,
} from "@/components/site/Icons";

const NETWORK_ICON: Record<SocialNetwork, typeof Instagram> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: TikTok,
  x: XLogo,
  linkedin: LinkedIn,
  youtube: YouTube,
};

/** `social`: the profiles the owner set under Social media; each shows as an icon. */
export default function Footer({ social = [] }: { social?: SiteSocialLink[] }) {
  return (
    <footer className="footer dark">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Image
              src="/brand/logo-v2.png"
              alt={`${brand.name} ${brand.byline}`}
              width={1200}
              height={1073}
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
            <a href={brand.mapUrl} target="_blank" rel="noopener noreferrer" className="foot-visit">
              {brand.addressLines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </a>
          </div>
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
        </div>
      </div>

      {/* The logo's own lettering, so the "S" of Soul is the logo's script S. */}
      <div className="foot-giant" aria-hidden>
        <motion.div
          initial={{ y: "100%" }}
          whileInView={{ y: "0%" }}
          viewport={{ once: true, margin: "0px 0px -5% 0px" }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image src="/brand/wordmark-name.png" alt="" width={900} height={199} sizes="96vw" />
        </motion.div>
      </div>

      <div className="wrap foot-bottom">
        <span>{footer.legal}</span>
      </div>
    </footer>
  );
}

/**
 * The floating buttons, bottom right on every page of the website: WhatsApp
 * (a chat with the clinic's first number) above Instagram, which opens a
 * Direct message to the clinic's profile (`profileUrl`) and shows the Direct
 * icon under the Instagram one so it reads as "message us".
 */
export function FabInstagram({ profileUrl }: { profileUrl: string }) {
  const href = instagramChatUrl(profileUrl) ?? profileUrl;
  const pop = (delay: number) => ({
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: { delay, type: "spring" as const, stiffness: 260, damping: 18 },
    whileHover: { scale: 1.08 },
  });
  return (
    <div className="fab-stack">
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fab fab-wa"
        aria-label="Message us on WhatsApp"
        title="Message us on WhatsApp"
        {...pop(3.3)}
      >
        <WhatsApp width={26} />
      </motion.a>
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="fab fab-ig"
        aria-label="Message us on Instagram"
        title="Message us on Instagram"
        {...pop(3.4)}
      >
        <Instagram width={22} />
        <InstagramDirect width={16} />
      </motion.a>
    </div>
  );
}
