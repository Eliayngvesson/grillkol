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

type OrderStatus = "Klar" | "Levererad";

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function normalizeOrder(rawOrder: Record<string, unknown>): DriverOrder {
  return {
    id: Number(rawOrder.id),
    order_number: String(rawOrder.order_number ?? rawOrder.id ?? ""),
    customer_name: String(rawOrder.customer_name ?? "Okänd kund"),
    phone: String(rawOrder.phone ?? ""),
    email: typeof rawOrder.email === "string" ? rawOrder.email : null,
    street_address: String(rawOrder.street_address ?? ""),
    postal_code: String(rawOrder.postal_code ?? ""),
    city: String(rawOrder.city ?? ""),
    delivery_date:
      typeof rawOrder.delivery_date === "string"
        ? rawOrder.delivery_date
        : null,
    delivery_message:
      typeof rawOrder.delivery_message === "string"
        ? rawOrder.delivery_message
        : null,
    route_name:
      typeof rawOrder.route_name === "string" ? rawOrder.route_name : null,
    route_position:
      rawOrder.route_position !== null && rawOrder.route_position !== undefined
        ? Number(rawOrder.route_position)
        : null,
    latitude:
      rawOrder.latitude !== null && rawOrder.latitude !== undefined
        ? Number(rawOrder.latitude)
        : null,
    longitude:
      rawOrder.longitude !== null && rawOrder.longitude !== undefined
        ? Number(rawOrder.longitude)
        : null,
    total_items: Number(rawOrder.total_items ?? 0),
    total_price: Number(rawOrder.total_price ?? 0),
    status: String(rawOrder.status ?? "Ny"),
    created_at: String(rawOrder.created_at ?? ""),
  };
}

