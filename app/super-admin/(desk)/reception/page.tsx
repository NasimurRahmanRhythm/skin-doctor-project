import Link from "next/link";
import {
  card,
  cardPad,
  Code,
  SectionHead,
  StatusPill,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { clinicDayRange, formatClinicTime } from "@/lib/clinic";
import { createClient } from "@/lib/supabase/server";
import CheckInForm from "./check-in-form";

export default async function ReceptionPage() {
  const staff = await requireRole("receptionist");
  const supabase = await createClient();
  const { start, end } = clinicDayRange();

  const [{ data: doctors }, { data: todays }] = await Promise.all([
    supabase
      .from("staff_directory")
      .select("id, full_name, specialty")
      .eq("role", "doctor")
      .eq("is_active", true)
      .order("full_name"),
    // RLS already limits this to visits this receptionist created; the date
    // range narrows it to today so the list stays short at a busy desk.
    supabase
      .from("visits")
      .select(
        "id, visit_code, status, visit_type, created_at, patients(full_name, patient_code)",
      )
      .eq("receptionist_id", staff.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false }),
  ]);

  // What this desk attached at check-in, so it can confirm a scan landed.
  // RLS limits this to entries this receptionist wrote — clinical notes on the
  // same visits stay invisible here.
  const visitIds = (todays ?? []).map((v) => v.id);
  const { data: attachments } = visitIds.length
    ? await supabase
        .from("visit_entries")
        .select("visit_id, file_name")
        .in("visit_id", visitIds)
    : { data: [] };

  const filesByVisit = new Map<string, string[]>();
  for (const a of attachments ?? []) {
    if (!a.file_name) continue;
    filesByVisit.set(a.visit_id, [
      ...(filesByVisit.get(a.visit_id) ?? []),
      a.file_name,
    ]);
  }

  return (
    <div className="animate-rise space-y-6">
      <CheckInForm doctors={doctors ?? []} />

      <section className={`${card} ${cardPad}`}>
        <SectionHead
          title="Your check-ins today"
          hint={
            todays?.length
              ? "Reprint a slip or read a code back over the phone."
              : "Nothing checked in yet today."
          }
          trailing={
            todays?.length ? (
              <span className="rounded-full bg-subtle px-3 py-1 text-xs font-bold text-muted">
                {todays.length} today
              </span>
            ) : undefined
          }
        />

        {todays && todays.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {todays.map((v) => {
              const patient = Array.isArray(v.patients)
                ? v.patients[0]
                : v.patients;
              const files = filesByVisit.get(v.id) ?? [];
              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-hairline bg-surface px-4 py-3 transition-ui hover:border-primary/55 hover:bg-primary-soft/40"
                >
                  <div className="min-w-0">
                    <span className="font-bold">{patient?.full_name ?? "—"}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      <Code>{v.visit_code}</Code>
                      <span className="mx-1.5">·</span>
                      {formatClinicTime(v.created_at)}
                      <span className="mx-1.5">·</span>
                      {v.visit_type}
                    </span>
                    {files.length > 0 && (
                      <span
                        className="mt-1 block text-xs font-semibold text-accent"
                        title={files.join(", ")}
                      >
                        {files.length} file{files.length === 1 ? "" : "s"}{" "}
                        attached
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusPill status={v.status} />
                    <Link
                      href={`/super-admin/print/${v.id}?scope=reception`}
                      target="_blank"
                      className="text-xs font-bold text-primary underline-offset-4 transition-ui hover:underline"
                    >
                      Print
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
