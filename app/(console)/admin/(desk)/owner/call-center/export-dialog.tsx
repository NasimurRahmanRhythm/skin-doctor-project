"use client";

import { useRef, useState, useTransition } from "react";
import { btnGhost, btnPrimary, btnQuiet } from "@/components/ui";
import { DEFAULT_FIELDS, EXPORT_FIELDS, type ExportField } from "@/lib/call-log";
import type { CallFilters } from "@/lib/call-log-query";
import { exportCalls, type ExportFormat } from "./actions";

const LABEL = new Map(EXPORT_FIELDS.map((f) => [f.key, f.label]));

type Row = { key: ExportField; on: boolean };

/** The saved choice first, in its order, then every other field unticked. */
function rowsFrom(saved: ExportField[]): Row[] {
  const chosen = saved.length ? saved : DEFAULT_FIELDS;
  return [
    ...chosen.map((key) => ({ key, on: true })),
    ...DEFAULT_FIELDS.filter((k) => !chosen.includes(k)).map((key) => ({ key, on: false })),
  ];
}

/**
 * "Export": a dialog where the owner ticks the columns they want and puts
 * them in order. Download (CSV or Excel) sends every call matching the current filters, and
 * the choice is saved so the dialog opens the same way next time.
 */
export default function ExportDialog({
  filters,
  saved,
  total,
}: {
  filters: CallFilters;
  saved: ExportField[];
  total: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(saved));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Which button is working, so only that one says "Preparing…".
  const [making, setMaking] = useState<ExportFormat | null>(null);

  const picked = rows.filter((r) => r.on).map((r) => r.key);

  function move(i: number, by: -1 | 1) {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  }

  function download(format: ExportFormat) {
    setError(null);
    setMaking(format);
    startTransition(async () => {
      const res = await exportCalls(filters, picked, format);
      setMaking(null);
      if (res.error || !res.data) {
        setError(res.error ?? "Could not make the file.");
        return;
      }
      const blob =
        format === "csv"
          ? // The BOM makes Excel read Bangla names as UTF-8.
            new Blob(["\ufeff" + res.data], { type: "text/csv;charset=utf-8" })
          : new Blob([Uint8Array.from(atob(res.data), (ch) => ch.charCodeAt(0))], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = res.filename ?? `calls.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      dialog.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Opens on the last saved choice, which a download may have changed.
          setRows(rowsFrom(saved));
          setError(null);
          dialog.current?.showModal();
        }}
        className={btnGhost}
      >
        Export
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="export-title"
        className="m-auto w-[min(92vw,30rem)] rounded-card border border-hairline bg-surface p-0 text-fg shadow-lift backdrop:bg-black/40"
      >
        <div className="px-5 py-5 sm:px-6">
          <h2 id="export-title" className="text-base font-extrabold">
            Export calls
          </h2>
          <p className="mt-1 text-sm text-muted">
            Tick the fields you want and put them in order. All {total}{" "}
            {total === 1 ? "call" : "calls"} matching the current filters are exported.
          </p>

          <div className="mt-3 flex gap-3 text-xs">
            <button
              type="button"
              className={btnQuiet}
              onClick={() => setRows(rows.map((r) => ({ ...r, on: true })))}
            >
              Select all
            </button>
            <button
              type="button"
              className={btnQuiet}
              onClick={() => setRows(rowsFrom([]))}
            >
              Reset to default
            </button>
          </div>

          <ol className="mt-3 max-h-[55vh] divide-y divide-hairline overflow-y-auto rounded-control border border-hairline">
            {rows.map((r, i) => (
              <li key={r.key} className="flex items-center gap-3 px-3 py-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={r.on}
                    onChange={() =>
                      setRows(rows.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))
                    }
                    className="accent-[var(--primary)]"
                  />
                  <span className={r.on ? "" : "text-muted"}>{LABEL.get(r.key)}</span>
                </label>
                <span className="flex items-center gap-1">
                  {(["up", "down"] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => move(i, dir === "up" ? -1 : 1)}
                      disabled={dir === "up" ? i === 0 : i === rows.length - 1}
                      aria-label={`Move ${LABEL.get(r.key)} ${dir}`}
                      className="grid h-7 w-7 place-items-center rounded-full text-muted transition-ui hover:bg-subtle hover:text-fg disabled:opacity-30"
                    >
                      {dir === "up" ? "↑" : "↓"}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ol>

          {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => dialog.current?.close()} className={btnGhost}>
              Cancel
            </button>
            {(
              [
                ["csv", "Download CSV", btnGhost],
                ["xlsx", "Download Excel (.xlsx)", btnPrimary],
              ] as const
            ).map(([format, label, style]) => (
              <button
                key={format}
                type="button"
                onClick={() => download(format)}
                disabled={pending || picked.length === 0}
                className={style}
              >
                {making === format ? "Preparing…" : label}
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
