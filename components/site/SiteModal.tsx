"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getLenis } from "@/lib/site/scroll";

/**
 * The website's detail window: a treatment's or a product's full text.
 *
 * Built on <dialog>, so focus is trapped and Esc closes it for free. Smooth
 * scrolling is paused while it is open, or the page would scroll behind it.
 */
export default function SiteModal({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    const lenis = getLenis();
    if (open) lenis?.stop();
    else lenis?.start();
    document.documentElement.classList.toggle("modal-open", open);
  }, [open]);

  useEffect(() => () => {
    getLenis()?.start();
    document.documentElement.classList.remove("modal-open");
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className="site-modal"
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, not its content.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="site-modal-body">
        <button type="button" className="site-modal-close" onClick={onClose} aria-label="Close">
          <span aria-hidden>×</span>
        </button>
        {children}
      </div>
    </dialog>
  );
}
