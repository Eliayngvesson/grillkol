"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(
    formData.get("email") ?? "",
  ).trim();

  const password = String(
    formData.get("password") ?? "",
  );

  if (!email || !password) {
    return {
      error:
        "Fyll i både e-postadress och lösenord.",
    };
  }

  const supabase =
    await createServerSupabaseClient();

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

  const redirectPath = String(
    formData.get("redirect") ?? "/admin",
  );

  if (!redirectPath.startsWith("/admin")) {
    redirect("/admin");
  }

  redirect(redirectPath);
}