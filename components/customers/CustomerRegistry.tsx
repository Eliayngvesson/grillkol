"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./customer-registry.module.css";

type OrderProduct = {
  id?: number | string;
  name: string;
  quantity: number;
  price?: number;
  rowTotal?: number;
};

type CustomerOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  street_address: string;
  postal_code: string;
  city: string;
  delivery_date: string | null;
  products: OrderProduct[] | null;
  total_items: number;
  total_price: number;
  status: string;
  created_at: string;
};

type Customer = {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  streetAddress: string;
  postalCode: string;
  city: string;
  orderCount: number;
  totalValue: number;
  totalItems: number;
  firstOrderAt: string;
  latestOrderAt: string;
  favoriteProduct: string;
  orders: CustomerOrder[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "Datum saknas";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function getCustomerKey(order: CustomerOrder) {
  const phone = normalizePhone(order.phone || "");
  const email = (order.email || "").trim().toLocaleLowerCase("sv-SE");

  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;

  return [
    order.customer_name,
    order.street_address,
    order.postal_code,
    order.city,
  ]
    .join("|")
    .trim()
    .toLocaleLowerCase("sv-SE");
}

function buildCustomers(orders: CustomerOrder[]) {
  const groups = new Map<string, CustomerOrder[]>();

  for (const order of orders) {
    const key = getCustomerKey(order);
    const existing = groups.get(key) ?? [];
    existing.push(order);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([key, customerOrders]) => {
    const sortedOrders = [...customerOrders].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

    const latest = sortedOrders[0];
    const oldest = sortedOrders[sortedOrders.length - 1];

    const productCounts = new Map<string, number>();

    for (const order of sortedOrders) {
      for (const product of order.products ?? []) {
        const current = productCounts.get(product.name) ?? 0;
        productCounts.set(
          product.name,
          current + Number(product.quantity || 0),
        );
      }
    }

    const favoriteProduct =
      Array.from(productCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] ?? "Ingen produktdata";

    return {
      key,
      name: latest.customer_name || "Okänd kund",
      phone: latest.phone || "",
      email: latest.email,
      streetAddress: latest.street_address || "",
      postalCode: latest.postal_code || "",
      city: latest.city || "",
      orderCount: sortedOrders.length,
      totalValue: sortedOrders
        .filter((order) => order.status !== "Avbruten")
        .reduce(
          (sum, order) => sum + Number(order.total_price || 0),
          0,
        ),
      totalItems: sortedOrders
        .filter((order) => order.status !== "Avbruten")
        .reduce(
          (sum, order) => sum + Number(order.total_items || 0),
          0,
        ),
      firstOrderAt: oldest.created_at,
      latestOrderAt: latest.created_at,
      favoriteProduct,
      orders: sortedOrders,
    } satisfies Customer;
  });
}

export default function CustomerRegistry() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedCustomerKey, setSelectedCustomerKey] =
    useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<
    "latest" | "name" | "value" | "orders"
  >("latest");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(
        `Kundregistret kunde inte hämtas: ${error.message}`,
      );
      setLoading(false);
      return;
    }

    setOrders((data ?? []) as CustomerOrder[]);
    setLoading(false);
  }, []);

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

  const customers = useMemo(() => buildCustomers(orders), [orders]);

  const filteredCustomers = useMemo(() => {
    const search = searchText
      .trim()
      .toLocaleLowerCase("sv-SE");

    const matching = customers.filter((customer) => {
      if (!search) return true;

      return [
        customer.name,
        customer.phone,
        customer.email,
        customer.streetAddress,
        customer.postalCode,
        customer.city,
        customer.favoriteProduct,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("sv-SE")
        .includes(search);
    });

    return [...matching].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "sv-SE");
      }

      if (sortBy === "value") {
        return b.totalValue - a.totalValue;
      }

      if (sortBy === "orders") {
        return b.orderCount - a.orderCount;
      }

      return (
        new Date(b.latestOrderAt).getTime() -
        new Date(a.latestOrderAt).getTime()
      );
    });
  }, [customers, searchText, sortBy]);

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) => customer.key === selectedCustomerKey,
      ) ?? null,
    [customers, selectedCustomerKey],
  );

  const totalCustomerValue = customers.reduce(
    (sum, customer) => sum + customer.totalValue,
    0,
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Administration</p>
          <h1>Kundregister</h1>
          <p>
            Kundregistret skapas automatiskt från tidigare och nya
            beställningar.
          </p>
        </div>

        <div className={styles.headerActions}>
          <a href="/admin">← Adminpanelen</a>
          <a href="/admin/statistik">📊 Statistik</a>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadOrders()}
          >
            {loading ? "Hämtar..." : "↻ Uppdatera"}
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className={styles.error}>{errorMessage}</div>
      )}

      <section className={styles.summary}>
        <article>
          <span>Kunder</span>
          <strong>{customers.length}</strong>
        </article>
        <article>
          <span>Beställningar</span>
          <strong>{orders.length}</strong>
        </article>
        <article>
          <span>Totalt ordervärde</span>
          <strong>{formatCurrency(totalCustomerValue)}</strong>
        </article>
        <article>
          <span>Genomsnitt per kund</span>
          <strong>
            {formatCurrency(
              customers.length
                ? totalCustomerValue / customers.length
                : 0,
            )}
          </strong>
        </article>
      </section>

      <section className={styles.toolbar}>
        <label>
          <span>Sök kund</span>
          <input
            type="search"
            value={searchText}
            placeholder="Namn, telefon, e-post, adress eller ort"
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>

        <label>
          <span>Sortering</span>
          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  | "latest"
                  | "name"
                  | "value"
                  | "orders",
              )
            }
          >
            <option value="latest">Senaste order</option>
            <option value="name">Namn A–Ö</option>
            <option value="value">Högst ordervärde</option>
            <option value="orders">Flest beställningar</option>
          </select>
        </label>
      </section>

      {loading ? (
        <section className={styles.empty}>
          <span>⏳</span>
          <h2>Hämtar kunder</h2>
        </section>
      ) : filteredCustomers.length === 0 ? (
        <section className={styles.empty}>
          <span>👤</span>
          <h2>Inga kunder hittades</h2>
          <p>Kunder skapas automatiskt från beställningarna.</p>
        </section>
      ) : (
        <section className={styles.customerGrid}>
          {filteredCustomers.map((customer) => (
            <article className={styles.customerCard} key={customer.key}>
              <div className={styles.customerHeading}>
                <div>
                  <small>{customer.city || "Ort saknas"}</small>
                  <h2>{customer.name}</h2>
                </div>
                <strong>{formatCurrency(customer.totalValue)}</strong>
              </div>

              <div className={styles.address}>
                <span>{customer.streetAddress || "Adress saknas"}</span>
                <span>
                  {customer.postalCode} {customer.city}
                </span>
              </div>

              <div className={styles.contact}>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`}>📞 {customer.phone}</a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`}>
                    ✉️ {customer.email}
                  </a>
                )}
              </div>

              <div className={styles.numbers}>
                <span>
                  Beställningar
                  <strong>{customer.orderCount}</strong>
                </span>
                <span>
                  Produkter
                  <strong>{customer.totalItems}</strong>
                </span>
                <span>
                  Senaste order
                  <strong>{formatDate(customer.latestOrderAt)}</strong>
                </span>
                <span>
                  Favoritprodukt
                  <strong>{customer.favoriteProduct}</strong>
                </span>
              </div>

              <button
                type="button"
                className={styles.detailsButton}
                onClick={() => setSelectedCustomerKey(customer.key)}
              >
                Visa kund och orderhistorik
              </button>
            </article>
          ))}
        </section>
      )}

      {selectedCustomer && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedCustomerKey(null)}
        >
          <section
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeading}>
              <div>
                <p className={styles.eyebrow}>Kund</p>
                <h2>{selectedCustomer.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerKey(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalFacts}>
              <div>
                <span>Telefon</span>
                <strong>{selectedCustomer.phone || "Saknas"}</strong>
              </div>
              <div>
                <span>E-post</span>
                <strong>{selectedCustomer.email || "Saknas"}</strong>
              </div>
              <div>
                <span>Första order</span>
                <strong>{formatDate(selectedCustomer.firstOrderAt)}</strong>
              </div>
              <div>
                <span>Senaste order</span>
                <strong>{formatDate(selectedCustomer.latestOrderAt)}</strong>
              </div>
            </div>

            <div className={styles.modalAddress}>
              <h3>Leveransadress</h3>
              <p>{selectedCustomer.streetAddress}</p>
              <p>
                {selectedCustomer.postalCode} {selectedCustomer.city}
              </p>
            </div>

            <div className={styles.historyHeading}>
              <h3>Orderhistorik</h3>
              <strong>{selectedCustomer.orderCount} order</strong>
            </div>

            <div className={styles.orderHistory}>
              {selectedCustomer.orders.map((order) => (
                <article key={order.id}>
                  <div>
                    <strong>Order {order.order_number}</strong>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div>
                    <span>{order.status}</span>
                    <strong>{formatCurrency(order.total_price)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
