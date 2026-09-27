"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { gallery, galleryIntro, results, resultsIntro } from "@/lib/site/content";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";

/**
 * Before/after comparison. Both layers are the same placeholder frame — the
 * "before" is only a desaturating filter — so the captions from the original
 * page, which say these are placeholders, stay on screen.
 */
function Compare({ image, caption, index }: { image: string; caption: string; index: number }) {
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
    const run = animate(pos, [50, 18, 82, 50], { duration: 2.4, delay: index * 0.2, ease: "easeInOut" });
    return () => run.stop();
  }, [inView, index, pos]);

  const setFrom = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    pos.set(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <Reveal delay={index * 0.1}>
      <div
        ref={ref}
        className={`ba ${dragging ? "is-dragging" : ""}`}
        data-cursor="Drag"
        role="slider"
        aria-label={`${caption} before and after`}
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
        <Image src={image} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" className="ba-after" />
        <motion.div className="ba-before" style={{ clipPath: clip }}>
          <Image src={image} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />
        </motion.div>
        <span className="ba-tag ba-tag-l">Before</span>
        <span className="ba-tag ba-tag-r">After</span>
        <motion.div className="ba-handle" style={{ left }}>
          <span>‹ ›</span>
        </motion.div>
      </div>
      <div className="ba-caption">
        <span>0{index + 1}</span>
        {caption}
      </div>
    </Reveal>
  );
}

export default function Results() {
  const track = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(0);

  useEffect(() => {
    const measure = () => {
      const el = track.current;
      if (el) setLimit(Math.max(0, el.scrollWidth - el.parentElement!.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <section className="results" id="results">
      <div className="wrap">
        <div className="sec-head split">
          <div>
            <span className="kicker">{resultsIntro.kicker}</span>
            <SplitReveal as="h2" className="display">
              Transformative <em>Results</em>
            </SplitReveal>
          </div>
          <Reveal className="sec-lede">
            <p>{resultsIntro.body}</p>
          </Reveal>
        </div>

        <div className="ba-grid">
          {results.map((r, i) => (
            <Compare key={r.caption} {...r} index={i} />
          ))}
        </div>
        <p className="fine">{resultsIntro.note}</p>
      </div>

      <div className="gallery" id="gallery">
        <div className="wrap gallery-head">
          <div>
            <span className="kicker">{galleryIntro.kicker}</span>
            <SplitReveal as="h3" className="display sm">
              Before &amp; After <em>Gallery</em>
            </SplitReveal>
          </div>
          <p className="sec-lede">{galleryIntro.body}</p>
          <span className="roam-anchor gal-roam" data-roam data-roam-scale="0.8" />
        </div>
        <div className="gallery-viewport" data-cursor="Drag">
          <motion.div
            ref={track}
            className="gallery-track"
            drag="x"
            dragConstraints={{ left: -limit, right: 0 }}
            dragElastic={0.08}
            dragTransition={{ power: 0.25, timeConstant: 300 }}
          >
            {gallery.map((src, i) => (
              <motion.figure
                key={src + i}
                className="gal-tile"
                initial={{ opacity: 0, x: 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="gal-split">
                  <div className="gal-half is-before">
                    <Image src={src} alt="" fill sizes="340px" draggable={false} />
                    <span>Before</span>
                  </div>
                  <div className="gal-half">
                    <Image src={src} alt="" fill sizes="340px" draggable={false} />
                    <span>After</span>
                  </div>
                </div>
                <figcaption>Case 0{i + 1}</figcaption>
              </motion.figure>
            ))}
          </motion.div>
        </div>
        <p className="fine wrap">{galleryIntro.note}</p>
      </div>
    </section>
  );
}
