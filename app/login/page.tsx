"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import {
  login,
  type LoginState,
} from "./actions";

import styles from "./page.module.css";

const initialState: LoginState = {
  error: null,
};

export default function LoginPage() {
  const searchParams = useSearchParams();

  const redirectPath =
    searchParams.get("redirect") ??
    "/admin";

  const [state, formAction, isPending] =
    useActionState(login, initialState);

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
              autoComplete="email"
              required
              placeholder="din@email.se"
            />
          </label>

          <label className={styles.field}>
            <span>Lösenord</span>

            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Ditt lösenord"
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