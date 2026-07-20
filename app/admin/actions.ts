"use server";

import {
  revalidatePath,
} from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase =
    await createServerSupabaseClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}