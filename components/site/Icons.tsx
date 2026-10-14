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

/** Instagram's Direct (message) icon: the paper plane. */
export const InstagramDirect = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M21 3 3 10.2l7.2 2.9L21 3Z" />
    <path d="M21 3l-7.6 18-3.2-7.9L21 3Z" />
  </svg>
);

/** WhatsApp's mark, filled so it reads at a glance. */
export const WhatsApp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.06a8.15 8.15 0 0 1-4.16-1.14l-.3-.18-3.07.89.9-2.99-.2-.31a8.17 8.17 0 1 1 6.83 3.73Zm4.48-6.11c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-1.97-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.88 2.4 1 2.57c.13.16 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.6.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
  </svg>
);

export const Facebook = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" />
  </svg>
);

export const XLogo = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 4h4.3L20 20h-4.3L4 4Z" />
    <path d="M4 20l6.8-7.4M20 4l-6.8 7.4" />
  </svg>
);

export const LinkedIn = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
  </svg>
);

export const YouTube = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="4" />
    <path d="M10 9.2v5.6l4.8-2.8L10 9.2Z" fill="currentColor" />
  </svg>
);

export const TikTok = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M14 3c.4 2.6 2.2 4.4 5 4.6" />
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
