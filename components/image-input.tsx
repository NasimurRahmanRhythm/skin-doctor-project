"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { MAX_IMAGE_LABEL } from "@/lib/site-media";

/**
 * A picture picker with a preview, for forms that post to a server action.
 *
 * The chosen photo is shrunk in the browser first (a phone photo is 3–5 MB,
 * the same picture at 1600px is a few hundred KB) and put back into the file
 * input, so the form posts the small one. When editing, `currentUrl` is shown
 * until something else is picked; an optional picture can also be removed,
 * which posts `<name>_remove=1`.
 */
export default function ImageInput({
  name,
  label,
  required = false,
  currentUrl = null,
  round = false,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  currentUrl?: string | null;
  round?: boolean;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Object URLs hold the file in memory until revoked.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setBusy(true);
    const small = await compressImage(picked);
    setBusy(false);
    if (small !== picked && input.current) {
      const dt = new DataTransfer();
      dt.items.add(small);
      input.current.files = dt.files;
    }
    setPreview(URL.createObjectURL(small));
    setRemoved(false);
  }

  function clear() {
    if (input.current) input.current.value = "";
    setPreview(null);
    setRemoved(true);
  }

  const shown = preview ?? (removed ? null : currentUrl);
  // Required means "there must be a picture", which an existing one satisfies.
  const mustPick = required && !currentUrl;

  return (
    <div>
      <span className="block text-sm font-bold text-fg">
        {label}
        {!required && <span className="font-medium text-muted"> (optional)</span>}
      </span>
      <div className="mt-1.5 flex items-center gap-4">
        <div
          className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden border border-hairline bg-subtle text-[11px] font-semibold text-muted ${
            round ? "rounded-full" : "rounded-control"
          }`}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview blob
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : busy ? (
            "…"
          ) : (
            "No image"
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          <input
            ref={input}
            type="file"
            name={name}
            accept="image/jpeg,image/png,image/webp"
            required={mustPick}
            onChange={onPick}
            className="block w-full text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-control file:border file:border-hairline file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-fg hover:file:border-primary/50"
          />
          <p className="text-xs text-muted">
            {hint ?? `JPG, PNG or WebP, up to ${MAX_IMAGE_LABEL}.`}
          </p>
          {!required && shown && (
            <button
              type="button"
              onClick={clear}
              className="text-xs font-bold text-muted underline-offset-2 hover:text-danger hover:underline"
            >
              Remove image
            </button>
          )}
        </div>
      </div>
      {removed && <input type="hidden" name={`${name}_remove`} value="1" />}
    </div>
  );
}
