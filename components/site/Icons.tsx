import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const Arrow = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUpRight = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const Instagram = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

export const Bag = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const Shield = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z" />
  </svg>
);

export const CheckCircle = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />
  </svg>
);

export const Cross = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3v18M3 12h18" />
  </svg>
);

export const Square = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

export const Star = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 2l2.4 6.9H21l-5.6 4.1 2.1 7L12 16l-5.5 4 2.1-7L3 8.9h6.6z" />
  </svg>
);

/** Line-art leaf sprig, echoing the sprig that wraps the DS mark in the logo. */
export const Sprig = (p: P) => (
  <svg viewBox="0 0 120 160" {...base} strokeWidth={1.2} {...p}>
    <path d="M60 150 C60 100 60 60 60 10" />
    <path d="M60 40 C40 30 25 40 20 60 C40 62 55 55 60 40Z" />
    <path d="M60 70 C80 60 95 70 100 90 C80 92 65 85 60 70Z" />
    <path d="M60 100 C42 92 28 100 24 118 C44 120 57 114 60 100Z" />
  </svg>
);

export const certIcons = [Shield, CheckCircle, Cross, Square, Star];
