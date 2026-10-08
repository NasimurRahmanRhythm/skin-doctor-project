"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { brand } from "@/lib/site/content";
import { prefersReducedMotion } from "@/lib/site/gsap";
import { markIntroDone } from "@/lib/site/intro";
import { getLenis } from "@/lib/site/scroll";

const EASE = [0.76, 0, 0.24, 1] as const;

/** Counter + the logo rising out of a mask, then the curtain lifts off the hero. */
export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const progress = useMotionValue(0);
  const label = useTransform(progress, (v) => String(Math.round(v)).padStart(3, "0"));

  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.classList.add("is-loading");
    getLenis()?.stop();

    const reduced = prefersReducedMotion();
    const run = animate(progress, 100, { duration: reduced ? 0.3 : 2.4, ease: [0.65, 0, 0.35, 1] });
    let t: ReturnType<typeof setTimeout>;
    run.then(() => {
      t = setTimeout(() => {
        setVisible(false);
        document.documentElement.classList.remove("is-loading");
        getLenis()?.start();
        markIntroDone();
      }, 200);
    });
    return () => {
      run.stop();
      clearTimeout(t);
    };
  }, [progress]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="preloader"
          aria-hidden
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          <motion.div
            className="preloader-inner"
            exit={{ y: -120, opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <motion.div
              className="preloader-logo"
              initial={{ clipPath: "inset(100% 0% 0% 0%)", y: 40, scale: 1.08 }}
              animate={{ clipPath: "inset(0% 0% 0% 0%)", y: 0, scale: 1 }}
              transition={{ duration: 1.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image src="/brand/logo-v2.png" alt="" width={1200} height={1073} preload />
              <span className="preloader-shine" />
            </motion.div>
          </motion.div>
          <div className="preloader-foot">
            <span>
              {brand.tagline} · {brand.byline}
            </span>
            <motion.span className="preloader-count">{label}</motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
