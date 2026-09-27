import Link from "next/link";
import { PadSummary } from "@/components/rx-pad";
import { card, cardPad, Code, SectionHead, StatusPill } from "@/components/ui";
import { formatClinicDate } from "@/lib/clinic";
import { PAD_COLUMNS, readPad, type PadSource } from "@/lib/prescription";
import { createClient } from "@/lib/supabase/server";

/**
 * This patient's earlier visits, newest first, each one closed until the
 * doctor opens it to read that day's prescription.
 *
 * A native <details> per visit, so opening one needs no client code and the
 * pad below stays the only interactive thing on the page. Every earlier visit
 * shows, whichever doctor saw it: RLS lets a doctor read the full history of a
 * patient they are seeing.
 */
export default async function PreviousVisits({
  patientId,
  currentVisitId,
}: {
  patientId: string;
  currentVisitId: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visits")
    .select(`id, visit_code, status, created_at, doctor_id, ${PAD_COLUMNS}`)
    .eq("patient_id", patientId)
    .neq("id", currentVisitId)
    .order("created_at", { ascending: false });

  const visits = data ?? [];

  const doctorIds = [...new Set(visits.map((v) => v.doctor_id).filter(Boolean))] as string[];
  const { data: doctors } = doctorIds.length
    ? await supabase.from("staff_directory").select("id, full_name").in("id", doctorIds)
    : { data: [] };
  const doctorName = new Map((doctors ?? []).map((d) => [d.id as string, d.full_name as string]));

  return (
    <section className={`${card} ${cardPad} no-print`}>
      <SectionHead
        title="Previous visits"
        hint={
          visits.length
            ? "Open a visit to read what was prescribed."
            : "First visit — there is no earlier prescription."
        }
        trailing={
          visits.length ? (
            <span className="rounded-full bg-subtle px-3 py-1 text-xs font-bold text-muted">
              {visits.length}
            </span>
          ) : undefined
        }
      />

      {visits.length > 0 && (
        <ul className="mt-4 space-y-2">
          {visits.map((v) => {
            const pad = readPad(v as unknown as PadSource);
            // Judged on what was saved, not on the pad as read: an unwritten
            // pad comes back pre-filled from reception and the nurse.
            const written = Boolean(
              v.complaints || v.medicines || v.advices || v.investigations,
            );
            // Free-text Rx from before the pad existed.
            const legacy = !written ? (v.prescription as string | null) : null;
            const medCount = pad.medicines.length;

            return (
              <li key={v.id}>
                <details className="group rounded-control border border-hairline bg-surface transition-ui open:border-primary/40 open:shadow-card">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 transition-ui hover:bg-primary-soft/40 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className="text-muted transition-transform group-open:rotate-90"
                      >
                        ▸
                      </span>
                      <span className="min-w-0">
                        <span className="font-bold">{formatClinicDate(v.created_at)}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          <Code>{v.visit_code}</Code>
                          {v.doctor_id && doctorName.get(v.doctor_id) && (
                            <> · {doctorName.get(v.doctor_id)}</>
                          )}
                          {medCount > 0 && (
                            <> · {medCount} {medCount === 1 ? "medicine" : "medicines"}</>
                          )}
                        </span>
                      </span>
                    </span>
                    <StatusPill status={v.status} />
                  </summary>

                  <div className="border-t border-hairline px-4 py-4">
                    {written ? (
                      <PadSummary pad={pad} />
                    ) : legacy ? (
                      <p className="whitespace-pre-wrap text-sm">{legacy}</p>
                    ) : (
                      <p className="text-sm text-muted">Nothing was written on this visit.</p>
                    )}
                    <Link
                      href={`/super-admin/print/${v.id}`}
                      target="_blank"
                      className="mt-4 inline-block text-xs font-bold text-primary underline-offset-4 transition-ui hover:underline"
                    >
                      Print this prescription
                    </Link>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
