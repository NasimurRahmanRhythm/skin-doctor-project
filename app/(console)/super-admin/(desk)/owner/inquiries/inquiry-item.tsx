"use client";

import { useState, useTransition } from "react";
import { btnQuiet } from "@/components/ui";
import { deleteInquiry, markInquiryRead, setInquiryRead } from "./actions";

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean;
  when: string;
};

/** One inquiry: a summary line that opens to the full message. */
export default function InquiryItem({ inquiry: q }: { inquiry: Inquiry }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const firstLine = q.message.split("\n").find((l) => l.trim()) ?? "";

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !q.is_read) start(() => markInquiryRead(q.id));
  }

  const reply = `mailto:${q.email}?subject=${encodeURIComponent("Re: your inquiry to DermaSoul Medical Aesthetics")}`;

  return (
    <li className={`py-1 ${q.is_read ? "" : "font-semibold"}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 rounded-control px-2 py-3 -mx-2 text-left transition-ui hover:bg-subtle"
      >
        <span
          aria-label={q.is_read ? undefined : "Unread"}
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${q.is_read ? "bg-transparent" : "bg-primary"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={q.is_read ? "font-semibold" : "font-extrabold"}>{q.name}</span>
            <span className="text-xs font-medium text-muted">{q.email}</span>
            {q.phone && <span className="text-xs font-medium text-muted tabular-nums">{q.phone}</span>}
          </span>
          {!open && <span className="mt-0.5 block truncate text-sm font-normal text-muted">{firstLine}</span>}
        </span>
        <span className="shrink-0 text-xs font-medium text-muted">{q.when}</span>
      </button>

      {open && (
        <div className="mb-3 ml-5 rounded-control border border-hairline bg-subtle px-4 py-3 font-normal">
          <p className="whitespace-pre-line text-sm leading-relaxed">{q.message}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a href={reply} className="text-sm font-bold text-primary hover:underline">
              Reply by email
            </a>
            {q.phone && (
              <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} className="text-sm font-bold text-primary hover:underline">
                Call {q.phone}
              </a>
            )}
            <form action={setInquiryRead}>
              <input type="hidden" name="id" value={q.id} />
              <input type="hidden" name="read" value="0" />
              <button type="submit" className={btnQuiet}>
                Mark unread
              </button>
            </form>
            <form
              action={deleteInquiry}
              onSubmit={(e) => {
                if (!confirm(`Delete the inquiry from ${q.name}?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={q.id} />
              <button type="submit" className={`${btnQuiet} hover:text-danger`}>
                Delete
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
