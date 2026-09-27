"use client";

import { motion, type HTMLMotionProps } from "motion/react";

/** Rise-and-fade on first view. The workhorse for everything that isn't a headline. */
export default function Reveal({
  delay = 0,
  y = 40,
  children,
  ...rest
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
