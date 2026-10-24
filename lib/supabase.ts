import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL saknas. Kontrollera filen .env.local.",
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY saknas. Kontrollera filen .env.local.",
  );
}

/*
 * Browser-klienten måste använda samma cookie-baserade session som
 * inloggningen och admin-layouten. createBrowserClient från @supabase/ssr
 * gör att UPDATE-anrop skickas som den inloggade användaren i stället för
 * som anonym användare.
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey,
);
