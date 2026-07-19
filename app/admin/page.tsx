"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./admin.css";

type OrderProduct = {
  id?: string | number;
  name?: string;
  weight?: string;
  price?: number | string;
  quantity?: number | string;
  rowTotal?: number | string;
  row_total?: number | string;
};

type OrderStatus =
  | "Ny"
  | "Planerad"
  | "På väg"
  | "Levererad"
  | "Avbruten";

type Order = {
  id: string | number;
  order_number: string | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  delivery_date: string | null;
  delivery_message: string | null;
  products: OrderProduct[] | null;
  total_items: number | null;
  total_price: number | string | null;
  status: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: string | null;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "Ny",
  "Planerad",
  "På väg",
  "Levererad",
  "Avbruten",
];

function formatPrice(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numberValue) ? numberValue : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Ej angivet";
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Okänt";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatus(order: Order): OrderStatus {
  const status = order.status?.trim();

  if (STATUS_OPTIONS.includes(status as OrderStatus)) {
    return status as OrderStatus;
  }

  return "Ny";
}

function getProducts(order: Order) {
  return Array.isArray(order.products) ? order.products : [];
}

function getProductQuantity(product: OrderProduct) {
  const quantity = Number(product.quantity ?? 0);

  return Number.isFinite(quantity) ? quantity : 0;
}

function getProductPrice(product: OrderProduct) {
  const price = Number(product.price ?? 0);

  return Number.isFinite(price) ? price : 0;
}

function getProductRowTotal(product: OrderProduct) {
  const storedTotal = Number(product.rowTotal ?? product.row_total);

  if (Number.isFinite(storedTotal)) {
    return storedTotal;
  }

  return getProductQuantity(product) * getProductPrice(product);
}

function fullAddress(order: Order) {
  const cityLine = [order.postal_code, order.city]
    .filter(Boolean)
    .join(" ");

  return [order.street_address, cityLine]
    .filter(Boolean)
    .join(", ");
}

function mapUrl(order: Order) {
  const latitude = Number(order.latitude);
  const longitude = Number(order.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fullAddress(order),
  )}`;
}

function navigationUrl(order: Order) {
  const latitude = Number(order.latitude);
  const longitude = Number(order.longitude);

  const destination =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `${latitude},${longitude}`
      : fullAddress(order);

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination,
  )}`;
}

