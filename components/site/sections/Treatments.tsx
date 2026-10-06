"use client";

import { useEffect } from "react";
import Link from "next/link";
import { treatmentsIntro } from "@/lib/site/content";
import type { SiteTreatment } from "@/lib/site/data";
import { excerpt } from "@/lib/site/excerpt";
import { useQueryParam } from "@/lib/site/use-query-param";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Arrow } from "@/components/site/Icons";

/**
 * Athena's concern grid, recast as an editorial index: a long list of rows,
 * each a title and the first sentence or two of its introduction, opening the
 * treatment's own page. Hovering shifts the row and warms the title; there
 * are no pictures.
 */
function Rows({ items, start = 0 }: { items: SiteTreatment[]; start?: number }) {
  return (
    <div className="treat-list">
      {items.map((t, i) => (
        <Reveal key={t.id} delay={Math.min(i, 8) * 0.05} y={30}>
          <a href={`/treatments/${t.href}`} className="treat-row" data-cursor="Read">
            <span className="treat-idx">{String(start + i + 1).padStart(2, "0")}</span>
            <h3 className="treat-title">{t.title}</h3>
            <p className="treat-body">{excerpt(t.description ?? t.subtitle ?? "")}</p>
            <span className="treat-arrow">
              <Arrow width={20} />
            </span>
          </a>
        </Reveal>
      ))}
    </div>
  );
}

function Head({ as = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <div className="sec-head split" data-roam-zone>
      <div>
        <span className="kicker">{treatmentsIntro.kicker}</span>
        <SplitReveal as={as} className="display">
          Our <em>Treatments</em>
        </SplitReveal>
      </div>
      <Reveal className="sec-lede">
        <p>{treatmentsIntro.body}</p>
        <span className="roam-anchor treat-roam" data-roam data-roam-scale="0.85" />
      </Reveal>
    </div>
  );
}

/** The landing page's slice: the first few, and the way to the rest. */
export default function Treatments({ items }: { items: SiteTreatment[] }) {
  if (items.length === 0) return null;
  return (
    <section className="treatments" id="treatments">
      <div className="wrap">
        <Head />
        <Rows items={items} />
        <div className="see-more">
          <Link href="/treatments" className="btn btn-outline">
            <span>See all treatments</span>
            <Arrow width={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Treatments by category, in the order each category first appears in the
 * owner's list, as Athena groups hers under Dermatology, Aesthetics and Hair.
 * Uncategorised ones come last; with no categories at all, one plain list.
 */
function byCategory(items: SiteTreatment[]): { name: string | null; items: SiteTreatment[] }[] {
  const groups = new Map<string, { name: string | null; items: SiteTreatment[] }>();
  for (const t of items) {
    const name = t.category?.trim() || null;
    const key = name?.toLowerCase() ?? "";
    if (!groups.has(key)) groups.set(key, { name, items: [] });
    groups.get(key)!.items.push(t);
  }
  const list = [...groups.values()];
  return [...list.filter((g) => g.name), ...list.filter((g) => !g.name)];
}

/** /treatments: every treatment, grouped, each row opening its own page. */
export function TreatmentCatalog({ items }: { items: SiteTreatment[] }) {
  // Treatments used to open in a window here, at /treatments?t=<id>; send
  // those old links on to the treatment's own page.
  const [oldId] = useQueryParam("t");
  useEffect(() => {
    const old = oldId ? items.find((t) => t.id === oldId) : undefined;
    if (old) window.location.replace(`/treatments/${old.href}`);
  }, [oldId, items]);

  const groups = byCategory(items);
  const titled = groups.some((g) => g.name);
  // The numbering runs on across groups.
  const starts = groups.map((_, i) => groups.slice(0, i).reduce((n, g) => n + g.items.length, 0));

  return (
    <section className="treatments page-section" id="treatments">
      <div className="wrap">
        <Head as="h1" />
        {items.length === 0 ? (
          <p className="page-empty">Treatments will be listed here soon.</p>
        ) : (
          groups.map((g, i) => (
            <div key={g.name ?? "other"} className="treat-group">
              {titled && <h2 className="treat-group-title">{g.name ?? "More treatments"}</h2>}
              <Rows items={g.items} start={starts[i]} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
