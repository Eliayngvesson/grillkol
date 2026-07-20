"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { login, type LoginState } from "./actions";
import styles from "./page.module.css";

const initialState: LoginState = {
  error: null,
};

function LoginForm() {
  const searchParams = useSearchParams();

  const redirectPath =
    searchParams.get("redirect") ?? "/admin";

  const [state, formAction, isPending] =
    useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className={styles.form}
    >
      <input
        type="hidden"
        name="redirect"
        value={redirectPath}
      />

      <label className={styles.field}>
        <span>E-postadress</span>

        <input
          type="email"
          name="email"
          required
        />
      </label>

      <label className={styles.field}>
        <span>Lösenord</span>

        <input
          type="password"
          name="password"
          required
        />
      </label>

      {state.error && (
        <p className={styles.error}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={styles.button}
      >
        {isPending
          ? "Loggar in..."
          : "Logga in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.logo}>🔥</div>

        <p className={styles.eyebrow}>
          Grillkolsbutiken
        </p>

        <h1>Logga in</h1>

        <p className={styles.description}>
          Logga in för att öppna administrationen.
        </p>

        <Suspense fallback={<p>Laddar...</p>}>
          <LoginForm />
        </Suspense>

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