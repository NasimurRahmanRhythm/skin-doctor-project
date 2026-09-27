"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { products, shopIntro } from "@/lib/site/content";
import { useBag } from "@/components/site/Bag";
import SplitReveal from "@/components/site/fx/SplitReveal";
import Reveal from "@/components/site/fx/Reveal";
import { Bag } from "@/components/site/Icons";

export default function Shop() {
  const { add } = useBag();

  return (
    <section className="shop" id="shop">
      <div className="wrap">
        <div className="sec-head split">
          <div>
            <span className="kicker">{shopIntro.kicker}</span>
            <SplitReveal as="h2" className="display">
              Skincare <em>Shop</em>
            </SplitReveal>
          </div>
          <Reveal className="sec-lede">
            <p>{shopIntro.body}</p>
          </Reveal>
        </div>

        <div className="shop-grid">
          {products.map((p, i) => (
            <motion.article
              key={p.name}
              className="product"
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 1, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="product-media">
                <Image src={p.image} alt="" fill sizes="(max-width: 900px) 50vw, 25vw" />
                <span className="product-idx">No. 0{i + 1}</span>
                <button className="product-add" onClick={() => add(p.name)}>
                  <Bag width={18} />
                  Add to Bag
                </button>
              </div>
              <div className="product-meta">
                <h3>{p.name}</h3>
                <span>{p.price}</span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
