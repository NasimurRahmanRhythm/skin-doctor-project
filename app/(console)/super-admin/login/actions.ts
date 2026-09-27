"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  step: "email" | "code";
  email: string;
  error?: string;
  notice?: string;
};

const emailSchema = z.string().trim().toLowerCase().email();
const codeSchema = z.string().trim().regex(/^\d{6}$/);

export async function sendCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { step: "email", email: "", error: "Enter a valid email address." };
  }
  const email = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Staff accounts are created by the owner. Nobody signs themselves up.
    options: { shouldCreateUser: false },
  });

  if (error) {
    // Supabase rejects unknown addresses here. Saying so plainly does reveal
    // whether an address is staff, but the alternative — pretending to send —
    // leaves someone who mistyped their email waiting at a busy front desk.
    const unknown =
      error.message.toLowerCase().includes("signups not allowed") ||
      error.status === 422;

    return {
      step: "email",
      email,
      error: unknown
        ? "That email isn't registered as staff. Ask the owner to add you."
        : error.message,
    };
  }

  return {
    step: "code",
    email,
    notice: `We sent a 6-digit code to ${email}.`,
  };
}

export async function verifyCode(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? prev.email);
  const parsed = codeSchema.safeParse(formData.get("code"));

  if (!parsed.success) {
    return { step: "code", email, error: "Enter the 6-digit code." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });

  if (error) {
    return {
      step: "code",
      email,
      error: "That code is wrong or has expired. Request a new one.",
    };
  }

  // /super-admin reads the role and forwards to the right desk.
  redirect("/super-admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/super-admin/login");
}
