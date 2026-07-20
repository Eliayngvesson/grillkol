"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./statistics-dashboard.module.css";

type OrderProduct = {
  name: string;
  quantity: number;
  price?: number;
  rowTotal?: number;
};

type StatisticsOrder = {
  id: number;
  customer_name: string;
  city: string;
  products: OrderProduct[] | null;
  total_items: number;
  total_price: number;
  status: string;
  created_at: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

export default function StatisticsDashboard() {
  const [orders, setOrders] = useState<StatisticsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(
        `Statistiken kunde inte hämtas: ${error.message}`,
      );
      setLoading(false);
      return;
    }

    setOrders((data ?? []) as StatisticsOrder[]);
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

  const statistics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const validOrders = orders.filter(
      (order) => order.status !== "Avbruten",
    );

    const deliveredOrders = validOrders.filter(
      (order) => order.status === "Levererad",
    );

    const revenueToday = validOrders
      .filter((order) => new Date(order.created_at) >= todayStart)
      .reduce(
        (sum, order) => sum + Number(order.total_price || 0),
        0,
      );

    const revenueWeek = validOrders
      .filter((order) => new Date(order.created_at) >= weekStart)
      .reduce(
        (sum, order) => sum + Number(order.total_price || 0),
        0,
      );

    const revenueMonth = validOrders
      .filter((order) => new Date(order.created_at) >= monthStart)
      .reduce(
        (sum, order) => sum + Number(order.total_price || 0),
        0,
      );

    const totalRevenue = validOrders.reduce(
      (sum, order) => sum + Number(order.total_price || 0),
      0,
    );

    const totalItems = validOrders.reduce(
      (sum, order) => sum + Number(order.total_items || 0),
      0,
    );

    const productMap = new Map<
      string,
      { quantity: number; revenue: number }
    >();

    const customerMap = new Map<
      string,
      { orders: number; revenue: number }
    >();

    const cityMap = new Map<string, number>();
    const statusMap = new Map<string, number>();

    for (const order of validOrders) {
      for (const product of order.products ?? []) {
        const current = productMap.get(product.name) ?? {
          quantity: 0,
          revenue: 0,
        };

        productMap.set(product.name, {
          quantity:
            current.quantity + Number(product.quantity || 0),
          revenue:
            current.revenue +
            Number(
              product.rowTotal ??
                Number(product.price || 0) *
                  Number(product.quantity || 0),
            ),
        });
      }

      const customer =
        customerMap.get(order.customer_name) ?? {
          orders: 0,
          revenue: 0,
        };

      customerMap.set(order.customer_name, {
        orders: customer.orders + 1,
        revenue:
          customer.revenue + Number(order.total_price || 0),
      });

      if (order.city) {
        cityMap.set(
          order.city,
          (cityMap.get(order.city) ?? 0) + 1,
        );
      }

      statusMap.set(
        order.status,
        (statusMap.get(order.status) ?? 0) + 1,
      );
    }

    const months: {
      key: string;
      label: string;
      revenue: number;
      orders: number;
    }[] = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1,
      );
      const key = monthKey(date);
      const monthOrders = validOrders.filter(
        (order) => monthKey(new Date(order.created_at)) === key,
      );

      months.push({
        key,
        label: new Intl.DateTimeFormat("sv-SE", {
          month: "short",
          year: "2-digit",
        }).format(date),
        revenue: monthOrders.reduce(
          (sum, order) => sum + Number(order.total_price || 0),
          0,
        ),
        orders: monthOrders.length,
      });
    }

    return {
      revenueToday,
      revenueWeek,
      revenueMonth,
      totalRevenue,
      totalItems,
      orderCount: validOrders.length,
      deliveredCount: deliveredOrders.length,
      averageOrderValue:
        validOrders.length > 0
          ? totalRevenue / validOrders.length
          : 0,
      products: Array.from(productMap.entries())
        .map(([name, values]) => ({ name, ...values }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
      customers: Array.from(customerMap.entries())
        .map(([name, values]) => ({ name, ...values }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8),
      cities: Array.from(cityMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      statuses: Array.from(statusMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      months,
    };
  }, [orders]);

  const maxMonthRevenue = Math.max(
    1,
    ...statistics.months.map((month) => month.revenue),
  );

  const maxProductQuantity = Math.max(
    1,
    ...statistics.products.map((product) => product.quantity),
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Administration</p>
          <h1>Statistik</h1>
          <p>
            Försäljning, produkter, kunder och orderstatus från
            beställningarna.
          </p>
        </div>

        <div className={styles.headerActions}>
          <a href="/admin">← Adminpanelen</a>
          <a href="/admin/kunder">👤 Kundregister</a>
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
          <span>Omsättning idag</span>
          <strong>{formatCurrency(statistics.revenueToday)}</strong>
        </article>
        <article>
          <span>Denna vecka</span>
          <strong>{formatCurrency(statistics.revenueWeek)}</strong>
        </article>
        <article>
          <span>Denna månad</span>
          <strong>{formatCurrency(statistics.revenueMonth)}</strong>
        </article>
        <article>
          <span>Total omsättning</span>
          <strong>{formatCurrency(statistics.totalRevenue)}</strong>
        </article>
        <article>
          <span>Beställningar</span>
          <strong>{statistics.orderCount}</strong>
        </article>
        <article>
          <span>Levererade</span>
          <strong>{statistics.deliveredCount}</strong>
        </article>
        <article>
          <span>Sålda produkter</span>
          <strong>{statistics.totalItems}</strong>
        </article>
        <article>
          <span>Genomsnittlig order</span>
          <strong>
            {formatCurrency(statistics.averageOrderValue)}
          </strong>
        </article>
      </section>

      {loading ? (
        <section className={styles.empty}>
          <span>⏳</span>
          <h2>Hämtar statistik</h2>
        </section>
      ) : (
        <>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.eyebrow}>Utveckling</p>
                <h2>Omsättning senaste sex månaderna</h2>
              </div>
            </div>

            <div className={styles.monthChart}>
              {statistics.months.map((month) => (
                <div className={styles.monthColumn} key={month.key}>
                  <strong>{formatCurrency(month.revenue)}</strong>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${Math.max(
                          4,
                          (month.revenue / maxMonthRevenue) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <span>{month.label}</span>
                  <small>{month.orders} order</small>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.twoColumns}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>Produkter</p>
                  <h2>Mest sålda</h2>
                </div>
              </div>

              <div className={styles.ranking}>
                {statistics.products.length === 0 ? (
                  <p>Ingen produktdata finns ännu.</p>
                ) : (
                  statistics.products.map((product, index) => (
                    <div key={product.name}>
                      <span className={styles.rank}>{index + 1}</span>
                      <div className={styles.rankingContent}>
                        <div>
                          <strong>{product.name}</strong>
                          <small>
                            {product.quantity} st ·{" "}
                            {formatCurrency(product.revenue)}
                          </small>
                        </div>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progress}
                            style={{
                              width: `${
                                (product.quantity /
                                  maxProductQuantity) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>Kunder</p>
                  <h2>Största kunder</h2>
                </div>
              </div>

              <div className={styles.simpleList}>
                {statistics.customers.map((customer, index) => (
                  <div key={customer.name}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{customer.name}</strong>
                      <small>{customer.orders} beställningar</small>
                    </div>
                    <b>{formatCurrency(customer.revenue)}</b>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className={styles.twoColumns}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>Orderflöde</p>
                  <h2>Status</h2>
                </div>
              </div>

              <div className={styles.statusGrid}>
                {statistics.statuses.map((status) => (
                  <div key={status.name}>
                    <span>{status.name}</span>
                    <strong>{status.count}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>Leveransområden</p>
                  <h2>Vanligaste orter</h2>
                </div>
              </div>

              <div className={styles.simpleList}>
                {statistics.cities.map((city, index) => (
                  <div key={city.name}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{city.name}</strong>
                    </div>
                    <b>{city.count} order</b>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
