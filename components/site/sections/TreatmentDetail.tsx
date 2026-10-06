"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { SiteTreatment } from "@/lib/site/data";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Arrow, ArrowUpRight, Sprig } from "@/components/site/Icons";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The owner's text as paragraphs: every non-empty line is one. */
function Paragraphs({ text }: { text: string | null }) {
  return (text ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => <p key={i}>{l}</p>);
}

function bookHref(t: SiteTreatment) {
  return `/inquiry?about=${encodeURIComponent(t.title)}`;
}

function BookButton({ t, dark = true }: { t: SiteTreatment; dark?: boolean }) {
  return (
    <a href={bookHref(t)} className={dark ? "btn btn-dark" : "btn btn-outline-light"}>
      <span>Book a Consultation</span>
      <ArrowUpRight width={18} />
    </a>
  );
}

/**
 * Folding sections, one open at a time, in the FAQ's style. Athena uses the
 * same for "What to expect" / "Before" / "After" and for the FAQ itself.
 */
function Accordion({
  items,
  numbered = false,
}: {
  items: { title: string; body: string | null }[];
  numbered?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(numbered ? null : 0);
  return (
    <div className="faq-list">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <Reveal key={it.title + i} delay={Math.min(i, 6) * 0.05} y={24} className={`faq-item ${isOpen ? "is-open" : ""}`}>
            <button className="faq-q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
              <span className="faq-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="faq-text">{it.title}</span>
              <span className="faq-plus" aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  className="faq-a tdetail-prose"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <div className="tdetail-acc-body">
                    <Paragraphs text={it.body} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Reveal>
        );
      })}
    </div>
  );
}

/**
 * A treatment's own page, after athenaderma.com: hero (picture, name, the line
 * under it), the introduction, What to expect / Results and recovery / Before
 * / After as folding sections, the FAQ, a closing call to book, and Similar
 * treatments. Every part the owner left empty is left out.
 */
export default function TreatmentDetail({
  treatment: t,
  similar,
}: {
  treatment: SiteTreatment;
  similar: SiteTreatment[];
}) {
  const details = [
    { title: "What to expect", body: t.whatToExpect },
    { title: "Results and recovery", body: t.resultsRecovery },
    { title: "Before your treatment", body: t.beforeCare },
    { title: "After your treatment", body: t.afterCare },
  ].filter((d) => d.body?.trim());
  const hasClosing = !!(t.closingTitle?.trim() || t.closingBody?.trim());

  return (
    <article className="tdetail">
      {/* ---- hero */}
      <section className={`tdetail-hero page-section ${t.image ? "has-image" : ""}`}>
        <div className="wrap tdetail-hero-grid">
          <div className="tdetail-hero-copy">
            <nav className="tdetail-crumbs" aria-label="Breadcrumb">
              <Link href="/treatments">Treatments</Link>
              {t.category && (
                <>
                  <span aria-hidden>/</span>
                  <span>{t.category}</span>
                </>
              )}
            </nav>
            <SplitReveal as="h1" className="display">
              {t.title}
            </SplitReveal>
            {t.subtitle && (
              <Reveal delay={0.15}>
                <p className="tdetail-subtitle">{t.subtitle}</p>
              </Reveal>
            )}
            <Reveal delay={0.25}>
              <BookButton t={t} />
            </Reveal>
          </div>
          {t.image && (
            <Reveal className="tdetail-hero-media" delay={0.1}>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded picture from storage */}
              <img src={t.image} alt={t.title} />
            </Reveal>
          )}
        </div>
      </section>

      {/* ---- introduction */}
      {t.description?.trim() && (
        <section className="tdetail-intro">
          <div className="wrap tdetail-narrow">
            <Reveal className="tdetail-prose">
              <Paragraphs text={t.description} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- what to expect, results, before, after */}
      {details.length > 0 && (
        <section className="tdetail-section">
          <div className="wrap faq-grid">
            <div className="faq-side">
              <span className="kicker">The treatment</span>
              <SplitReveal as="h2" className="display">
                Step by <em>step</em>
              </SplitReveal>
            </div>
            <Accordion items={details} />
          </div>
        </section>
      )}

      {/* ---- FAQ */}
      {t.faqs.length > 0 && (
        <section className="tdetail-section tdetail-faq">
          <div className="wrap faq-grid">
            <div className="faq-side">
              <span className="kicker">Good to know</span>
              <SplitReveal as="h2" className="display">
                FAQ on <em>{t.title}</em>
              </SplitReveal>
            </div>
            <Accordion items={t.faqs.map((f) => ({ title: f.q, body: f.a }))} numbered />
          </div>
        </section>
      )}

      {/* ---- closing call to book */}
      {hasClosing && (
        <section className="tdetail-closing dark">
          <div className="wrap tdetail-narrow">
            {t.closingTitle && (
              <SplitReveal as="h2" className="display">
                {t.closingTitle}
              </SplitReveal>
            )}
            {t.closingBody && (
              <Reveal className="tdetail-prose" delay={0.1}>
                <Paragraphs text={t.closingBody} />
              </Reveal>
            )}
            <Reveal delay={0.2}>
              <BookButton t={t} dark={false} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- similar treatments */}
      <section className="tdetail-similar">
        <div className="wrap">
          {similar.length > 0 && (
            <>
              <div className="sec-head">
                <span className="kicker">Explore more</span>
                <SplitReveal as="h2" className="display">
                  Similar <em>Treatments</em>
                </SplitReveal>
              </div>
              <div className="tdetail-cards">
                {similar.map((s, i) => (
                  <Reveal key={s.id} delay={Math.min(i, 4) * 0.08} y={30}>
                    <a href={`/treatments/${s.href}`} className="tdetail-card" data-cursor="View">
                      <span className={`tdetail-card-media ${s.image ? "" : "is-empty"}`}>
                        {s.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded picture from storage
                          <img src={s.image} alt="" loading="lazy" />
                        ) : (
                          <Sprig className="tdetail-card-sprig" />
                        )}
                      </span>
                      <h3 className="tdetail-card-title">{s.title}</h3>
                      {s.subtitle && <p className="tdetail-card-sub">{s.subtitle}</p>}
                    </a>
                  </Reveal>
                ))}
              </div>
            </>
          )}
          <div className="see-more">
            <Link href="/treatments" className="btn btn-outline">
              <span>All treatments</span>
              <Arrow width={18} />
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
