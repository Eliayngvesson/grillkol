import { redirect } from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

import LoginForm from "./login-form";
import styles from "./page.module.css";

type LoginPageProps = {
  searchParams: Promise<{
    redirect?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;

  const requestedRedirect =
    params.redirect ?? "/admin";

  const redirectPath =
    requestedRedirect.startsWith("/") &&
    !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/admin";

  /*
   * Är användaren redan inloggad skickas
   * den direkt till administrationen.
   */
  if (user) {
    redirect(redirectPath);
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.logo}>
          🔥
        </div>

        <p className={styles.eyebrow}>
          Grillkolsbutiken
        </p>

        <h1>Logga in</h1>

        <p className={styles.description}>
          Logga in för att öppna
          administrationen.
        </p>

        <LoginForm
          redirectPath={redirectPath}
        />

        <a
          href="/"
          className={styles.homeLink}
        >
          ← Tillbaka till butiken
        </a>
      </section>
    </main>
  );
}