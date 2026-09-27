import type Lenis from "lenis";

/** One Lenis instance for the page; null when reduced motion keeps native scroll. */
let lenis: Lenis | null = null;

export const setLenis = (instance: Lenis | null) => {
  lenis = instance;
};

export const getLenis = () => lenis;

export function scrollToHash(hash: string) {
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -60, duration: 1.6 });
  else el.scrollIntoView({ behavior: "smooth" });
}
