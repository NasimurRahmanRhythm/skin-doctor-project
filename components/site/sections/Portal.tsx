"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { portal } from "@/lib/site/content";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Arrow } from "@/components/site/Icons";

type Tab = "signin" | "create";

export default function Portal() {
  const [tab, setTab] = useState<Tab>("signin");
  const [msg, setMsg] = useState("");
  const isSignin = tab === "signin";

  const switchTo = (t: Tab) => {
    setTab(t);
    setMsg("");
  };

  return (
    <section className="portal" id="portal">
      <div className="wrap portal-grid">
        <div className="portal-info">
          <span className="kicker">{portal.kicker}</span>
          <SplitReveal as="h2" className="display">
            Your care, <em>on your time.</em>
          </SplitReveal>
          <Reveal delay={0.1}>
            <p>{portal.body}</p>
          </Reveal>
          <ul>
            {portal.perks.map((p, i) => (
              <Reveal key={p} delay={0.15 + i * 0.06} y={16}>
                <li>
                  <span>0{i + 1}</span>
                  {p}
                </li>
              </Reveal>
            ))}
          </ul>
          <span className="roam-anchor portal-roam" data-roam data-roam-scale="0.9" />
        </div>

        <Reveal className="portal-form" delay={0.15}>
          <div className="tabs" role="tablist">
            {(["signin", "create"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={`tab ${tab === t ? "is-active" : ""}`}
                onClick={() => switchTo(t)}
              >
                {t === "signin" ? "Sign In" : "Create Account"}
                {tab === t && <motion.span layoutId="tab-underline" className="tab-line" />}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(
                isSignin
                  ? "This is a template preview — sign-in isn't connected yet."
                  : "This is a template preview — account creation isn't connected yet."
              );
            }}
          >
            <AnimatePresence initial={false}>
              {!isSignin && (
                <motion.div
                  className="field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <input id="fullName" type="text" placeholder=" " required autoComplete="name" />
                  <label htmlFor="fullName">Full name</label>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="field">
              <input id="email" type="email" placeholder=" " required autoComplete="email" />
              <label htmlFor="email">Email</label>
            </div>
            <div className="field">
              <input
                id="password"
                type="password"
                placeholder=" "
                required
                autoComplete={isSignin ? "current-password" : "new-password"}
              />
              <label htmlFor="password">Password</label>
            </div>
            <button type="submit" className="btn btn-dark btn-block">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={tab}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {isSignin ? "Sign In" : "Create Account"}
                </motion.span>
              </AnimatePresence>
              <Arrow width={18} />
            </button>
          </form>

          <AnimatePresence>
            {msg && (
              <motion.p
                className="portal-msg"
                role="status"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {msg}
              </motion.p>
            )}
          </AnimatePresence>
          <p className="fine">{portal.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
