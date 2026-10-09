"use client";

import { useEffect } from "react";

/**
 * Opens the browser print dialog once the sheet has rendered.
 *
 * The page is server-rendered, so what reaches the printer is identical every
 * time — this only fires the dialog.
 */
export default function PrintTrigger() {
  useEffect(() => {
    const id = setTimeout(() => window.print(), 300);
    return () => clearTimeout(id);
  }, []);
  return null;
}
