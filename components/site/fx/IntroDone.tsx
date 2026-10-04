"use client";

import { useEffect } from "react";
import { markIntroDone } from "@/lib/site/intro";

/**
 * The inner pages have no preloader curtain, so nothing would ever say the
 * intro is over and the header would wait forever. This says it at once.
 */
export default function IntroDone() {
  useEffect(() => markIntroDone(), []);
  return null;
}
