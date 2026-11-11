"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * A template (unlike a layout) remounts on every navigation, so this gives each page one soft
 * fade-in when you move between screens. It only animates opacity and a few pixels of movement,
 * and does nothing at all for people who ask their device to reduce motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
