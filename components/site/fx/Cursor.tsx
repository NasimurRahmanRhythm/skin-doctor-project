"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/site/gsap";

/**
 * Dot + trailing ring. Links and buttons swell the ring; any element with
 * data-cursor="View" (or "Drag", "Play"…) swaps the ring for a labelled disc.
 * Touch and coarse pointers never see it.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"" | "link" | "label">("");

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const dx = gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.55, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.55, ease: "power3" });

    const move = (e: PointerEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      root.classList.add("cursor-live");
    };

    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const labelled = t.closest<HTMLElement>("[data-cursor]");
      if (labelled) {
        setLabel(labelled.dataset.cursor ?? "");
        setMode("label");
      } else if (t.closest("a, button, input, [role=button], label")) {
        setMode("link");
      } else {
        setMode("");
      }
    };

    const leave = () => root.classList.remove("cursor-live");

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    document.addEventListener("pointerleave", leave);
    return () => {
      root.classList.remove("has-cursor", "cursor-live");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <>
      <div ref={ring} className={`cursor-ring ${mode ? `is-${mode}` : ""}`} aria-hidden>
        <span>{mode === "label" ? label : ""}</span>
      </div>
      <div ref={dot} className={`cursor-dot ${mode ? "is-hidden" : ""}`} aria-hidden />
    </>
  );
}