function createNavigationUrl(order: DriverOrder) {
  if (order.latitude !== null && order.longitude !== null) {
    const destination = `${order.latitude},${order.longitude}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      destination,
    )}&travelmode=driving`;
  }

  const address = [order.street_address, order.postal_code, order.city]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address,
  )}&travelmode=driving`;
}

export default function DriverMenu() {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [showDelivered, setShowDelivered] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("delivery_date", selectedDate)
      .order("route_position", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setErrorMessage(`Leveranserna kunde inte hämtas: ${error.message}`);
      setLoading(false);
      return;
    }

    setOrders(
      (data ?? []).map((order) =>
        normalizeOrder(order as Record<string, unknown>),
      ),
    );
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    async function initializePage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/admin";
        return;
      }

      await loadOrders();
    }

    void initializePage();
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.status === "Avbruten") return false;
      if (!showDelivered && order.status === "Levererad") return false;
      return true;
    });
  }, [orders, showDelivered]);

  const remainingOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status !== "Levererad" && order.status !== "Avbruten",
    );
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter((order) => order.status === "Levererad");
  }, [orders]);

  const remainingItems = remainingOrders.reduce(
    (total, order) => total + Number(order.total_items || 0),
    0,
  );

  const remainingValue = remainingOrders.reduce(
    (total, order) => total + Number(order.total_price || 0),
    0,
  );

  async function updateOrderStatus(order: DriverOrder, status: OrderStatus) {
    const confirmed = window.confirm(
      status === "Levererad"
        ? `Vill du markera order ${order.order_number} till ${order.customer_name} som levererad?`
        : `Vill du markera order ${order.order_number} till ${order.customer_name} som klar?`,
    );

    if (!confirmed) return;

    setUpdatingOrderId(order.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id);

    if (error) {
      setErrorMessage(`Ordern kunde inte uppdateras: ${error.message}`);
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
        : `${order.customer_name} har markerats som klar.`,
    );

    setUpdatingOrderId(null);
  }

  function openCompleteRoute() {
    const navigableOrders = remainingOrders.filter(
      (order) =>
        (order.latitude !== null && order.longitude !== null) ||
        Boolean(order.street_address && order.city),
    );

    if (navigableOrders.length === 0) {
      setErrorMessage("Det finns inga aktiva leveranser med användbar adress.");
      return;
    }

    const destinationOrder = navigableOrders[navigableOrders.length - 1];
    const destination =
      destinationOrder.latitude !== null &&
      destinationOrder.longitude !== null
        ? `${destinationOrder.latitude},${destinationOrder.longitude}`
        : [
            destinationOrder.street_address,
            destinationOrder.postal_code,
            destinationOrder.city,
          ]
            .filter(Boolean)
            .join(", ");

    const waypoints = navigableOrders
      .slice(0, -1)
      .map((order) =>
        order.latitude !== null && order.longitude !== null
          ? `${order.latitude},${order.longitude}`
          : [order.street_address, order.postal_code, order.city]
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

    if (waypoints) parameters.set("waypoints", waypoints);

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
          <p>Körordning, navigering, kundkontakt och leveransstatus.</p>
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

        <button type="button" disabled={loading} onClick={() => void loadOrders()}>
          {loading ? "Hämtar..." : "↻ Uppdatera"}
        </button>

        <button
          type="button"
          className={styles.routeButton}
          disabled={remainingOrders.length === 0}
          onClick={openCompleteRoute}
        >
          🧭 Starta hela rutten
        </button>
      </section>

      {message && <div className={styles.success}>{message}</div>}
      {errorMessage && <div className={styles.error}>{errorMessage}</div>}

      <section className={styles.summary}>
        <article><span>Kvar att leverera</span><strong>{remainingOrders.length}</strong></article>
        <article><span>Levererade</span><strong>{deliveredOrders.length}</strong></article>
        <article><span>Varor kvar</span><strong>{remainingItems}</strong></article>
        <article><span>Ordervärde kvar</span><strong>{formatCurrency(remainingValue)}</strong></article>
      </section>

      <section className={styles.listHeading}>
        <div>
          <p className={styles.eyebrow}>Körlista</p>
          <h2>{visibleOrders.length} stopp visas</h2>
        </div>

        <label className={styles.deliveredToggle}>
          <input
            type="checkbox"
            checked={showDelivered}
            onChange={(event) => setShowDelivered(event.target.checked)}
          />
          Visa levererade
        </label>
      </section>

      {loading ? (
        <section className={styles.empty}>
          <span>⏳</span>
          <h2>Hämtar leveranser</h2>
        </section>
      ) : visibleOrders.length === 0 ? (
        <section className={styles.empty}>
          <span>🚚</span>
          <h2>Inga leveranser</h2>
          <p>Det finns inga planerade leveranser för valt datum.</p>
        </section>
      ) : (
        <section className={styles.orderList}>
          {visibleOrders.map((order, index) => {
            const updating = updatingOrderId === order.id;
            const stopNumber =
              order.route_position !== null ? order.route_position : index + 1;

            return (
              <article
                key={order.id}
                className={`${styles.orderCard} ${
                  order.status === "Levererad" ? styles.deliveredCard : ""
                }`}
              >
                <div className={styles.cardTop}>
                  <div className={styles.stopNumber}>{stopNumber}</div>

                  <div className={styles.customer}>
                    <small>Order {order.order_number}</small>
                    <h2>{order.customer_name}</h2>
                    <p>
                      {order.street_address || "Adress saknas"}
                      <br />
                      {order.postal_code} {order.city}
                    </p>
                  </div>

                  <span className={styles.status}>{order.status}</span>
                </div>

                <div className={styles.orderFacts}>
                  <span>Varor<strong>{order.total_items} st</strong></span>
                  <span>Ordervärde<strong>{formatCurrency(order.total_price)}</strong></span>
                  <span>Rutt<strong>{order.route_name || "Ej namngiven"}</strong></span>
                </div>

                {order.delivery_message && (
                  <div className={styles.note}>
                    <strong>Leveransmeddelande</strong>
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

                  {order.phone ? (
                    <a className={styles.callButton} href={`tel:${order.phone}`}>
                      📞 Ring kund
                    </a>
                  ) : (
                    <span className={styles.disabledAction}>Telefonnummer saknas</span>
                  )}
                </div>

                <div className={styles.statusActions}>
                  <button
                    type="button"
                    disabled={
                      updating ||
                      order.status === "Klar" ||
                      order.status === "Levererad"
                    }
                    onClick={() => void updateOrderStatus(order, "Klar")}
                  >
                    ✓ Markera klar
                  </button>

                  <button
                    type="button"
                    className={styles.deliveredButton}
                    disabled={updating || order.status === "Levererad"}
                    onClick={() => void updateOrderStatus(order, "Levererad")}
                  >
                    {updating ? "Sparar..." : "📦 Markera levererad"}
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