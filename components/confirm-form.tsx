"use client";

import type { ReactNode } from "react";

/** A form that asks before it submits, for a list rendered on the server. */
export default function ConfirmForm({
  action,
  message,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  message: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
