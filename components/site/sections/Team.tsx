"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { teamIntro } from "@/lib/site/content";
import type { SiteDoctor } from "@/lib/site/data";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Arrow, Sprig } from "@/components/site/Icons";

function initials(name: string): string {
  const words = name.replace(/^(dr\.?|prof\.?)\s+/i, "").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Athena's dermatologist row: the doctors on the clinic's staff list, with
 * their photo and designation. A doctor without a photo gets a monogram
 * plate. Each card tilts toward the pointer.
 */
function Member({ m, i }: { m: SiteDoctor; i: number }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 150, damping: 18 });
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  return (
    <Reveal delay={(i % 4) * 0.1} className="member">
      <motion.div
        className={`member-card tone-${i % 4} ${m.photo ? "has-photo" : ""}`}
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
        {m.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- staff photo from storage
          <img src={m.photo} alt={m.name} className="member-photo" loading="lazy" />
        ) : (
          <>
            <Sprig className="member-sprig" />
            <span className="member-initials">{initials(m.name)}</span>
          </>
        )}
        <span className="member-glare" />
      </motion.div>
      <h3 className="member-name">{m.name}</h3>
      {m.designation && <p className="member-role">{m.designation}</p>}
    </Reveal>
  );
}

function Head({ as = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <div className="sec-head split" data-roam-zone>
      <div>
        <span className="kicker">{teamIntro.kicker}</span>
        <SplitReveal as={as} className="display">
          Our <em>Doctors</em>
        </SplitReveal>
      </div>
      <Reveal className="sec-lede">
        <p>{teamIntro.body}</p>
        <span className="roam-anchor team-roam" data-roam data-roam-scale="0.85" />
      </Reveal>
    </div>
  );
}

function Grid({ doctors }: { doctors: SiteDoctor[] }) {
  return (
    <div className={`team-grid count-${Math.min(doctors.length, 4)}`} data-roam-zone>
      <span className="roam-anchor team-grid-roam" data-roam data-roam-scale="0.85" />
      {doctors.map((m, i) => (
        <Member key={m.id} m={m} i={i} />
      ))}
    </div>
  );
}

/** The landing page's first four doctors, and the way to the rest. */
export default function Team({ doctors }: { doctors: SiteDoctor[] }) {
  if (doctors.length === 0) return null;

  return (
    <section className="team" id="team">
      <div className="wrap">
        <Head />
        <Grid doctors={doctors} />
        <div className="see-more">
          <a href="/doctors" className="btn btn-outline">
            <span>See all doctors</span>
            <Arrow width={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/** /doctors: every doctor the owner shows on the website. */
export function DoctorCatalog({ doctors }: { doctors: SiteDoctor[] }) {
  return (
    <section className="team page-section" id="team">
      <div className="wrap">
        <Head as="h1" />
        {doctors.length ? (
          <Grid doctors={doctors} />
        ) : (
          <p className="page-empty">Our doctors will be introduced here soon.</p>
        )}
      </div>
    </section>
  );
}
