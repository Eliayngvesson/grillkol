import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { logout } from "./actions";

import styles from "./admin-layout.module.css";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <div className={styles.accountBar}>
        <span className={styles.user}>
          Inloggad som{" "}
          <strong>
            {user.email ?? "administratör"}
          </strong>
        </span>

        <form action={logout}>
          <button
            type="submit"
            className={styles.logoutButton}
          >
            Logga ut
          </button>
        </form>
      </div>

      {children}
    </>
  );
}