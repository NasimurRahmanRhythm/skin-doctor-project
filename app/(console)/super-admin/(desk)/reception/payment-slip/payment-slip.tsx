"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "@/components/ui";
import { amountInWords, formatPaisa, lineTotalPaisa } from "@/lib/amount-in-words";
import { CLINIC_ADDRESS, CLINIC_PHONE } from "@/lib/clinic";
import { savePaymentSlip } from "./actions";

/**
 * The payment slip: typed on the sheet that prints, like the prescription pad.
 *
 * Line totals, the grand total and the amount in words all follow from what
 * is typed above them. "Save & print" records
 * the slip first and then locks the sheet, so the paper the patient takes home
 * cannot drift from the row the owner sees. The signature is added by hand.
 */

type Row = { id: number; description: string; cost: string; qty: string };

const START_ROWS = 8;

const blankRows = (from = 0): Row[] =>
  Array.from({ length: START_ROWS }, (_, i) => ({
    id: from + i,
    description: "",
    cost: "",
    qty: "",
  }));

const BLANK_INFO = {
  date: "",
  receiptNo: "",
  name: "",
  age: "",
  gender: "",
  address: "",
  phone: "",
};

/**
 * The sheet is paper, so it stays light whatever the console theme is: what
 * the receptionist sees is what comes out of the printer.
 */
const PAPER = {
  "--surface": "#ffffff",
  "--fg": "#1f1a14",
  "--muted": "#6d6358",
  "--primary": "#8f6230",
  "--hairline": "#d9cdbd",
  colorScheme: "light",
} as CSSProperties;

const BAND = "bg-[#f1e4d3] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

/** "2026-10-06" → "06/10/2026". */
function formatSlipDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

const lineInput =
  "min-w-0 flex-1 border-0 border-b border-dotted border-fg/50 bg-transparent px-1 py-0.5 text-[13.5px] font-semibold text-fg " +
  "focus:border-solid focus:border-primary focus:outline-none print:placeholder:text-transparent";

const cellInput =
  "block w-full border-0 bg-transparent px-2 py-1.5 text-[13.5px] text-fg " +
  "focus:bg-[#fbf4ea] focus:outline-none print:placeholder:text-transparent";

const cellBorder = "border border-fg/45";

