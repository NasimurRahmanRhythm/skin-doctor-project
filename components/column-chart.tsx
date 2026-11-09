"use client";

import { useState } from "react";

export type Column = { key: string; label: string; value: number; tip: string };

/**
 * A single-series column chart: one hue, thin columns with rounded tops and a
 * gap between them, a quiet baseline, a few axis labels, and a tooltip on
 * hover or focus. One series, so no legend — the card title names it.
 */
export default function ColumnChart({
  columns,
  height = 150,
  labelEvery = 1,
  ariaLabel,
}: {
  columns: Column[];
  height?: number;
  /** Show every nth axis label (and always the last), so dates do not collide. */
  labelEvery?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...columns.map((c) => c.value));
  // Every nth label and always the last; one that would crowd the last is dropped.
  const last = columns.length - 1;
  const showLabel = (i: number) =>
    i === last || (i % labelEvery === 0 && (labelEvery === 1 || last - i > Math.ceil(labelEvery / 2)));
  const peak = columns.reduce((best, c, i) => (c.value > columns[best].value ? i : best), 0);

  return (
    <div className="relative" role="img" aria-label={ariaLabel}>
      {/* The peak's value, stated once: the rest are a hover away. */}
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {columns.map((c, i) => {
          const h = c.value === 0 ? 0 : Math.max(3, (c.value / max) * (height - 18));
          return (
            <button
              key={c.key}
              type="button"
              aria-label={c.tip}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end outline-none"
            >
              {i === peak && c.value > 0 && (
                <span className="mb-1 text-center text-[10px] font-bold tabular text-muted">{c.value}</span>
              )}
              <span
                className={`block w-full rounded-t-[4px] transition-ui ${
                  hover === i ? "bg-primary" : "bg-primary/70"
                }`}
                style={{ height: h }}
              />
            </button>
          );
        })}
      </div>
      <div className="border-t border-hairline" />
      <div className="mt-1 flex gap-[2px] overflow-hidden">
        {columns.map((c, i) => (
          <span
            key={c.key}
            // The end labels hang inward, so neither is cut off at the edge.
            className={`flex min-w-0 flex-1 whitespace-nowrap text-[10px] tabular text-muted ${
              i === 0 ? "justify-start" : i === last ? "justify-end" : "justify-center"
            }`}
          >
            {showLabel(i) ? c.label : ""}
          </span>
        ))}
      </div>

      {hover !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg shadow-card"
          style={{ left: `${((hover + 0.5) / columns.length) * 100}%` }}
        >
          {columns[hover].tip}
        </div>
      )}
    </div>
  );
}
