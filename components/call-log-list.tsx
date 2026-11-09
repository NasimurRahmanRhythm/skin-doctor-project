import Link from "next/link";
import type { ReactNode } from "react";
import {
  btnGhost,
  btnPrimary,
  btnQuiet,
  card,
  cardPad,
  EmptyState,
  field,
  SectionHead,
  tableEl,
  tableWrap,
  tdCell,
  thCell,
  trRow,
} from "@/components/ui";
import {
  CALL_TYPES,
  optionLabel,
  telHref,
  whatsappHref,
  type CallLog,
  type CallOptions,
} from "@/lib/call-log";
import { callFilterParams, type CallFilters } from "@/lib/call-log-query";
import ConfirmForm from "@/components/confirm-form";
import { formatClinicDate, formatClinicTime, formatDateOfBirth } from "@/lib/clinic";

export const CALLS_PER_PAGE = 30;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control border border-hairline bg-subtle/50 px-4 py-3">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="mt-1 block text-2xl font-extrabold tabular leading-none">{value}</span>
    </div>
  );
}

/**
 * A list of logged calls: the counts, the filters, the table and its pages.
 * The agent's page shows only their own calls; the owner's shows everyone's,
 * with an Agent column and filter, a delete button and the CSV export.
 */
export default function CallLogList({
  title,
  hint,
  basePath,
  rows,
  stats,
  filters,
  page,
  total,
  agents,
  agentNameById,
  deleteAction,
  referAction,
  options,
  trailing,
}: {
  title: string;
  hint?: string;
  basePath: string;
  rows: CallLog[];
  stats: { total: number; today: number; sold: number; due: number };
  filters: CallFilters;
  page: number;
  total: number;
  /** The owner's agent filter; left out on an agent's own page. */
  agents?: { id: string; full_name: string }[];
  agentNameById?: Map<string, string>;
  /** The owner's delete; left out on an agent's own page. */
  deleteAction?: (formData: FormData) => Promise<void>;
  /** The owner's Reason and Outcome lists, for labels and the outcome filter. */
  options: CallOptions;
  /** "Send to reception": hands the caller over to the clinic's front desk. */
  referAction: (formData: FormData) => Promise<void>;
  trailing?: ReactNode;
}) {
  const lastPage = Math.max(1, Math.ceil(total / CALLS_PER_PAGE));
  const href = (p: number) => {
    const qs = callFilterParams(filters, p);
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const filtering = Object.values(filters).some(Boolean);
  const showAgent = Boolean(agentNameById);

  return (
    <section className={`${card} ${cardPad}`}>
      <SectionHead title={title} hint={hint} trailing={trailing} />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total calls" value={stats.total} />
        <Stat label="Today" value={stats.today} />
        <Stat label="Sold" value={stats.sold} />
        <Stat label="Follow-ups due" value={stats.due} />
      </div>

      <form
        action={basePath}
        className={`mt-5 grid gap-3 sm:grid-cols-2 ${agents ? "lg:grid-cols-[1.6fr_1fr_1fr_0.9fr_0.9fr_auto]" : "lg:grid-cols-[1.6fr_1fr_0.9fr_0.9fr_auto]"}`}
      >
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Search name, phone, product, notes"
          aria-label="Search"
          className={field}
        />
        {agents && (
          <select name="agent" defaultValue={filters.agent} aria-label="Agent" className={field}>
            <option value="">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        )}
        <select name="outcome" defaultValue={filters.outcome} aria-label="Outcome" className={field}>
          <option value="">All outcomes</option>
          {options.outcomes.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={filters.from} aria-label="From date" className={field} />
        <input type="date" name="to" defaultValue={filters.to} aria-label="To date" className={field} />
        <div className="flex gap-2">
          <button type="submit" className={btnPrimary}>
            Filter
          </button>
          {filtering && (
            <Link href={basePath} className={btnGhost}>
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState
            title={filtering ? "No calls match" : "No calls logged yet"}
            hint={
              filtering
                ? "Try a different search or date range."
                : showAgent
                  ? "Calls appear here as the call center logs them."
                  : "Fill in the form above and save."
            }
          />
        ) : (
          <div className={tableWrap}>
            <table className={`${tableEl} min-w-[1380px]`}>
              <thead>
                <tr>
                  <th className={`${thCell} rounded-tl-card`}>Date / time</th>
                  {showAgent && <th className={thCell}>Agent</th>}
                  <th className={thCell}>Customer</th>
                  <th className={thCell}>Phone</th>
                  <th className={thCell}>Type</th>
                  <th className={thCell}>Reason</th>
                  <th className={thCell}>Product</th>
                  <th className={thCell}>Outcome</th>
                  <th className={thCell}>Min</th>
                  <th className={thCell}>Follow-up</th>
                  <th className={thCell}>Notes</th>
                  <th className={`${thCell} ${deleteAction ? "" : "rounded-tr-card"}`}>Reception</th>
                  {deleteAction && <th className={`${thCell} rounded-tr-card`} aria-label="Delete" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className={trRow}>
                    <td className={`${tdCell} whitespace-nowrap`}>
                      <span className="font-semibold">{formatClinicDate(c.created_at)}</span>
                      <span className="block text-xs text-muted">{formatClinicTime(c.created_at)}</span>
                    </td>
                    {showAgent && (
                      <td className={`${tdCell} whitespace-nowrap font-semibold`}>
                        {agentNameById?.get(c.agent_id) ?? "Unknown"}
                      </td>
                    )}
                    <td className={`${tdCell} min-w-36 font-semibold`}>{c.customer_name}</td>
                    <td className={`${tdCell} whitespace-nowrap tabular`}>
                      <a href={telHref(c.phone)} className="font-semibold text-primary hover:underline" title="Call">
                        {c.phone}
                      </a>
                      {whatsappHref(c.phone) && (
                        <a
                          href={whatsappHref(c.phone)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block text-xs font-bold text-ok hover:underline"
                        >
                          WhatsApp ↗
                        </a>
                      )}
                    </td>
                    <td className={tdCell}>{optionLabel(CALL_TYPES, c.call_type)}</td>
                    <td className={tdCell}>{optionLabel(options.reasons, c.reason)}</td>
                    <td className={tdCell}>{c.product || "—"}</td>
                    <td className={`${tdCell} whitespace-nowrap font-semibold`}>
                      {optionLabel(options.outcomes, c.outcome)}
                    </td>
                    <td className={`${tdCell} tabular`}>
                      {c.duration_min != null ? Number(c.duration_min) : "—"}
                    </td>
                    <td className={`${tdCell} whitespace-nowrap`}>
                      {c.follow_up_date ? formatDateOfBirth(c.follow_up_date) : "—"}
                    </td>
                    <td className={`${tdCell} min-w-52 max-w-72`}>
                      {c.notes && <p className="whitespace-pre-line break-words text-muted">{c.notes}</p>}
                      {c.recording_url && (
                        <a
                          href={c.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-bold text-primary hover:underline"
                        >
                          Recording ↗
                        </a>
                      )}
                      {!c.notes && !c.recording_url && "—"}
                    </td>
                    <td className={`${tdCell} whitespace-nowrap`}>
                      {c.referred_at ? (
                        <span className="text-xs font-bold text-ok">
                          ✓ Sent
                          <span className="block font-medium text-muted">
                            {formatClinicDate(c.referred_at)}, {formatClinicTime(c.referred_at)}
                          </span>
                        </span>
                      ) : (
                        <ConfirmForm
                          action={referAction}
                          message={`Send ${c.customer_name} to reception? Every receptionist gets an alert that opens check-in with this name and number.`}
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-xs font-bold text-primary hover:underline">
                            Send to reception →
                          </button>
                        </ConfirmForm>
                      )}
                    </td>
                    {deleteAction && (
                      <td className={`${tdCell} text-right`}>
                        <ConfirmForm
                          action={deleteAction}
                          message={`Delete the call with ${c.customer_name}? This cannot be undone.`}
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className={`${btnQuiet} hover:text-danger`}>
                            Delete
                          </button>
                        </ConfirmForm>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={href(page - 1)} className={btnGhost}>
              ← Previous
            </Link>
          ) : (
            <span className={`${btnGhost} pointer-events-none opacity-40`}>← Previous</span>
          )}
          <span className="text-xs font-bold tabular text-muted">
            Page {page} of {lastPage}
          </span>
          {page < lastPage ? (
            <Link href={href(page + 1)} className={btnGhost}>
              Next →
            </Link>
          ) : (
            <span className={`${btnGhost} pointer-events-none opacity-40`}>Next →</span>
          )}
        </nav>
      )}
    </section>
  );
}
