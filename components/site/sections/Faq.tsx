"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { faqGroups } from "@/lib/site/content";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="faq" id="faq">
      <div className="wrap faq-grid">
        <div className="faq-side">
          <span className="kicker">Good to know</span>
          <SplitReveal as="h2" className="display">
            FAQs
          </SplitReveal>
          <span className="roam-anchor faq-roam" data-roam data-roam-scale="0.9" />
        </div>

        <div className="faq-list">
          {faqGroups.map((g, gi) => {
            // Numbering runs on across the groups: 01 … 12.
            const start = faqGroups.slice(0, gi).reduce((n, x) => n + x.items.length, 0);
            return (
              <div key={g.title} className="faq-group">
                <h3 className="faq-group-title">{g.title}</h3>
                {g.items.map((f, j) => {
                  const i = start + j;
                  const isOpen = open === i;
                  return (
                    <Reveal key={f.q} delay={Math.min(j, 4) * 0.06} y={24} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                      <button
                        className="faq-q"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : i)}
                      >
                        <span className="faq-n">{String(i + 1).padStart(2, "0")}</span>
                        <span className="faq-text">{f.q}</span>
                        <span className="faq-plus" aria-hidden />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            className="faq-a"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <p>{f.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Reveal>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
