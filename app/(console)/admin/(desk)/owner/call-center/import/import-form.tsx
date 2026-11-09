"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  field,
  fieldLabel,
  SectionHead,
  tableEl,
  tableWrap,
  tdCell,
  thCell,
} from "@/components/ui";
import {
  checkRows,
  IMPORT_FIELD_LABEL,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  parseCsv,
  type ImportDefaults,
  type ImportField,
} from "@/lib/call-import";
import { CALL_TYPES, optionLabel, type CallOptions } from "@/lib/call-log";
import { importCalls, type ImportResult } from "./actions";

const PREVIEW_ROWS = 15;

/**
 * Pick a CSV, see how it reads — which columns were found, which rows will go
 * in and which will not (and why) — then import.
 */
export default function ImportForm({
  options,
  agents,
  utcOffset,
}: {
  options: CallOptions;
  agents: { id: string; full_name: string }[];
  utcOffset: string;
}) {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<ImportDefaults>({
    agentId: agents[0]?.id ?? "",
    reason: options.reasons.find((o) => o.value === "other")?.value ?? options.reasons[0]?.value ?? "",
    outcome: options.outcomes.find((o) => o.value === "resolved")?.value ?? options.outcomes[0]?.value ?? "",
    callType: "inbound",
  });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  // When the file was picked: the "is this date in the future?" check runs
  // against it, so the preview does not shift while it is on screen.
  const [pickedAt, setPickedAt] = useState(0);

  const preview = useMemo(() => {
    if (!file) return null;
    const rows = parseCsv(file.text);
    if (rows.length - 1 > MAX_IMPORT_ROWS) return { tooMany: true as const };
    return {
      tooMany: false as const,
      ...checkRows(rows, { options, agents, defaults, utcOffset, now: new Date(pickedAt) }),
    };
  }, [file, options, agents, defaults, utcOffset, pickedAt]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    setFileError(null);
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setFileError("The file is over 2 MB. Split it and import the parts.");
      return;
    }
    setPickedAt(Date.now());
    setFile({ name: f.name, text: await f.text() });
  }

  const good = preview && !preview.tooMany ? preview.checked.filter((c) => c.row) : [];
  const bad = preview && !preview.tooMany ? preview.checked.filter((c) => c.error) : [];
  const found = preview && !preview.tooMany ? (Object.keys(preview.map) as ImportField[]) : [];

  function runImport() {
    if (!file) return;
    startTransition(async () => {
      const res = await importCalls(file.text, defaults);
      setResult(res);
      if (!res.error) setFile(null);
    });
  }

  const set = (patch: Partial<ImportDefaults>) => setDefaults((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-6">
      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="1. Choose the file"
          hint="A CSV with a header row — save a spreadsheet as CSV, or use a file exported from this page. Customer and Phone are needed; Date / time, Agent, Call type, Reason, Product, Outcome, Duration, Follow-up date, Recording link and Notes are read when present."
        />
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onPick}
          className={`${field} mt-4 bg-surface file:mr-3 file:rounded-control file:border-0 file:bg-subtle file:px-3 file:py-1.5 file:text-xs file:font-medium`}
        />
        {fileError && <p className="mt-2 text-sm font-semibold text-danger">{fileError}</p>}
        <p className="mt-2 text-xs text-muted">
          Up to {MAX_IMPORT_ROWS} calls and 2 MB a file. Dates like 2026-11-08 14:05 or 08/11/2026 are read as clinic time.
        </p>
      </section>

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="2. Fill in what the file leaves out"
          hint="Used for a row whose cell is empty, or for every row when the file has no such column."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={fieldLabel}>
            Agent
            <select value={defaults.agentId} onChange={(e) => set({ agentId: e.target.value })} className={`${field} mt-1.5`}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Call type
            <select value={defaults.callType} onChange={(e) => set({ callType: e.target.value })} className={`${field} mt-1.5`}>
              {CALL_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Reason
            <select value={defaults.reason} onChange={(e) => set({ reason: e.target.value })} className={`${field} mt-1.5`}>
              {options.reasons.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Outcome
            <select value={defaults.outcome} onChange={(e) => set({ outcome: e.target.value })} className={`${field} mt-1.5`}>
              {options.outcomes.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {result && (
        <div
          role="status"
          className={`rounded-card border px-5 py-4 text-sm font-semibold ${
            result.error ? "border-danger/40 bg-danger/10 text-danger" : "border-ok/40 bg-ok/10 text-ok"
          }`}
        >
          {result.error
            ? result.error
            : `Imported ${result.imported} ${result.imported === 1 ? "call" : "calls"}${
                result.skipped ? `; ${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped` : ""
              }.`}{" "}
          {!result.error && (
            <Link href="/admin/owner/call-center" className="underline">
              See the calls
            </Link>
          )}
        </div>
      )}

      {file && preview && (
        <section className={`${card} ${cardPad}`}>
          <SectionHead
            title="3. Check and import"
            hint={`${file.name}${
              preview.tooMany ? "" : ` · ${good.length} ready · ${bad.length} with a problem`
            }`}
          />

          {preview.tooMany ? (
            <p className="mt-4 text-sm font-semibold text-danger">
              The file has more than {MAX_IMPORT_ROWS} calls. Split it and import the parts.
            </p>
          ) : preview.missing.length > 0 ? (
            <p className="mt-4 text-sm font-semibold text-danger">
              No {preview.missing.map((f) => IMPORT_FIELD_LABEL[f]).join(" or ")} column was found. Check the header row.
            </p>
          ) : (
            <>
              <p className="mt-4 text-xs text-muted">
                Columns found: <span className="font-semibold text-fg">{found.map((f) => IMPORT_FIELD_LABEL[f]).join(", ")}</span>
              </p>

              {bad.length > 0 && (
                <details className="mt-4 rounded-control border border-danger/30 bg-danger/5 p-3" open={bad.length <= 10}>
                  <summary className="cursor-pointer text-sm font-bold text-danger">
                    {bad.length} row{bad.length === 1 ? "" : "s"} will be skipped
                  </summary>
                  <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs">
                    {bad.slice(0, 200).map((b) => (
                      <li key={b.line}>
                        <span className="font-bold">Line {b.line}:</span> {b.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {good.length > 0 && (
                <div className={`mt-4 ${tableWrap}`}>
                  <table className={`${tableEl} min-w-[900px] text-xs`}>
                    <thead>
                      <tr>
                        <th className={`${thCell} rounded-tl-card`}>Line</th>
                        <th className={thCell}>When</th>
                        <th className={thCell}>Agent</th>
                        <th className={thCell}>Customer</th>
                        <th className={thCell}>Phone</th>
                        <th className={thCell}>Reason</th>
                        <th className={thCell}>Outcome</th>
                        <th className={`${thCell} rounded-tr-card`}>Follow-up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {good.slice(0, PREVIEW_ROWS).map(({ line, row }) => (
                        <tr key={line} className="border-t border-hairline">
                          <td className={`${tdCell} tabular text-muted`}>{line}</td>
                          <td className={`${tdCell} whitespace-nowrap`}>
                            {new Intl.DateTimeFormat("en-GB", {
                              timeZone: "Asia/Dhaka",
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(row!.created_at))}
                          </td>
                          <td className={tdCell}>{agents.find((a) => a.id === row!.agent_id)?.full_name}</td>
                          <td className={`${tdCell} font-semibold`}>{row!.customer_name}</td>
                          <td className={`${tdCell} tabular`}>{row!.phone}</td>
                          <td className={tdCell}>{optionLabel(options.reasons, row!.reason)}</td>
                          <td className={tdCell}>{optionLabel(options.outcomes, row!.outcome)}</td>
                          <td className={tdCell}>{row!.follow_up_date ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {good.length > PREVIEW_ROWS && (
                <p className="mt-2 text-xs text-muted">…and {good.length - PREVIEW_ROWS} more.</p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={runImport} disabled={pending || good.length === 0} className={btnPrimary}>
                  {pending ? "Importing…" : `Import ${good.length} ${good.length === 1 ? "call" : "calls"}`}
                </button>
                <button type="button" onClick={() => setFile(null)} disabled={pending} className={btnGhost}>
                  Choose another file
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
