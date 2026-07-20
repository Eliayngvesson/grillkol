import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from
  "@/lib/supabase/server";

import { logout } from "./actions";
import styles from
  "./admin-layout.module.css";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * Extra serverskydd.
   * Även om proxy skulle misslyckas skyddas
   * själva admin-layouten här.
   */
  if (!user) {
    redirect(
      "/login?redirect=/admin"
    );
  }

  return (
    <div className={styles.admin}>
      <header className={styles.topbar}>
        <div className={styles.account}>
          <span className={styles.fire}>
            🔥
          </span>

          <div>
            <strong>
              Administration
            </strong>

            <span className={styles.email}>
              {user.email}
            </span>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className={styles.logoutButton}
          >
            Logga ut
          </button>
        </form>
      </header>

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}