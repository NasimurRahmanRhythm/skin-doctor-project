"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { treatments, treatmentsIntro } from "@/lib/site/content";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Arrow } from "@/components/site/Icons";

/**
 * Athena's concern grid, recast as an editorial index: a long list of rows,
 * with a photograph that floats after the cursor and swaps as you move
 * between them. Touch screens get the image inline in each row instead.
 */
export default function Treatments() {
  const [active, setActive] = useState<number | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 140, damping: 20, mass: 0.6 });
  const y = useSpring(my, { stiffness: 140, damping: 20, mass: 0.6 });
  const rotate = useSpring(0, { stiffness: 120, damping: 14 });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = e.clientX - r.left;
    // Tilt toward the direction of travel: the gap between cursor and the lagging image.
    rotate.set(Math.max(-10, Math.min(10, (nx - x.get()) / 18)));
    mx.set(nx);
    my.set(e.clientY - r.top);
  };

  return (
    <section className="treatments" id="treatments">
      <div className="wrap">
        <div className="sec-head split" data-roam-zone>
          <div>
            <span className="kicker">{treatmentsIntro.kicker}</span>
            <SplitReveal as="h2" className="display">
              Our <em>Treatments</em>
            </SplitReveal>
          </div>
          <Reveal className="sec-lede">
            <p>{treatmentsIntro.body}</p>
            <span className="roam-anchor treat-roam" data-roam data-roam-scale="0.85" />
          </Reveal>
        </div>

        <div className="treat-list" data-roam-zone onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
          {treatments.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.05} y={30}>
              <a
                href="#cta"
                className={`treat-row ${active !== null && active !== i ? "is-dim" : ""}`}
                onPointerEnter={() => setActive(i)}
                data-cursor="Book"
              >
                <span className="treat-idx">0{i + 1}</span>
                <span className="treat-thumb">
                  <Image src={t.image} alt="" fill sizes="96px" />
                </span>
                <h3 className="treat-title">{t.title}</h3>
                <p className="treat-body">{t.body}</p>
                <span className="treat-arrow">
                  <Arrow width={20} />
                </span>
              </a>
            </Reveal>
          ))}

          <span className="roam-anchor treat-list-roam" data-roam data-roam-scale="0.8" />
          <motion.div className="treat-float" style={{ x, y, rotate }} aria-hidden>
            <AnimatePresence>
              {active !== null && (
                <motion.div
                  key={active}
                  className="treat-float-img"
                  initial={{ clipPath: "inset(50% 50% 50% 50% round 12px)", scale: 1.2 }}
                  animate={{ clipPath: "inset(0% 0% 0% 0% round 12px)", scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.35 } }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image src={treatments[active].image} alt="" fill sizes="340px" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
