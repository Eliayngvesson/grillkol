"use client";

import { useActionState } from "react";

import {
  login,
  type LoginState,
} from "./actions";

import styles from "./page.module.css";

const initialState: LoginState = {
  error: null,
};

type LoginFormProps = {
  redirectPath: string;
};

export default function LoginForm({
  redirectPath,
}: LoginFormProps) {
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
  );
}