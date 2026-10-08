"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { brand, hoursLine, nav } from "@/lib/site/content";
import { getLenis } from "@/lib/site/scroll";
import { onIntroDone } from "@/lib/site/intro";

const EASE = [0.76, 0, 0.24, 1] as const;

/**
 * The logo on the left, the section links on the right. On the inner pages
 * (/treatments, /packages…) there is no dark hero behind it, so `alwaysSolid`
 * starts it on the cream bar it otherwise only takes on after scrolling.
 */
export default function Header({ alwaysSolid = false }: { alwaysSolid?: boolean }) {
  const { scrollY, scrollYProgress } = useScroll();
  const [solid, setSolid] = useState(alwaysSolid);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => onIntroDone(() => setReady(true)), []);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(alwaysSolid || y > 60);
    setHidden(y > 400 && y > prev && !open);
  });

  useEffect(() => {
    const lenis = getLenis();
    if (open) lenis?.stop();
    else lenis?.start();
    document.documentElement.classList.toggle("menu-open", open);
  }, [open]);

  return (
    <>
      <motion.div className="progress" style={{ scaleX: scrollYProgress }} />
      <motion.header
        className={`site-header ${solid ? "is-solid" : ""} ${open ? "is-open" : ""}`}
        initial={{ y: -100, opacity: 0 }}
        animate={ready ? { y: hidden ? -100 : 0, opacity: 1 } : undefined}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <Link href="/" className="wordmark" aria-label={`${brand.name} — home`}>
          <Image src="/brand/mark-256-v2.png" alt="" width={40} height={40} className="wordmark-mark" preload />
          {/* The logo's own lettering, so the name always matches the logo. */}
          <Image src="/brand/wordmark.png" alt="" width={900} height={246} className="wordmark-word" preload />
        </Link>

        <div className="hdr-actions">
          <nav className="hdr-links" aria-label="Primary">
            {nav.map((l) => (
              <a key={l.href} href={l.href} className="roll">
                <span data-text={l.label}>{l.label}</span>
              </a>
            ))}
          </nav>
          <button
            className="menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu"
            initial={{ clipPath: "circle(0% at 100% 0%)" }}
            animate={{ clipPath: "circle(150% at 100% 0%)" }}
            exit={{ clipPath: "circle(0% at 100% 0%)" }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <nav aria-label="Mobile">
              {nav.map((l, i) => (
                <div key={l.href} className="mm-line">
                  <motion.a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "110%" }}
                    transition={{ duration: 0.8, delay: 0.25 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <small>0{i + 1}</small>
                    {l.label}
                  </motion.a>
                </div>
              ))}
            </nav>
            <motion.div
              className="mm-foot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.7 } }}
              exit={{ opacity: 0 }}
            >
              <p>{brand.addressLine}</p>
              <p>{hoursLine}</p>
              <a href={`mailto:${brand.email}`}>{brand.email}</a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
