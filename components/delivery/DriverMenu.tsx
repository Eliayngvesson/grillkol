"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./driver-menu.module.css";

type DriverOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  street_address: string;
  postal_code: string;
  city: string;
  delivery_date: string | null;
  delivery_message: string | null;
  route_name: string | null;
  route_position: number | null;
  latitude: number | null;
  longitude: number | null;
  total_items: number;
  total_price: number;
  status: string;
  created_at: string;
};

type StatusAction = "Klar" | "Levererad";

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function createNavigationUrl(order: DriverOrder) {
  if (
    typeof order.latitude === "number" &&
    typeof order.longitude === "number"
  ) {
    const destination = `${order.latitude},${order.longitude}`;

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      destination,
    )}&travelmode=driving`;
  }

  const address = [
    order.street_address,
    order.postal_code,
    order.city,
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address,
  )}&travelmode=driving`;
}

function getStatusClass(status: string) {
  return status
    .trim()
    .toLocaleLowerCase("sv-SE")
    .replaceAll("å", "a")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll(" ", "-");
}

export default function DriverMenu() {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] =
    useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("delivery_date", selectedDate)
      .order("route_position", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(
        `Dagens leveranser kunde inte hämtas: ${error.message}`,
      );
      setLoading(false);
      return;
    }

    setOrders((data ?? []) as DriverOrder[]);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/admin";
        return;
      }

      await loadOrders();
    }

    void initialize();
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.status === "Avbruten") return false;

      if (showCompleted) return true;

      return order.status !== "Levererad";
    });
  }, [orders, showCompleted]);

  const activeOrders = orders.filter(
    (order) =>
      order.status !== "Levererad" && order.status !== "Avbruten",
  );

  const deliveredOrders = orders.filter(
    (order) => order.status === "Levererad",
  );

  const routeValue = activeOrders.reduce(
    (sum, order) => sum + Number(order.total_price || 0),
    0,
  );

  async function changeStatus(
    order: DriverOrder,
    status: StatusAction,
  ) {
    const actionText =
      status === "Levererad"
        ? "markera som levererad"
        : "markera som klar";

    if (
      status === "Levererad" &&
      !window.confirm(
        `Vill du ${actionText}: ${order.customer_name}?`,
      )
    ) {
      return;
    }

    setUpdatingOrderId(order.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id);

    if (error) {
      setErrorMessage(
        `Ordern kunde inte uppdateras: ${error.message}`,
      );
      setUpdatingOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? { ...currentOrder, status }
          : currentOrder,
      ),
    );

    setMessage(
      status === "Levererad"
        ? `${order.customer_name} har markerats som levererad.`
        : `${order.customer_name} är nu klar för leverans.`,
    );

    setUpdatingOrderId(null);
  }

  function openCompleteRoute() {
    const navigableOrders = activeOrders.filter(
      (order) =>
        (typeof order.latitude === "number" &&
          typeof order.longitude === "number") ||
        Boolean(order.street_address && order.city),
    );

    if (navigableOrders.length === 0) {
      setErrorMessage(
        "Det finns inga aktiva leveranser med en användbar adress.",
      );
      return;
    }

    const first = navigableOrders[0];
    const last = navigableOrders[navigableOrders.length - 1];

    const destination =
      typeof last.latitude === "number" &&
      typeof last.longitude === "number"
        ? `${last.latitude},${last.longitude}`
        : [
            last.street_address,
            last.postal_code,
            last.city,
          ]
            .filter(Boolean)
            .join(", ");

    const waypoints = navigableOrders
      .slice(0, -1)
      .map((order) =>
        typeof order.latitude === "number" &&
        typeof order.longitude === "number"
          ? `${order.latitude},${order.longitude}`
          : [
              order.street_address,
              order.postal_code,
              order.city,
            ]
              .filter(Boolean)
              .join(", "),
      )
      .filter(Boolean)
      .join("|");

    const parameters = new URLSearchParams({
      api: "1",
      destination,
      travelmode: "driving",
    });

    if (waypoints && navigableOrders.length > 1) {
      parameters.set("waypoints", waypoints);
    }

    window.open(
      `https://www.google.com/maps/dir/?${parameters.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Mobil förarmeny</p>
          <h1>Dagens leveranser</h1>
          <p>
            Körordning, kundkontakt, navigering och leveransstatus.
          </p>
        </div>

        <div className={styles.headerActions}>
          <a href="/admin/leveranser">Planera rutt</a>
          <a href="/admin">Admin</a>
        </div>
      </header>

      <section className={styles.controls}>
        <label>
          <span>Leveransdatum</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={() => void loadOrders()}
        >
          {loading ? "Hämtar..." : "↻ Uppdatera"}
        </button>

        <button
          type="button"
          className={styles.routeButton}
          disabled={activeOrders.length === 0}
          onClick={openCompleteRoute}
        >
          🧭 Starta hela rutten
        </button>
      </section>

      {message && <div className={styles.success}>{message}</div>}
      {errorMessage && (
        <div className={styles.error}>{errorMessage}</div>
      )}

      <section className={styles.summary}>
        <article>
          <span>Kvar att leverera</span>
          <strong>{activeOrders.length}</strong>
        </article>

        <article>
          <span>Levererade</span>
          <strong>{deliveredOrders.length}</strong>
        </article>

        <article>
          <span>Varor kvar</span>
          <strong>
            {activeOrders.reduce(
              (sum, order) => sum + Number(order.total_items || 0),
              0,
            )}
          </strong>
        </article>

        <article>
          <span>Ordervärde kvar</span>
          <strong>{formatCurrency(routeValue)}</strong>
        </article>
      </section>

      <section className={styles.listHeading}>
        <div>
          <p className={styles.eyebrow}>Körlista</p>
          <h2>{visibleOrders.length} stopp visas</h2>
        </div>

        <label className={styles.completedToggle}>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) =>
              setShowCompleted(event.target.checked)
            }
          />
          Visa levererade
        </label>
      </section>

      {loading ? (
        <section className={styles.empty}>
          <span>⏳</span>
          <h2>Hämtar körlistan</h2>
        </section>
      ) : visibleOrders.length === 0 ? (
        <section className={styles.empty}>
          <span>🚚</span>
          <h2>Inga leveranser för valt datum</h2>
          <p>
            Planera en rutt eller välj ett annat leveransdatum.
          </p>
        </section>
      ) : (
        <section className={styles.orderList}>
          {visibleOrders.map((order, index) => {
            const isUpdating = updatingOrderId === order.id;
            const stopNumber = order.route_position ?? index + 1;

            return (
              <article
                className={`${styles.orderCard} ${
                  order.status === "Levererad"
                    ? styles.deliveredCard
                    : ""
                }`}
                key={order.id}
              >
                <div className={styles.cardTop}>
                  <div className={styles.stopNumber}>
                    {stopNumber}
                  </div>

                  <div className={styles.customer}>
                    <small>{order.order_number}</small>
                    <h2>{order.customer_name}</h2>
                    <p>
                      {order.street_address}
                      <br />
                      {order.postal_code} {order.city}
                    </p>
                  </div>

                  <span
                    className={`${styles.status} ${
                      styles[
                        `status_${getStatusClass(order.status)}`
                      ] ?? ""
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className={styles.orderFacts}>
                  <span>
                    Varor
                    <strong>{order.total_items} st</strong>
                  </span>
                  <span>
                    Ordervärde
                    <strong>
                      {formatCurrency(order.total_price)}
                    </strong>
                  </span>
                  <span>
                    Rutt
                    <strong>{order.route_name || "Ej namngiven"}</strong>
                  </span>
                </div>

                {order.delivery_message && (
                  <div className={styles.note}>
                    <strong>Kundens meddelande</strong>
                    <p>{order.delivery_message}</p>
                  </div>
                )}

                <div className={styles.primaryActions}>
                  <a
                    className={styles.navigateButton}
                    href={createNavigationUrl(order)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🧭 Navigera
                  </a>

                  {order.phone && (
                    <a
                      className={styles.callButton}
                      href={`tel:${order.phone}`}
                    >
                      📞 Ring kund
                    </a>
                  )}
                </div>

                <div className={styles.statusActions}>
                  <button
                    type="button"
                    disabled={
                      isUpdating ||
                      order.status === "Klar" ||
                      order.status === "Levererad"
                    }
                    onClick={() =>
                      void changeStatus(order, "Klar")
                    }
                  >
                    ✓ Markera klar
                  </button>

                  <button
                    type="button"
                    className={styles.deliveredButton}
                    disabled={
                      isUpdating || order.status === "Levererad"
                    }
                    onClick={() =>
                      void changeStatus(order, "Levererad")
                    }
                  >
                    {isUpdating
                      ? "Sparar..."
                      : "📦 Markera levererad"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
