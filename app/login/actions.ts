"use server";

import { redirect } from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function login(
  previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  void previousState;

  const emailValue =
    formData.get("email");

  const passwordValue =
    formData.get("password");

  const redirectValue =
    formData.get("redirect");

  const email =
    typeof emailValue === "string"
      ? emailValue.trim()
      : "";

  const password =
    typeof passwordValue === "string"
      ? passwordValue
      : "";

  const requestedRedirect =
    typeof redirectValue === "string"
      ? redirectValue
      : "/admin";

  const redirectPath =
    requestedRedirect.startsWith("/") &&
    !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/admin";

  if (!email || !password) {
    return {
      error:
        "Fyll i både e-postadress och lösenord.",
    };
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    return {
      error:
        "Fel e-postadress eller lösenord.",
    };
  }

  redirect(redirectPath);
}