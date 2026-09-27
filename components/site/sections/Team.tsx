"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { team, teamIntro } from "@/lib/site/content";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Sprig } from "@/components/site/Icons";

/**
 * Athena's dermatologist row. There are no portraits yet, so each card is a
 * monogram plate — tilting toward the pointer — until real photography lands.
 */
function Member({ m, i }: { m: (typeof team)[number]; i: number }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 150, damping: 18 });
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  return (
    <Reveal delay={i * 0.1} className="member">
      <motion.div
        className={`member-card tone-${i}`}
        style={{ rotateX: rx, rotateY: ry, "--gx": glareX, "--gy": glareY } as never}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        <Sprig className="member-sprig" />
        <span className="member-initials">{m.initials}</span>
        {m.cred && <span className="member-cred">{m.cred}</span>}
        <span className="member-glare" />
      </motion.div>
      <h3 className="member-name">{m.name}</h3>
      <p className="member-role">{m.role}</p>
    </Reveal>
  );
}

export default function Team() {
  return (
    <section className="team" id="team">
      <div className="wrap">
        <div className="sec-head split" data-roam-zone>
          <div>
            <span className="kicker">{teamIntro.kicker}</span>
            <SplitReveal as="h2" className="display">
              Doctors <em>&amp;</em> Practitioners
            </SplitReveal>
          </div>
          <Reveal className="sec-lede">
            <p>{teamIntro.body}</p>
            <span className="roam-anchor team-roam" data-roam data-roam-scale="0.85" />
          </Reveal>
        </div>
        <div className="team-grid" data-roam-zone>
          <span className="roam-anchor team-grid-roam" data-roam data-roam-scale="0.85" />
          {team.map((m, i) => (
            <Member key={m.name} m={m} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
