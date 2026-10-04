"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView } from "motion/react";
import type { GoogleReviews } from "@/lib/site/google-reviews";
import { Arrow, ArrowUpRight } from "@/components/site/Icons";

/** Five stars, filled to the rating (4.6 fills four and most of the fifth). */
function Stars({ value, className = "stars" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={`${className} star-meter`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <span aria-hidden>★★★★★</span>
      <span aria-hidden className="star-fill" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

/**
 * The clinic's Google rating, counted up once, then one review at a time.
 * The active rail is a CSS animation whose end advances the slide, so
 * pausing on hover (animation-play-state) resumes exactly where it stopped.
 */
export default function Reviews({ data }: { data: GoogleReviews | null }) {
  const scoreRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(scoreRef, { once: true });
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const rating = data?.rating ?? 0;
  const reviews = data?.reviews ?? [];

  useEffect(() => {
    if (!inView || !scoreRef.current) return;
    const el = scoreRef.current;
    const run = animate(0, rating, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = v.toFixed(1)),
    });
    return () => run.stop();
  }, [inView, rating]);

  if (!data || reviews.length === 0) return null;

  const go = (to: number) => {
    setDir(to > index || (index === reviews.length - 1 && to === 0) ? 1 : -1);
    setIndex((to + reviews.length) % reviews.length);
  };

  const r = reviews[index];
  const several = reviews.length > 1;

  return (
    <section className="reviews dark" id="reviews">
      <div className="wrap reviews-grid">
        <div className="rev-score">
          <span className="kicker">Reviews</span>
          <div className="rev-big">
            <span ref={scoreRef}>0.0</span>
          </div>
          <Stars value={rating} />
          <p className="rev-meta">Based on {data.count} Google reviews</p>
          {data.mapsUrl && (
            <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light rev-all">
              <span>See all reviews on Google</span>
              <ArrowUpRight width={18} />
            </a>
          )}
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
                <p className="rev-text">&ldquo;{r.text}&rdquo;</p>
                {r.text.length > 360 && data.mapsUrl && (
                  <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer" className="rev-more">
                    Read more on Google
                  </a>
                )}
                <footer>
                  {r.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Google profile photo
                    <img src={r.photoUrl} alt="" className="rev-avatar" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="rev-avatar">{r.author[0]}</span>
                  )}
                  <span>
                    {r.authorUrl ? (
                      <a href={r.authorUrl} target="_blank" rel="noopener noreferrer">
                        <strong>{r.author}</strong>
                      </a>
                    ) : (
                      <strong>{r.author}</strong>
                    )}
                    <small>
                      <Stars value={r.rating} className="rev-stars" /> {r.when}
                    </small>
                  </span>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <div className="rev-controls">
            {several && (
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
            )}
            {several && (
              <div className="rev-arrows">
                <button className="btn btn-round ghost" aria-label="Previous review" onClick={() => go(index - 1)}>
                  <Arrow width={20} style={{ transform: "scaleX(-1)" }} />
                </button>
                <button className="btn btn-round ghost" aria-label="Next review" onClick={() => go(index + 1)}>
                  <Arrow width={20} />
                </button>
              </div>
            )}
            <p className="rev-source">Reviews from Google</p>
          </div>
        </div>
      </div>
    </section>
  );
}
