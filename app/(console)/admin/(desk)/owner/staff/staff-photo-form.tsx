"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import ImageInput from "@/components/image-input";
import { btnGhost, btnPrimary, btnQuiet } from "@/components/ui";
import { setStaffPhoto, type StaffState } from "../actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${btnPrimary} px-4 py-2`}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

/**
 * "Photo" in the staff list: change or remove someone's profile picture. A
 * modal dialog rather than a popover, because the table scrolls sideways and
 * would clip anything that hangs out of it.
 */
export default function StaffPhotoForm({
  staffId,
  name,
  photoUrl,
}: {
  staffId: string;
  name: string;
  photoUrl: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<StaffState, FormData>(setStaffPhoto, {});

  // Close once saved; the list behind it has already re-rendered.
  useEffect(() => {
    if (state.notice) dialog.current?.close();
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={btnQuiet}>
        Photo
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,26rem)] rounded-card border border-hairline bg-surface p-0 text-left text-fg shadow-lift backdrop:bg-black/40"
      >
        <form action={action} key={state.notice ?? "editing"} className="space-y-5 p-6">
          <h2 className="text-lg font-extrabold">Photo of {name}</h2>
          <input type="hidden" name="staff_id" value={staffId} />
          <ImageInput name="photo" label="Profile photo" round currentUrl={photoUrl} />
          {state.error && <p className="text-sm font-semibold text-danger">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className={`${btnGhost} px-4 py-2`}>
              Cancel
            </button>
            <Save />
          </div>
        </form>
      </dialog>
    </>
  );
}