function statusClass(status: OrderStatus) {
  return `status status-${status
    .toLowerCase()
    .replaceAll("å", "a")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll(" ", "-")}`;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Alla" | OrderStatus
  >("Alla");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [updatingOrderId, setUpdatingOrderId] = useState<
    string | number | null
  >(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  const [successMessage, setSuccessMessage] = useState<
    string | null
  >(null);

  const loadOrders = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage(null);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);

        setErrorMessage(
          `Ordrarna kunde inte hämtas: ${error.message}`,
        );

        setLoading(false);
        setRefreshing(false);

        return;
      }

      setOrders((data ?? []) as Order[]);

      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  useEffect(() => {
    void loadOrders();

    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          void loadOrders(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "Alla" ||
        getStatus(order) === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchData = [
        order.order_number,
        order.customer_name,
        order.phone,
        order.email,
        order.street_address,
        order.postal_code,
        order.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchData.includes(normalizedSearch);
    });
  }, [orders, searchText, statusFilter]);

  const statistics = useMemo(() => {
    const newOrders = orders.filter(
      (order) => getStatus(order) === "Ny",
    ).length;

    const plannedOrders = orders.filter(
      (order) => getStatus(order) === "Planerad",
    ).length;

    const onTheWayOrders = orders.filter(
      (order) => getStatus(order) === "På väg",
    ).length;

    const deliveredOrders = orders.filter(
      (order) => getStatus(order) === "Levererad",
    ).length;

    const openValue = orders
      .filter((order) => {
        const status = getStatus(order);

        return status !== "Levererad" && status !== "Avbruten";
      })
      .reduce((sum, order) => {
        return sum + Number(order.total_price ?? 0);
      }, 0);

    return {
      newOrders,
      plannedOrders,
      onTheWayOrders,
      deliveredOrders,
      openValue,
    };
  }, [orders]);

  async function updateStatus(
    order: Order,
    status: OrderStatus,
  ) {
    setUpdatingOrderId(order.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({
        status,
      })
      .eq("id", order.id);

    if (error) {
      console.error(error);

      setErrorMessage(
        `Statusen kunde inte ändras: ${error.message}`,
      );

      setUpdatingOrderId(null);

      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? {
              ...currentOrder,
              status,
            }
          : currentOrder,
      ),
    );

    setSelectedOrder((currentOrder) =>
      currentOrder?.id === order.id
        ? {
            ...currentOrder,
            status,
          }
        : currentOrder,
    );

    setSuccessMessage(
      `${order.order_number ?? "Ordern"} markerades som ${status.toLowerCase()}.`,
    );

    setUpdatingOrderId(null);
  }

  function printOrder(order: Order) {
    setSelectedOrder(order);

    window.setTimeout(() => {
      window.print();
    }, 100);
  }

  return (
    <main className="admin-page">
      <header className="admin-header no-print">
        <div>
          <p className="admin-eyebrow">
            Grillkol administration
          </p>

          <h1>Orderöversikt</h1>

          <p className="admin-intro">
            Hantera beställningar, leveranser och kunduppgifter.
          </p>
        </div>

        <nav className="admin-navigation">
          <Link href="/">Visa butik</Link>

          <Link href="/admin/map">
            Leveranskarta
          </Link>

          <button
            type="button"
            onClick={() => void loadOrders(true)}
            disabled={refreshing}
          >
            {refreshing ? "Uppdaterar..." : "Uppdatera"}
          </button>
        </nav>
      </header>

      <section className="statistics-grid no-print">
        <article>
          <span className="statistics-icon">📦</span>

          <div>
            <p>Nya order</p>
            <strong>{statistics.newOrders}</strong>
          </div>
        </article>

        <article>
          <span className="statistics-icon">📅</span>

          <div>
            <p>Planerade</p>
            <strong>{statistics.plannedOrders}</strong>
          </div>
        </article>

        <article>
          <span className="statistics-icon">🚚</span>

          <div>
            <p>På väg</p>
            <strong>{statistics.onTheWayOrders}</strong>
          </div>
        </article>

        <article>
          <span className="statistics-icon">✓</span>

          <div>
            <p>Levererade</p>
            <strong>{statistics.deliveredOrders}</strong>
          </div>
        </article>

        <article className="value-card">
          <span className="statistics-icon">kr</span>

          <div>
            <p>Värde på öppna order</p>
            <strong>
              {formatPrice(statistics.openValue)}
            </strong>
          </div>
        </article>
      </section>

      {errorMessage && (
        <div className="admin-alert admin-alert-error no-print">
          <strong>Något gick fel</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="admin-alert admin-alert-success no-print">
          <strong>Klart</strong>
          <p>{successMessage}</p>
        </div>
      )}

      <section className="order-workspace">
        <div className="orders-panel no-print">
          <div className="orders-toolbar">
            <label className="search-field">
              <span>Sök order</span>

              <input
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder="Namn, telefon, ort eller ordernummer"
              />
            </label>

            <label className="filter-field">
              <span>Status</span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "Alla"
                      | OrderStatus,
                  )
                }
              >
                <option value="Alla">
                  Alla statusar
                </option>

                {STATUS_OPTIONS.map((status) => (
                  <option
                    value={status}
                    key={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="orders-heading">
            <div>
              <h2>Beställningar</h2>

              <p>
                Visar {filteredOrders.length} av{" "}
                {orders.length} order.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner" />
              <p>Hämtar beställningar...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-empty">
              <span>📭</span>

              <h3>Inga order hittades</h3>

              <p>
                Ändra sökningen eller statusfiltret och
                försök igen.
              </p>
            </div>
          ) : (
            <div className="orders-list">
              {filteredOrders.map((order) => {
                const status = getStatus(order);

                const selected =
                  selectedOrder?.id === order.id;

                return (
                  <button
                    type="button"
                    className={`order-card ${
                      selected ? "selected" : ""
                    }`}
                    key={order.id}
                    onClick={() =>
                      setSelectedOrder(order)
                    }
                  >
                    <div className="order-card-top">
                      <div>
                        <span className="order-number">
                          {order.order_number ??
                            `Order ${order.id}`}
                        </span>

                        <span
                          className={statusClass(status)}
                        >
                          {status}
                        </span>
                      </div>

                      <strong>
                        {formatPrice(order.total_price)}
                      </strong>
                    </div>

                    <h3>
                      {order.customer_name ??
                        "Kundnamn saknas"}
                    </h3>

                    <div className="order-card-information">
                      <span>
                        📍 {order.city ?? "Ort saknas"}
                      </span>

                      <span>
                        📅{" "}
                        {formatDate(
                          order.delivery_date,
                        )}
                      </span>

                      <span>
                        🛒 {order.total_items ?? 0} st
                      </span>
                    </div>

                    <div className="order-card-bottom">
                      <span>
                        Inkommen{" "}
                        {formatDateTime(
                          order.created_at,
                        )}
                      </span>

                      <span className="open-order">
                        Öppna →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside
          className={`order-details ${
            selectedOrder ? "is-open" : ""
          }`}
        >
          {!selectedOrder ? (
            <div className="details-placeholder no-print">
              <span>📋</span>

              <h2>Välj en beställning</h2>

              <p>
                Klicka på en order i listan för att se
                kunduppgifter, produkter och
                leveransåtgärder.
              </p>
            </div>
          ) : (
            <OrderDetails
              order={selectedOrder}
              updating={
                updatingOrderId === selectedOrder.id
              }
              onClose={() => setSelectedOrder(null)}
              onUpdateStatus={(status) =>
                void updateStatus(
                  selectedOrder,
                  status,
                )
              }
              onPrint={() =>
                printOrder(selectedOrder)
              }
            />
          )}
        </aside>
      </section>
    </main>
  );
}

type OrderDetailsProps = {
  order: Order;
  updating: boolean;
  onClose: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
  onPrint: () => void;
};

function OrderDetails({
  order,
  updating,
  onClose,
  onUpdateStatus,
  onPrint,
}: OrderDetailsProps) {
  const products = getProducts(order);
  const status = getStatus(order);

  return (
    <div className="details-content">
      <div className="details-header">
        <div>
          <p className="admin-eyebrow">
            Beställning
          </p>

          <h2>
            {order.order_number ??
              `Order ${order.id}`}
          </h2>

          <span className={statusClass(status)}>
            {status}
          </span>
        </div>

        <button
          type="button"
          className="close-details no-print"
          onClick={onClose}
          aria-label="Stäng orderdetaljer"
        >
          ×
        </button>
      </div>

      <section className="details-section">
        <h3>Kund</h3>

        <dl className="details-list">
          <div>
            <dt>Namn</dt>
            <dd>
              {order.customer_name ??
                "Ej angivet"}
            </dd>
          </div>

          <div>
            <dt>Telefon</dt>

            <dd>
              {order.phone ? (
                <a href={`tel:${order.phone}`}>
                  {order.phone}
                </a>
              ) : (
                "Ej angivet"
              )}
            </dd>
          </div>

          <div>
            <dt>E-post</dt>

            <dd>
              {order.email ? (
                <a href={`mailto:${order.email}`}>
                  {order.email}
                </a>
              ) : (
                "Ej angivet"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="details-section">
        <h3>Leverans</h3>

        <dl className="details-list">
          <div>
            <dt>Adress</dt>

            <dd>
              {fullAddress(order) ||
                "Ej angivet"}
            </dd>
          </div>

          <div>
            <dt>Önskat datum</dt>

            <dd>
              {formatDate(order.delivery_date)}
            </dd>
          </div>

          <div>
            <dt>Meddelande</dt>

            <dd>
              {order.delivery_message ||
                "Inget meddelande"}
            </dd>
          </div>
        </dl>

        <div className="detail-actions no-print">
          {order.phone && (
            <a
              className="secondary-action"
              href={`tel:${order.phone}`}
            >
              📞 Ring kunden
            </a>
          )}

          <a
            className="secondary-action"
            href={mapUrl(order)}
            target="_blank"
            rel="noreferrer"
          >
            📍 Visa på karta
          </a>

          <a
            className="primary-action"
            href={navigationUrl(order)}
            target="_blank"
            rel="noreferrer"
          >
            🚚 Starta navigation
          </a>
        </div>
      </section>

      <section className="details-section">
        <h3>Produkter</h3>

        {products.length === 0 ? (
          <p className="muted-text">
            Produktinformationen saknas.
          </p>
        ) : (
          <div className="product-rows">
            {products.map((product, index) => (
              <div
                className="product-row"
                key={`${
                  product.id ??
                  product.name ??
                  "produkt"
                }-${index}`}
              >
                <div>
                  <strong>
                    {product.name ?? "Produkt"}
                  </strong>

                  <span>
                    {getProductQuantity(product)} ×{" "}
                    {formatPrice(
                      getProductPrice(product),
                    )}
                    {product.weight
                      ? ` · ${product.weight}`
                      : ""}
                  </span>
                </div>

                <strong>
                  {formatPrice(
                    getProductRowTotal(product),
                  )}
                </strong>
              </div>
            ))}
          </div>
        )}

        <div className="order-total">
          <span>Totalt</span>

          <strong>
            {formatPrice(order.total_price)}
          </strong>
        </div>
      </section>

      <section className="details-section status-section no-print">
        <h3>Ändra status</h3>

        <div className="status-buttons">
          {STATUS_OPTIONS.map((option) => (
            <button
              type="button"
              className={
                option === status ? "active" : ""
              }
              disabled={updating}
              onClick={() =>
                onUpdateStatus(option)
              }
              key={option}
            >
              {updating && option === status
                ? "Sparar..."
                : option}
            </button>
          ))}
        </div>
      </section>

      <div className="details-footer no-print">
        <button
          type="button"
          className="print-button"
          onClick={onPrint}
        >
          🖨 Skriv ut order
        </button>
      </div>

      <footer className="print-footer print-only">
        <p>
          Order skapad:{" "}
          {formatDateTime(order.created_at)}
        </p>

        <p>
          Utskriven:{" "}
          {formatDateTime(
            new Date().toISOString(),
          )}
        </p>
      </footer>
    </div>
  );
}