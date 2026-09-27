"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type BagState = { count: number; add: (name: string) => void };

const BagContext = createContext<BagState>({ count: 0, add: () => {} });

export const useBag = () => useContext(BagContext);

/** Demo bag: counts adds and confirms each with a toast. Nothing is persisted. */
export function BagProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState<{ id: number; name: string } | null>(null);

  const add = useCallback((name: string) => {
    setCount((c) => c + 1);
    setToast({ id: Date.now(), name });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <BagContext.Provider value={{ count, add }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            role="status"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <span className="toast-dot" />
            <span>
              Added to bag — <em>{toast.name}</em>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </BagContext.Provider>
  );
}