function LineField({
  label,
  className = "",
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex min-w-0 items-end gap-1.5 ${className}`}>
      <span className="shrink-0 text-[13px] italic text-muted">{label}:</span>
      <input type="text" autoComplete="off" className={lineInput} {...input} />
    </label>
  );
}

export default function PaymentSlip() {
  const [info, setInfo] = useState(BLANK_INFO);
  const [rows, setRows] = useState<Row[]>(() => blankRows());
  const nextId = useRef(START_ROWS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField =
    (key: keyof typeof BLANK_INFO) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setInfo((prev) => ({ ...prev, [key]: e.target.value }));

  const setCell = (id: number, key: "description" | "cost" | "qty", value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const addRow = () => {
    const id = nextId.current++;
    setRows((prev) => [...prev, { id, description: "", cost: "", qty: "" }]);
  };

  const removeRow = (id: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  // A saved slip is already on file, so starting over loses nothing.
  const clear = () => {
    if (!saved && !window.confirm("Clear everything on this slip?")) return;
    setInfo(BLANK_INFO);
    setRows(blankRows(nextId.current));
    nextId.current += START_ROWS;
    setSaved(false);
    setError(null);
  };

  const saveAndPrint = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await savePaymentSlip({
        ...info,
        rows: rows.map(({ description, cost, qty }) => ({ description, cost, qty })),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(true);
      // After the locked sheet has painted, so that is what reaches the printer.
      setTimeout(() => window.print(), 150);
    } catch {
      setError("Could not save the slip. Check the connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const totals = rows.map((r) => lineTotalPaisa(r.cost, r.qty));
  const grandTotal = totals.reduce<number>((sum, t) => sum + (t ?? 0), 0);
  const slipDate = formatSlipDate(info.date);

  // Serial numbers count only the lines that have something on them, so the
  // spare rows at the bottom print as empty space rather than as 5, 6, 7, 8.
  const serials: (number | null)[] = [];
  for (const row of rows) {
    const used = row.description.trim() || row.cost.trim() || row.qty.trim();
    serials.push(used ? serials.filter((s) => s !== null).length + 1 : null);
  }

  return (
    <div className="animate-rise">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          main { max-width: none !important; padding: 0 !important; }
          .slip-sheet {
            width: 210mm !important;
            max-width: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/super-admin/reception"
            className="text-xs font-bold text-primary underline-offset-4 transition-ui hover:underline"
          >
            ← Reception
          </Link>
          <h1 className="mt-1 text-xl font-extrabold">Payment slip</h1>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs font-bold text-ok" role="status">
              Saved
            </span>
          )}
          <button type="button" onClick={clear} disabled={saving} className={btnGhost}>
            {saved ? "New slip" : "Clear"}
          </button>
          {saved ? (
            <button type="button" onClick={() => window.print()} className={btnPrimary}>
              Print again
            </button>
          ) : (
            <button
              type="button"
              onClick={saveAndPrint}
              disabled={saving}
              className={btnPrimary}
            >
              {saving ? "Saving…" : "Save & print"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="no-print mx-auto mb-4 w-full max-w-[210mm] rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold"
        >
          {error}
        </p>
      )}

      <article
        style={PAPER}
        className="slip-sheet mx-auto w-full max-w-[210mm] overflow-hidden rounded-card border border-hairline bg-surface text-fg shadow-card"
      >
        <header className={`${BAND} px-6 pb-4 pt-6 sm:px-10`}>
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- must be in
                the document before window.print() fires, not lazy-loaded */}
            <img
              src="/brand/mark-v2.png"
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
            />
            <div className="min-w-0 flex-1 text-center">
              <p className="font-display text-2xl font-bold leading-tight sm:text-[28px]">
                DermaSoul Medical Aesthetics
              </p>
              <p className="mt-1 text-[11px] text-muted">{CLINIC_ADDRESS}</p>
              <p className="text-[11px] tabular-nums text-muted">{CLINIC_PHONE}</p>
            </div>
            {/* Balances the logo so the name sits on the sheet's centre line. */}
            <div aria-hidden className="hidden w-16 shrink-0 sm:block print:block" />
          </div>
          <p className="mt-4 text-center text-lg font-extrabold uppercase tracking-[0.08em] text-primary">
            Payment Slip
          </p>
        </header>

        <div className="px-6 pb-10 pt-6 sm:px-10">
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-12 print:grid-cols-12">
            <p className="col-span-2 text-[13px] italic text-muted sm:col-span-6 print:col-span-6">
              Patient Information:
            </p>
            <label className="flex min-w-0 items-end gap-1.5 sm:col-span-3 print:col-span-3">
              <span className="shrink-0 text-[13px] italic text-muted">Date:</span>
              <input
                type="date"
                value={info.date}
                readOnly={saved} onChange={setField("date")}
                className={`${lineInput} print:hidden`}
              />
              {/* Paper gets plain text: a native date box prints its picker. */}
              <span className={`${lineInput} hidden min-h-[1.6em] print:block`}>
                {slipDate}
              </span>
            </label>
            <LineField
              label="Receipt No"
              value={info.receiptNo}
              readOnly={saved} onChange={setField("receiptNo")}
              className="sm:col-span-3 print:col-span-3"
            />

            <LineField
              label="Name"
              value={info.name}
              readOnly={saved} onChange={setField("name")}
              className="col-span-2 sm:col-span-6 print:col-span-6"
            />
            <LineField
              label="Age"
              value={info.age}
              readOnly={saved} onChange={setField("age")}
              className="sm:col-span-3 print:col-span-3"
            />
            <LineField
              label="Gender"
              value={info.gender}
              readOnly={saved} onChange={setField("gender")}
              list="slip-genders"
              className="sm:col-span-3 print:col-span-3"
            />
            <datalist id="slip-genders">
              <option value="Male" />
              <option value="Female" />
              <option value="Other" />
            </datalist>

            <LineField
              label="Address"
              value={info.address}
              readOnly={saved} onChange={setField("address")}
              className="col-span-2 sm:col-span-6 print:col-span-6"
            />
            <LineField
              label="Phone"
              type="tel"
              value={info.phone}
              readOnly={saved} onChange={setField("phone")}
              className="col-span-2 sm:col-span-6 print:col-span-6"
            />
          </div>

          <div className="mt-6 overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
              <thead>
                <tr className={`${BAND} text-[11px] font-bold`}>
                  <th className={`${cellBorder} w-12 px-1 py-2`}>SL. No</th>
                  <th className={`${cellBorder} px-2 py-2`}>
                    Description of
                    <br />
                    Service / medicine / products
                  </th>
                  <th className={`${cellBorder} w-24 px-2 py-2`}>Cost</th>
                  <th className={`${cellBorder} w-20 px-2 py-2`}>Quantity</th>
                  <th className={`${cellBorder} w-28 px-2 py-2`}>Total</th>
                  <th className="no-print w-7" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const total = totals[i];
                  return (
                    <tr key={row.id} className="break-inside-avoid">
                      <td className={`${cellBorder} px-1 py-1.5 text-center align-top tabular-nums text-muted`}>
                        {serials[i] ?? ""}
                      </td>
                      <td className={`${cellBorder} align-top`}>
                        <textarea
                          rows={1}
                          value={row.description}
                          readOnly={saved} onChange={(e) => setCell(row.id, "description", e.target.value)}
                          aria-label={`Description, row ${i + 1}`}
                          className={`${cellInput} field-sizing-content resize-none`}
                        />
                      </td>
                      <td className={`${cellBorder} align-top`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={row.cost}
                          readOnly={saved} onChange={(e) => setCell(row.id, "cost", e.target.value)}
                          aria-label={`Cost, row ${i + 1}`}
                          className={`${cellInput} text-right tabular-nums`}
                        />
                      </td>
                      <td className={`${cellBorder} align-top`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={row.qty}
                          readOnly={saved} onChange={(e) => setCell(row.id, "qty", e.target.value)}
                          aria-label={`Quantity, row ${i + 1}`}
                          className={`${cellInput} text-center tabular-nums`}
                        />
                      </td>
                      <td className={`${cellBorder} px-2 py-1.5 text-right align-top font-semibold tabular-nums`}>
                        {total !== null ? formatPaisa(total) : ""}
                      </td>
                      <td className="no-print text-center align-middle">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={saved || rows.length === 1}
                          aria-label={`Remove row ${i + 1}`}
                          title="Remove row"
                          className="rounded px-1.5 text-base leading-none text-muted hover:text-[#be123c] disabled:opacity-30"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="break-inside-avoid">
                  <td colSpan={2} />
                  <td colSpan={2} className={`${cellBorder} ${BAND} px-2 py-2 text-center text-xs font-bold`}>
                    Total
                  </td>
                  <td className={`${cellBorder} ${BAND} px-2 py-2 text-right font-extrabold tabular-nums`}>
                    {grandTotal > 0 ? formatPaisa(grandTotal) : ""}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>

          <button
            type="button"
            onClick={addRow}
            hidden={saved}
            className="no-print mt-2 text-xs font-bold text-primary underline-offset-4 hover:underline"
          >
            + Add row
          </button>

          <div className="mt-5 flex items-end gap-1.5 break-inside-avoid">
            <span className="shrink-0 text-[13px] italic text-muted">Amount (in word):</span>
            <span className="min-h-[1.6em] flex-1 border-b border-dotted border-fg/50 px-1 py-0.5 text-[13.5px] font-semibold">
              {amountInWords(grandTotal)}
            </span>
          </div>

          <div className="mt-20 break-inside-avoid">
            {/* Left blank on purpose: signed by hand once the slip is printed. */}
            <div className="w-52 border-t border-fg/60 pt-1 text-center text-xs italic text-muted">
              Authorised signature
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
