"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView } from "motion/react";
import { reviews, reviewsSummary } from "@/lib/site/content";
import { Arrow } from "@/components/site/Icons";

/**
 * Score that counts up once, then one large quote at a time. The active rail
 * is a CSS animation whose end advances the slide, so pausing on hover
 * (animation-play-state) resumes exactly where it stopped.
 */
export default function Reviews() {
  const scoreRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(scoreRef, { once: true });
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (!inView || !scoreRef.current) return;
    const el = scoreRef.current;
    const run = animate(0, reviewsSummary.score, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = v.toFixed(1)),
    });
    return () => run.stop();
  }, [inView]);

  const go = (to: number) => {
    setDir(to > index || (index === reviews.length - 1 && to === 0) ? 1 : -1);
    setIndex((to + reviews.length) % reviews.length);
  };

  const r = reviews[index];

  return (
    <section className="reviews dark" id="reviews">
      <div className="wrap reviews-grid">
        <div className="rev-score">
          <span className="kicker">Reviews</span>
          <div className="rev-big">
            <span ref={scoreRef}>0.0</span>
          </div>
          <div className="stars" aria-label={`${reviewsSummary.score} out of 5 stars`}>
            ★★★★★
          </div>
          <p className="rev-meta">Based on {reviewsSummary.count} reviews</p>
          <span className="roam-anchor rev-roam" data-roam data-roam-scale="0.95" />
        </div>

        <div className="rev-stage">
          <div className="rev-quote-wrap">
            <AnimatePresence mode="wait" initial={false}>
              <motion.blockquote
                key={index}
                className="rev-quote"
                initial={{ opacity: 0, y: 40 * dir, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -40 * dir, filter: "blur(8px)" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <p>&ldquo;{r.quote}&rdquo;</p>
                <footer>
                  <span className="rev-avatar">{r.name[0]}</span>
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.when}</small>
                  </span>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <div className="rev-controls">
            <div className="rev-rails">
              {reviews.map((_, i) => (
                <button key={i} className="rev-rail" aria-label={`Review ${i + 1}`} onClick={() => go(i)}>
                  <span
                    key={i === index ? `on-${index}` : `off-${i}`}
                    className={i === index ? "is-active" : i < index ? "is-done" : ""}
                    onAnimationEnd={() => i === index && go(index + 1)}
                  />
                </button>
              ))}
            </div>
            <div className="rev-arrows">
              <button className="btn btn-round ghost" aria-label="Previous review" onClick={() => go(index - 1)}>
                <Arrow width={20} style={{ transform: "scaleX(-1)" }} />
              </button>
              <button className="btn btn-round ghost" aria-label="Next review" onClick={() => go(index + 1)}>
                <Arrow width={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
