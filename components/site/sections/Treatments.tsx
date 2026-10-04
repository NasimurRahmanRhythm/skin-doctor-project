"use client";

import { treatmentsIntro } from "@/lib/site/content";
import type { SiteTreatment } from "@/lib/site/data";
import { excerpt } from "@/lib/site/excerpt";
import { useQueryParam } from "@/lib/site/use-query-param";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import SiteModal from "@/components/site/SiteModal";
import { Arrow } from "@/components/site/Icons";

/**
 * Athena's concern grid, recast as an editorial index: a long list of rows,
 * each a title and the first sentence or two of its description. Hovering
 * shifts the row and warms the title; there are no pictures.
 */
function Rows({
  items,
  onOpen,
}: {
  items: SiteTreatment[];
  /** On /treatments a row opens its window; on the landing page it links there. */
  onOpen?: (t: SiteTreatment) => void;
}) {
  return (
    <div className="treat-list">
      {items.map((t, i) => (
        <Reveal key={t.id} delay={Math.min(i, 8) * 0.05} y={30}>
          <a
            href={`/treatments?t=${t.id}`}
            className="treat-row"
            data-cursor="Read"
            onClick={(e) => {
              if (!onOpen) return;
              e.preventDefault();
              onOpen(t);
            }}
          >
            <span className="treat-idx">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="treat-title">{t.title}</h3>
            <p className="treat-body">{excerpt(t.description)}</p>
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
          <a href="/treatments" className="btn btn-outline">
            <span>See all treatments</span>
            <Arrow width={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/** /treatments: every treatment, each opening in a window with its full text. */
export function TreatmentCatalog({ items }: { items: SiteTreatment[] }) {
  const [openId, setOpenId] = useQueryParam("t");
  const open = items.find((t) => t.id === openId) ?? null;
  const show = (t: SiteTreatment | null) => setOpenId(t?.id ?? null);

  return (
    <section className="treatments page-section" id="treatments">
      <div className="wrap">
        <Head as="h1" />
        {items.length ? (
          <Rows items={items} onOpen={show} />
        ) : (
          <p className="page-empty">Treatments will be listed here soon.</p>
        )}
      </div>

      <SiteModal open={!!open} onClose={() => show(null)} label={open?.title ?? "Treatment"}>
        {open && (
          <>
            <span className="kicker">Treatment</span>
            <h2 className="site-modal-title">{open.title}</h2>
            <p className="site-modal-text">{open.description}</p>
            <a href={`/inquiry?about=${encodeURIComponent(open.title)}`} className="btn btn-dark">
              <span>Book a Consultation</span>
              <Arrow width={18} />
            </a>
          </>
        )}
      </SiteModal>
    </section>
  );
}
