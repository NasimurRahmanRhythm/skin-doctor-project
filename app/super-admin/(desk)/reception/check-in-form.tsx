"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  btnGhost,
  btnPrimary,
  btnQuiet,
  card,
  cardPad,
  field as fieldBase,
  fieldLabel as label,
  SectionHead,
} from "@/components/ui";
import { clinicToday } from "@/lib/clinic";
import { compressImage, formatBytes } from "@/lib/compress-image";
import { SKIN_CONDITIONS, SKIN_TYPES } from "@/lib/skin";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";
import {
  checkIn,
  lookupPatient,
  type CheckInState,
  type PatientMatch,
} from "./actions";

const field = `${fieldBase} mt-1.5`;
const MAX_FILES = 5;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={btnPrimary}
    >
      {pending ? "Saving…" : "Check in & send to nurse"}
    </button>
  );
}

function CheckboxGroup({
  name,
  legend,
  options,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className={label}>
        {legend} <span className="text-muted">(tick all that apply)</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 rounded-control border border-hairline px-3 py-2 text-sm has-[:checked]:border-primary/50 has-[:checked]:bg-primary/8"
          >
            <input
              type="checkbox"
              name={name}
              value={o.value}
              className="accent-[var(--primary)]"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type Doctor = { id: string; full_name: string; specialty: string | null };

export default function CheckInForm({ doctors }: { doctors: Doctor[] }) {
  const [state, action] = useActionState<CheckInState, FormData>(checkIn, {});
  const [match, setMatch] = useState<PatientMatch>(null);
  const [, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  // Name and date of birth are held here rather than left uncontrolled,
  // because the phone lookup has to fill them in after they have already
  // rendered — and must never overwrite something the desk has typed.
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; size: number }[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  function onPhoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const phone = e.target.value;
    startTransition(async () => {
      const found = await lookupPatient(phone);
      setMatch(found);
      if (!found) return;
      setName((current) => (current.trim() ? current : found.full_name));
      setDob((current) => current || found.date_of_birth || "");
    });
  }

  /**
   * A phone photo of a rash is 3–5 MB. Shrinking it here, before the upload,
   * is what keeps the clinic inside its 1 GB of storage. PDFs pass through
   * untouched — a lab report must not be run through a canvas.
   *
   * Oversize files are dropped now rather than at submit: the desk finds out
   * while the patient is still standing there, not after a failed save.
   */
  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    setFileError(null);

    if (chosen.length === 0) {
      setPicked([]);
      return;
    }
    if (chosen.length > MAX_FILES) {
      setFileError(`Attach at most ${MAX_FILES} files.`);
      if (fileRef.current) fileRef.current.value = "";
      setPicked([]);
      return;
    }

    // Keep the files that fit and say which ones did not, rather than throwing
    // the whole selection away over one bad scan.
    const tooBig = chosen.filter((f) => f.size > MAX_UPLOAD_BYTES);
    const usable = chosen.filter((f) => f.size <= MAX_UPLOAD_BYTES);

    if (tooBig.length > 0) {
      setFileError(
        `${tooBig
          .map((f) => `"${f.name}" (${formatBytes(f.size)})`)
          .join(", ")} — over the ${MAX_UPLOAD_LABEL} limit, not attached.`,
      );
    }
    if (usable.length === 0) {
      if (fileRef.current) fileRef.current.value = "";
      setPicked([]);
      return;
    }

    setCompressing(true);
    const shrunk = await Promise.all(usable.map((f) => compressImage(f)));
    setCompressing(false);

    writeBack(shrunk);
  }

  /** Writes a list back into the input, so the form submits exactly these. */
  function writeBack(files: File[]) {
    if (!fileRef.current) return;
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    fileRef.current.files = dt.files;
    setPicked(files.map((f) => ({ name: f.name, size: f.size })));
  }

  function removeFile(index: number) {
    const current = Array.from(fileRef.current?.files ?? []);
    writeBack(current.filter((_, i) => i !== index));
  }

  if (state.success) {
    const s = state.success;
    return (
      <div className={`${card} ${cardPad} text-center`}>
        <p className="text-xs font-medium uppercase tracking-wider text-ok">Checked in</p>
        <h2 className="mt-1 text-xl font-semibold">Sent to the nurse</h2>

        <div className="my-6 inline-block rounded-control border border-dashed border-primary/45 bg-primary/8 px-7 py-3.5 font-mono text-2xl font-semibold tracking-tight text-primary">
          {s.visitCode}
        </div>

        <dl className="mx-auto max-w-sm space-y-1 text-sm text-muted">
          <div>
            {s.patientName} · {s.patientCode}{" "}
            <span className="text-fg">
              ({s.returning ? "returning" : "new"} patient)
            </span>
          </div>
          <div>
            Doctor: <span className="text-fg">{s.doctorName}</span>
          </div>
          {s.attachments.length > 0 && (
            <div>
              Attached:{" "}
              <span className="text-fg">{s.attachments.join(", ")}</span>
            </div>
          )}
        </dl>

        {s.fileWarning && (
          <p className="mx-auto mt-5 max-w-sm rounded-control border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
            {s.fileWarning} The check-in itself went through — do not check the
            patient in again; the doctor can attach it instead.
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMatch(null);
              setFormKey((k) => k + 1);
              window.location.reload();
            }}
            className={btnPrimary}
          >
            Check in another patient
          </button>
          <Link
            href={`/super-admin/print/${s.visitId}`}
            target="_blank"
            className={btnGhost}
          >
            Print slip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      key={formKey}
      action={action}
      className={`${card} ${cardPad}`}
    >
      <SectionHead
        title="Patient check-in"
        hint="Goes to the nurse for vitals, then on to the doctor."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="full_name" className={label}>
            Patient name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Farhana Islam"
            className={field}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="phone" className={label}>
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            onBlur={onPhoneBlur}
            placeholder="01711 744427"
            className={field}
          />
          {match && (
            <p className="mt-1.5 rounded-control border border-primary/35 bg-primary/8 px-3 py-2 text-xs text-primary">
              Returning patient — {match.full_name} · {match.patient_code} ·{" "}
              {match.visitCount} previous{" "}
              {match.visitCount === 1 ? "visit" : "visits"}. Their history stays
              under the same code.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="date_of_birth" className={label}>
            Date of birth
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            required
            min="1890-01-02"
            max={clinicToday()}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="email" className={label}>
            Email <span className="text-muted">(optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="farhana@example.com"
            className={field}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className={label}>
            Address <span className="text-muted">(optional)</span>
          </label>
          <input id="address" name="address" className={field} />
        </div>

        <CheckboxGroup name="skin_types" legend="Skin type" options={SKIN_TYPES} />

        <CheckboxGroup
          name="skin_conditions"
          legend="Skin condition"
          options={SKIN_CONDITIONS}
        />

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={label}>
            Notes <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Anything the nurse or doctor should know"
            className={`${field} resize-y`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="files" className={label}>
            Documents the patient brought{" "}
            <span className="text-muted">(optional)</span>
          </label>
          <input
            ref={fileRef}
            id="files"
            name="files"
            type="file"
            multiple
            accept="application/pdf,image/*"
            onChange={onFilesPicked}
            className={`${field} bg-surface file:mr-3 file:rounded-control file:border-0 file:bg-subtle file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fg hover:file:bg-hairline`}
          />

          {compressing && (
            <p className="mt-1.5 text-xs text-muted">Preparing files…</p>
          )}

          {!compressing && picked.length > 0 && (
            <ul className="mt-2 space-y-1">
              {picked.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-control border border-hairline px-3 py-1.5 text-xs"
                >
                  <span className="truncate">
                    {f.name}{" "}
                    <span className="text-muted">{formatBytes(f.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className={btnQuiet}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {fileError && <p className="mt-1.5 text-xs text-danger">{fileError}</p>}

          <p className="mt-1.5 text-xs text-muted">
            Old prescriptions, lab reports or photos — PDF or image, up to{" "}
            {MAX_FILES} files, {MAX_UPLOAD_LABEL} each. Photos are shrunk
            before upload. The doctor sees them on this visit.
          </p>
        </div>


        <div className="sm:col-span-2">
          <label htmlFor="preferred_doctor" className={label}>
            Doctor
          </label>
          <select
            id="preferred_doctor"
            name="preferred_doctor"
            defaultValue="any"
            className={field}
          >
            <option value="any">First available — shortest queue</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
                {d.specialty ? ` — ${d.specialty}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            The doctor&rsquo;s name goes on the printed pad.
          </p>
        </div>
      </div>

      {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}

      <div className="mt-6">
        <SubmitButton />
      </div>
    </form>
  );
}
