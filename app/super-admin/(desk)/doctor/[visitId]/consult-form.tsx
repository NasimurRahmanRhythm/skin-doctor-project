"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  field,
  fieldLabel,
  SectionHead,
} from "@/components/ui";
import { compressImage, formatBytes } from "@/lib/compress-image";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";
import {
  addEntry,
  saveConsultation,
  type ConsultState,
  type EntryState,
} from "../actions";

function Submit({
  label,
  busy,
  variant = "primary",
}: {
  label: string;
  busy: string;
  variant?: "primary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={variant === "primary" ? btnPrimary : btnGhost}
    >
      {pending ? busy : label}
    </button>
  );
}

export function ConsultForm({
  visitId,
  initial,
  completed,
}: {
  visitId: string;
  initial: {
    diagnosis: string | null;
    prescription: string | null;
    advice: string | null;
    follow_up_date: string | null;
  };
  completed: boolean;
}) {
  const [state, action] = useActionState<ConsultState, FormData>(saveConsultation, {});

  return (
    <form action={action} className={`${card} ${cardPad}`}>
      <input type="hidden" name="visit_id" value={visitId} />
      <SectionHead
        title="Consultation"
        trailing={
          completed ? (
            <span className="rounded-full border border-ok/40 bg-ok/10 px-2.5 py-0.5 text-[11px] font-medium text-ok">
              Completed
            </span>
          ) : undefined
        }
      />

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="diagnosis" className={fieldLabel}>
            Diagnosis
          </label>
          <textarea
            id="diagnosis"
            name="diagnosis"
            rows={2}
            defaultValue={initial.diagnosis ?? ""}
            placeholder="Contact dermatitis, both forearms"
            className={`${field} mt-1.5 resize-y`}
          />
        </div>

        <div>
          <label htmlFor="prescription" className={fieldLabel}>
            Prescription
          </label>
          <textarea
            id="prescription"
            name="prescription"
            rows={5}
            defaultValue={initial.prescription ?? ""}
            placeholder={
              "Mometasone 0.1% cream — thin layer, twice daily, 10 days\nCetirizine 10mg — one at night, 7 days"
            }
            className={`${field} mt-1.5 resize-y font-mono text-[13px] leading-relaxed`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="advice" className={fieldLabel}>
              Advice
            </label>
            <textarea
              id="advice"
              name="advice"
              rows={3}
              defaultValue={initial.advice ?? ""}
              className={`${field} mt-1.5 resize-y`}
            />
          </div>
          <div>
            <label htmlFor="follow_up_date" className={fieldLabel}>
              Follow-up date
            </label>
            <input
              id="follow_up_date"
              name="follow_up_date"
              type="date"
              defaultValue={initial.follow_up_date ?? ""}
              className={`${field} mt-1.5`}
            />
          </div>
        </div>
      </div>

      {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}
      {state.saved && !state.error && (
        <p className="mt-4 text-sm text-ok">Saved.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Submit label="Save" busy="Saving…" variant="ghost" />
        {!completed && (
          <button type="submit" name="complete" value="1" className={btnPrimary}>
            Save &amp; complete visit
          </button>
        )}
      </div>
    </form>
  );
}

export function EntryForm({ visitId }: { visitId: string }) {
  const [state, action] = useActionState<EntryState, FormData>(addEntry, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  /**
   * Compress on pick, then write the smaller file back into the input via a
   * DataTransfer. The form then submits the compressed file with no change to
   * the server action.
   */
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    setFileError(null);

    if (!picked) {
      setFileNote(null);
      return;
    }

    // Checked against the original, so the rule is the same one reception is
    // told: nothing over 10 MB, whatever it compresses down to.
    if (picked.size > MAX_UPLOAD_BYTES) {
      setFileError(
        `"${picked.name}" is ${formatBytes(picked.size)} — over the ${MAX_UPLOAD_LABEL} limit.`,
      );
      e.target.value = "";
      setFileNote(null);
      return;
    }

    setWorking(true);
    const shrunk = await compressImage(picked);
    setWorking(false);

    if (shrunk !== picked && fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(shrunk);
      fileRef.current.files = dt.files;
      setFileNote(
        `${picked.name} — ${formatBytes(picked.size)} compressed to ${formatBytes(shrunk.size)}`,
      );
    } else {
      setFileNote(`${picked.name} — ${formatBytes(picked.size)}`);
    }
  }

  return (
    <form
      action={action}
      className={`${card} ${cardPad} bg-subtle`}
      key={state.saved ? "saved" : "editing"}
    >
      <input type="hidden" name="visit_id" value={visitId} />
      <SectionHead
        title="Add to the record"
        hint="Lab reports, photos or a note. Files stay private and are only ever served through a short-lived link."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className={fieldLabel}>
            Type
          </label>
          <select id="type" name="type" defaultValue="report" className={`${field} mt-1.5`}>
            <option value="report">Report</option>
            <option value="prescription">Prescription</option>
            <option value="note">Note</option>
            <option value="file">Other file</option>
          </select>
        </div>
        <div>
          <label htmlFor="title" className={fieldLabel}>
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="CBC — 24 Sept"
            className={`${field} mt-1.5`}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="body" className={fieldLabel}>
          Notes
        </label>
        <textarea id="body" name="body" rows={3} className={`${field} mt-1.5 resize-y`} />
      </div>

      <div className="mt-4">
        <label htmlFor="file" className={fieldLabel}>
          Attach a file{" "}
          <span className="font-normal">
            (optional, max {MAX_UPLOAD_LABEL})
          </span>
        </label>
        <input
          ref={fileRef}
          id="file"
          name="file"
          type="file"
          onChange={onPick}
          className={`${field} mt-1.5 bg-surface file:mr-3 file:rounded-control file:border-0 file:bg-subtle file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fg hover:file:bg-hairline`}
        />
        {working && <p className="mt-1.5 text-xs text-muted">Compressing…</p>}
        {!working && fileNote && (
          <p className="mt-1.5 text-xs text-muted">{fileNote}</p>
        )}
        {fileError && <p className="mt-1.5 text-xs text-danger">{fileError}</p>}
        <p className="mt-1.5 text-xs text-muted">
          Photos are resized before upload so the clinic does not run out of
          storage.
        </p>
      </div>

      {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}
      {state.saved && !state.error && <p className="mt-4 text-sm text-ok">Added.</p>}

      <div className="mt-5">
        <Submit label="Add to record" busy="Saving…" />
      </div>
    </form>
  );
}
