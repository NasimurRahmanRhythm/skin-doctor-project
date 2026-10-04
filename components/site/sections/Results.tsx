"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { resultsIntro } from "@/lib/site/content";
import type { SiteResult } from "@/lib/site/data";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Arrow } from "@/components/site/Icons";

/**
 * Before/after comparison: the after photo underneath, the before photo on
 * top, clipped at the divider. Both are real photos the owner uploads as a
 * pair — except the seeded placeholders, which use one picture for both
 * sides; for those the "before" is tinted so the slider still reads.
 */
function Compare({ result, index }: { result: SiteResult; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useMotionValue(50);
  const clip = useTransform(pos, (p) => `inset(0 ${100 - p}% 0 0)`);
  const left = useTransform(pos, (p) => `${p}%`);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const [dragging, setDragging] = useState(false);
  const [now, setNow] = useState(50);
  useMotionValueEvent(pos, "change", (v) => setNow(Math.round(v)));

  // One sweep on first view, so it is obvious the divider moves.
  useEffect(() => {
    if (!inView) return;
    const run = animate(pos, [50, 18, 82, 50], { duration: 2.4, delay: (index % 3) * 0.2, ease: "easeInOut" });
    return () => run.stop();
  }, [inView, index, pos]);

  const setFrom = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    pos.set(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <Reveal delay={(index % 3) * 0.1}>
      <div
        ref={ref}
        className={`ba ${dragging ? "is-dragging" : ""} ${
          result.before === result.after ? "is-placeholder" : ""
        }`}
        data-cursor="Drag"
        role="slider"
        aria-label={`${result.title} before and after`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={now}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") pos.set(Math.max(0, pos.get() - 5));
          if (e.key === "ArrowRight") pos.set(Math.min(100, pos.get() + 5));
        }}
        onPointerDown={(e) => {
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          setFrom(e.clientX);
        }}
        onPointerMove={(e) => dragging && setFrom(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded, any host */}
        <img src={result.after} alt={`After — ${result.title}`} className="ba-after" draggable={false} />
        <motion.div className="ba-before" style={{ clipPath: clip }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded, any host */}
          <img src={result.before} alt={`Before — ${result.title}`} draggable={false} />
        </motion.div>
        <span className="ba-tag ba-tag-l">Before</span>
        <span className="ba-tag ba-tag-r">After</span>
        <motion.div className="ba-handle" style={{ left }}>
          <span>‹ ›</span>
        </motion.div>
      </div>
      <div className="ba-caption">
        <span>{String(index + 1).padStart(2, "0")}</span>
        {result.title}
      </div>
      {result.description && <p className="ba-desc">{result.description}</p>}
    </Reveal>
  );
}

function Head({ as = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <div className="sec-head split">
      <div>
        <span className="kicker">{resultsIntro.kicker}</span>
        <SplitReveal as={as} className="display">
          Transformative <em>Results</em>
        </SplitReveal>
      </div>
      <Reveal className="sec-lede">
        <p>{resultsIntro.body}</p>
      </Reveal>
    </div>
  );
}

function Grid({ items }: { items: SiteResult[] }) {
  return (
    <div className="ba-grid">
      {items.map((r, i) => (
        <Compare key={r.id} result={r} index={i} />
      ))}
    </div>
  );
}

/** The landing page's first three sliders, and the way to the rest. */
export default function Results({ items }: { items: SiteResult[] }) {
  if (items.length === 0) return null;

  return (
    <section className="results" id="results">
      <div className="wrap">
        <Head />
        <Grid items={items} />
        <p className="fine">{resultsIntro.note}</p>
        <div className="see-more">
          <a href="/results" className="btn btn-outline">
            <span>See all results</span>
            <Arrow width={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/** /results: every before/after slider the owner has added. */
export function ResultCatalog({ items }: { items: SiteResult[] }) {
  return (
    <section className="results page-section" id="results">
      <div className="wrap">
        <Head as="h1" />
        {items.length ? (
          <>
            <Grid items={items} />
            <p className="fine">{resultsIntro.note}</p>
          </>
        ) : (
          <p className="page-empty">Results will be shown here soon.</p>
        )}
      </div>
    </section>
  );
}
