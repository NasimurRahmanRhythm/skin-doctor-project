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
import { addEntry, type EntryState } from "../actions";

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
