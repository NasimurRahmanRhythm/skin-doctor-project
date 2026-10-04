"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { shopIntro } from "@/lib/site/content";
import type { SiteProduct } from "@/lib/site/data";
import { useQueryParam } from "@/lib/site/use-query-param";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import SiteModal from "@/components/site/SiteModal";
import { Arrow } from "@/components/site/Icons";

/** The picture, or the brand mark on sand when the product has none. */
function Picture({ p, sizes }: { p: SiteProduct; sizes: string }) {
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded, any host
    return <img src={p.image} alt={p.title ?? ""} loading="lazy" />;
  }
  return (
    <span className="product-placeholder">
      <Image src="/brand/mark-256.png" alt="" width={96} height={96} sizes={sizes} />
    </span>
  );
}

/**
 * Display-only product cards: there is no cart. On the landing page a card
 * leads to /products, where it opens in a window with its full description.
 */
function Grid({ items, onOpen }: { items: SiteProduct[]; onOpen?: (p: SiteProduct) => void }) {
  return (
    <div className="shop-grid">
      {items.map((p, i) => (
        <motion.article
          key={p.id}
          className="product"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 1, delay: (i % 4) * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <a
            href={`/products?p=${p.id}`}
            className="product-link"
            data-cursor="View"
            onClick={(e) => {
              if (!onOpen) return;
              e.preventDefault();
              onOpen(p);
            }}
          >
            <div className="product-media">
              <Picture p={p} sizes="96px" />
              <span className="product-idx">No. {String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="product-meta">
              <h3>{p.title}</h3>
              {p.price && <span>{p.price}</span>}
            </div>
            {p.description && <p className="product-desc">{p.description}</p>}
          </a>
        </motion.article>
      ))}
    </div>
  );
}

function Head({ as = "h2" }: { as?: "h1" | "h2" }) {
  return (
    <div className="sec-head split">
      <div>
        <span className="kicker">{shopIntro.kicker}</span>
        <SplitReveal as={as} className="display">
          Skincare <em>Shop</em>
        </SplitReveal>
      </div>
      <Reveal className="sec-lede">
        <p>{shopIntro.body}</p>
      </Reveal>
    </div>
  );
}

export default function Shop({ items }: { items: SiteProduct[] }) {
  if (items.length === 0) return null;
  return (
    <section className="shop" id="shop">
      <div className="wrap">
        <Head />
        <Grid items={items} />
        <div className="see-more">
          <a href="/products" className="btn btn-outline">
            <span>See all products</span>
            <Arrow width={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/** /products: every product, each opening in a window with its details. */
export function ProductCatalog({ items }: { items: SiteProduct[] }) {
  const [openId, setOpenId] = useQueryParam("p");
  const open = items.find((p) => p.id === openId) ?? null;
  const show = (p: SiteProduct | null) => setOpenId(p?.id ?? null);

  return (
    <section className="shop page-section" id="shop">
      <div className="wrap">
        <Head as="h1" />
        {items.length ? (
          <Grid items={items} onOpen={show} />
        ) : (
          <p className="page-empty">Products will be listed here soon.</p>
        )}
      </div>

      <SiteModal open={!!open} onClose={() => show(null)} label={open?.title ?? "Product"}>
        {open && (
          <div className="product-detail">
            <div className="product-detail-media">
              <Picture p={open} sizes="96px" />
            </div>
            <div>
              <span className="kicker">Skincare Shop</span>
              {open.title && <h2 className="site-modal-title">{open.title}</h2>}
              {open.price && <p className="product-detail-price">{open.price}</p>}
              {open.description && <p className="site-modal-text">{open.description}</p>}
            </div>
          </div>
        )}
      </SiteModal>
    </section>
  );
}
