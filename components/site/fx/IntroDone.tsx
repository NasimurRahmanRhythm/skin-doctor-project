"use client";

import { useEffect } from "react";
import { markIntroDone } from "@/lib/site/intro";

/**
 * There is no loading screen, so this says the intro is over as soon as the
 * page mounts; the header and the hero's entrance wait for it.
 */
export default function IntroDone() {
  useEffect(() => markIntroDone(), []);
  return null;
}
