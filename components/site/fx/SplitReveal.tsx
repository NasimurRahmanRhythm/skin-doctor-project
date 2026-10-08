"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "@/lib/site/gsap";
import { onIntroDone } from "@/lib/site/intro";

type Tag = "h1" | "h2" | "h3" | "p" | "div" | "span";

/**
 * Lines rise out of masks. `on="scroll"` plays when the block enters view;
 * `on="intro"` plays as the page opens. autoSplit re-splits after the
 * web font swaps in or the viewport resizes, so line breaks stay correct.
 */
export default function SplitReveal({
  as: Tag = "div",
  children,
  className,
  delay = 0,
  stagger = 0.09,
  on = "scroll",
  id,
}: {
  as?: Tag;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  on?: "scroll" | "intro";
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;

      let played = on === "scroll";
      let tween: gsap.core.Tween | undefined;

      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        onSplit(self) {
          tween = gsap.from(self.lines, {
            yPercent: 115,
            rotate: 2.5,
            duration: 1.25,
            ease: "expo.out",
            stagger,
            delay,
            paused: on === "intro" && !played,
            scrollTrigger:
              on === "scroll" ? { trigger: el, start: "top 88%", once: true } : undefined,
          });
          return tween;
        },
      });

      const off =
        on === "intro"
          ? onIntroDone(() => {
              played = true;
              tween?.play();
            })
          : undefined;

      return () => {
        off?.();
        split.revert();
      };
    },
    { scope: ref }
  );

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} id={id}>
      {children}
    </Tag>
  );
}
