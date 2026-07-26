"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import type { AdminTab } from "./types";

import ProductsTab from "@/components/admin/ProductsTab";
import VisitorStats from "@/components/admin/VisitorStats";
import OrdersTab from "@/components/orders/OrdersTab";
import { supabase } from "@/lib/supabase";

import styles from "./page.module.css";

type ActiveAdminView = "overview" | AdminTab;

type DashboardOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  status: string;
  total_price: number;
  delivery_date: string | null;
  created_at: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AdminPage() {
  const [activeView, setActiveView] =
    useState<ActiveAdminView>("overview");

  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  const [dashboardOrders, setDashboardOrders] =
    useState<DashboardOrder[]>([]);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState("");

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError("");

    const [ordersResponse, productsResponse] =
      await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, customer_name, status, total_price, delivery_date, created_at",
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("products")
          .select("id", {
            count: "exact",
          }),
      ]);

    if (ordersResponse.error) {
      setDashboardError(
        `Översikten kunde inte hämta beställningarna: ${ordersResponse.error.message}`,
      );
    } else {
      const normalizedOrders: DashboardOrder[] = (
        ordersResponse.data ?? []
      ).map((order) => ({
        id: Number(order.id),

        order_number: String(
          order.order_number ??
            order.id ??
            "",
        ),

        customer_name: String(
          order.customer_name ??
            "Okänd kund",
        ),

        status: String(
          order.status ?? "Ny",
        ),

        total_price: Number(
          order.total_price ?? 0,
        ),

        delivery_date:
          typeof order.delivery_date ===
          "string"
            ? order.delivery_date
            : null,

        created_at: String(
          order.created_at ?? "",
        ),
      }));

      setDashboardOrders(normalizedOrders);
      setOrderCount(normalizedOrders.length);
    }

    if (productsResponse.error) {
      setDashboardError((current) =>
        current
          ? `${current} Produkterna kunde inte hämtas: ${productsResponse.error.message}`
          : `Produkterna kunde inte hämtas: ${productsResponse.error.message}`,
      );
    } else {
      setProductCount(
        productsResponse.count ??
          productsResponse.data?.length ??
          0,
      );
    }

    setDashboardLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const dashboardStatistics = useMemo(() => {
    const today = getTodayDate();

    const newOrders = dashboardOrders.filter(
      (order) => order.status === "Ny",
    ).length;

    const plannedDeliveries =
      dashboardOrders.filter(
        (order) =>
          order.delivery_date === today &&
          order.status !== "Levererad" &&
          order.status !== "Avbruten",
      ).length;

    const deliveredOrders =
      dashboardOrders.filter(
        (order) =>
          order.status === "Levererad",
      ).length;

    const totalOrderValue = dashboardOrders
      .filter(
        (order) =>
          order.status !== "Avbruten",
      )
      .reduce(
        (total, order) =>
          total + order.total_price,
        0,
      );

    return {
      newOrders,
      plannedDeliveries,
      deliveredOrders,
      totalOrderValue,
    };
  }, [dashboardOrders]);

  const latestOrders = useMemo(
    () => dashboardOrders.slice(0, 6),
    [dashboardOrders],
  );

  function openOrders() {
    setActiveView("orders");
  }

  function openProducts() {
    setActiveView("products");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              🔥
            </div>

            <div>
              <p className={styles.eyebrow}>
                Administration
              </p>

              <h1>Grillkolsbutiken</h1>
            </div>
          </div>

          <div
            className={
              styles.headerActions
            }
          >
            <Link
              href="/"
              className={
                styles.customerLink
              }
            >
              <span>↗</span>
              Visa kundsidan
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.shell}>
        <nav
          className={
            styles.mainNavigation
          }
          aria-label="Administration"
        >
          <button
            type="button"
            className={`${
              styles.navigationButton
            } ${
              activeView === "overview"
                ? styles.navigationActive
                : ""
            }`}
            onClick={() =>
              setActiveView("overview")
            }
          >
            <span
              className={
                styles.navigationIcon
              }
            >
              🏠
            </span>

            <span>Översikt</span>
          </button>

          <button
            type="button"
            className={`${
              styles.navigationButton
            } ${
              activeView === "orders"
                ? styles.navigationActive
                : ""
            }`}
            onClick={openOrders}
          >
            <span
              className={
                styles.navigationIcon
              }
            >
              🛒
            </span>

            <span>Beställningar</span>

            <strong
              className={
                styles.navigationCount
              }
            >
              {orderCount}
            </strong>
          </button>

          <button
            type="button"
            className={`${
              styles.navigationButton
            } ${
              activeView === "products"
                ? styles.navigationActive
                : ""
            }`}
            onClick={openProducts}
          >
            <span
              className={
                styles.navigationIcon
              }
            >
              📦
            </span>

            <span>Produkter</span>

            <strong
              className={
                styles.navigationCount
              }
            >
              {productCount}
            </strong>
          </button>

          <Link
            href="/admin/leveranser"
            className={
              styles.navigationLink
            }
          >
            <span
              className={
                styles.navigationIcon
              }
            >
              🚚
            </span>

            <span>Leveranser</span>
          </Link>

          <Link
            href="/admin/plocklista"
            className={
              styles.navigationLink
            }
          >
            <span
              className={
                styles.navigationIcon
              }
            >
              📋
            </span>

            <span>Plocklista</span>
          </Link>

          <Link
            href="/admin/forare"
            className={
              styles.navigationLink
            }
          >
            <span
              className={
                styles.navigationIcon
              }
            >
              🚛
            </span>

            <span>Förarmeny</span>
          </Link>
        </nav>

        <div className={styles.content}>
          {activeView === "overview" && (
            <section
              className={styles.overview}
            >
              <article
                className={
                  styles.welcomeCard
                }
              >
                <div
                  className={
                    styles.welcomeText
                  }
                >
                  <p
                    className={
                      styles.eyebrow
                    }
                  >
                    Kontrollpanel
                  </p>

                  <h2>
                    Välkommen till
                    administrationen
                  </h2>

                  <p>
                    Här hanterar du
                    beställningar, produkter,
                    besökare, plocklistor och
                    leveranser från en och
                    samma plats.
                  </p>
                </div>

                <Link
                  href="/admin/leveranser"
                  className={
                    styles.deliveryButton
                  }
                >
                  <span>🚚</span>
                  Planera leveranser
                </Link>
              </article>

              {dashboardError && (
                <div
                  className={
                    styles.dashboardError
                  }
                >
                  {dashboardError}
                </div>
              )}

              <VisitorStats />

              <section
                className={
                  styles.statistics
                }
                aria-label="Ordersammanfattning"
              >
                <button
                  type="button"
                  className={
                    styles.statCard
                  }
                  onClick={openOrders}
                >
                  <div
                    className={
                      styles.statIcon
                    }
                  >
                    🆕
                  </div>

                  <div
                    className={
                      styles.statInformation
                    }
                  >
                    <span>
                      Nya beställningar
                    </span>

                    <strong>
                      {dashboardLoading
                        ? "..."
                        : dashboardStatistics.newOrders}
                    </strong>
                  </div>
                </button>

                <Link
                  href="/admin/leveranser"
                  className={
                    styles.statCard
                  }
                >
                  <div
                    className={
                      styles.statIcon
                    }
                  >
                    🚚
                  </div>

                  <div
                    className={
                      styles.statInformation
                    }
                  >
                    <span>
                      Leveranser idag
                    </span>

                    <strong>
                      {dashboardLoading
                        ? "..."
                        : dashboardStatistics.plannedDeliveries}
                    </strong>
                  </div>
                </Link>

                <button
                  type="button"
                  className={
                    styles.statCard
                  }
                  onClick={openOrders}
                >
                  <div
                    className={
                      styles.statIcon
                    }
                  >
                    ✅
                  </div>

                  <div
                    className={
                      styles.statInformation
                    }
                  >
                    <span>
                      Levererade order
                    </span>

                    <strong>
                      {dashboardLoading
                        ? "..."
                        : dashboardStatistics.deliveredOrders}
                    </strong>
                  </div>
                </button>

                <article
                  className={
                    styles.statCardStatic
                  }
                >
                  <div
                    className={
                      styles.statIcon
                    }
                  >
                    💰
                  </div>

                  <div
                    className={
                      styles.statInformation
                    }
                  >
                    <span>
                      Totalt ordervärde
                    </span>

                    <strong
                      className={
                        styles.currencyValue
                      }
                    >
                      {dashboardLoading
                        ? "..."
                        : formatCurrency(
                            dashboardStatistics.totalOrderValue,
                          )}
                    </strong>
                  </div>
                </article>
              </section>

              <section
                className={
                  styles.dashboardGrid
                }
              >
                <section
                  className={
                    styles.quickSection
                  }
                >
                  <div
                    className={
                      styles.sectionHeading
                    }
                  >
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      Snabbval
                    </p>

                    <h2>
                      Vad vill du göra?
                    </h2>
                  </div>

                  <div
                    className={
                      styles.quickGrid
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.quickButton
                      }
                      onClick={openOrders}
                    >
                      <span
                        className={
                          styles.quickIcon
                        }
                      >
                        🛒
                      </span>

                      <span
                        className={
                          styles.quickText
                        }
                      >
                        <strong>
                          Hantera beställningar
                        </strong>

                        <span>
                          Visa kunder,
                          adresser, produkter
                          och orderstatus.
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      className={
                        styles.quickButton
                      }
                      onClick={openProducts}
                    >
                      <span
                        className={
                          styles.quickIcon
                        }
                      >
                        📦
                      </span>

                      <span
                        className={
                          styles.quickText
                        }
                      >
                        <strong>
                          Hantera produkter
                        </strong>

                        <span>
                          Lägg till, ändra och
                          publicera produkter.
                        </span>
                      </span>
                    </button>

                    <Link
                      href="/admin/leveranser"
                      className={
                        styles.quickLink
                      }
                    >
                      <span
                        className={
                          styles.quickIcon
                        }
                      >
                        🚚
                      </span>

                      <span
                        className={
                          styles.quickText
                        }
                      >
                        <strong>
                          Planera leveransrutt
                        </strong>

                        <span>
                          Placera order på
                          kartan och bygg
                          dagens rutt.
                        </span>
                      </span>
                    </Link>

                    <Link
                      href="/admin/plocklista"
                      className={
                        styles.quickLink
                      }
                    >
                      <span
                        className={
                          styles.quickIcon
                        }
                      >
                        📋
                      </span>

                      <span
                        className={
                          styles.quickText
                        }
                      >
                        <strong>
                          Öppna plocklistan
                        </strong>

                        <span>
                          Summera alla
                          produkter som ska
                          lastas inför
                          leveransrundan.
                        </span>
                      </span>
                    </Link>

                    <Link
                      href="/admin/forare"
                      className={
                        styles.quickLink
                      }
                    >
                      <span
                        className={
                          styles.quickIcon
                        }
                      >
                        🚛
                      </span>

                      <span
                        className={
                          styles.quickText
                        }
                      >
                        <strong>
                          Öppna förarmenyn
                        </strong>

                        <span>
                          Navigera, ring
                          kunden och uppdatera
                          status.
                        </span>
                      </span>
                    </Link>
                  </div>
                </section>

                <section
                  className={
                    styles.latestOrdersCard
                  }
                >
                  <div
                    className={
                      styles.latestOrdersHeading
                    }
                  >
                    <div>
                      <p
                        className={
                          styles.eyebrow
                        }
                      >
                        Senaste
                      </p>

                      <h2>
                        Beställningar
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={openOrders}
                    >
                      Visa alla
                    </button>
                  </div>

                  {dashboardLoading ? (
                    <div
                      className={
                        styles.latestOrdersEmpty
                      }
                    >
                      Hämtar beställningar...
                    </div>
                  ) : latestOrders.length ===
                    0 ? (
                    <div
                      className={
                        styles.latestOrdersEmpty
                      }
                    >
                      Inga beställningar har
                      kommit in ännu.
                    </div>
                  ) : (
                    <div
                      className={
                        styles.latestOrdersList
                      }
                    >
                      {latestOrders.map(
                        (order) => (
                          <button
                            type="button"
                            key={order.id}
                            className={
                              styles.latestOrder
                            }
                            onClick={
                              openOrders
                            }
                          >
                            <div>
                              <strong>
                                {
                                  order.customer_name
                                }
                              </strong>

                              <span>
                                Order{" "}
                                {
                                  order.order_number
                                }{" "}
                                ·{" "}
                                {formatDateTime(
                                  order.created_at,
                                )}
                              </span>
                            </div>

                            <div
                              className={
                                styles.latestOrderRight
                              }
                            >
                              <b>
                                {formatCurrency(
                                  order.total_price,
                                )}
                              </b>

                              <small>
                                {order.status}
                              </small>
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </section>
              </section>
            </section>
          )}

          {activeView === "orders" && (
            <section
              className={styles.tabPanel}
            >
              <OrdersTab
                onOrderCountChange={
                  setOrderCount
                }
              />
            </section>
          )}

          {activeView === "products" && (
            <section
              className={styles.tabPanel}
            >
              <ProductsTab
                onProductCountChange={
                  setProductCount
                }
              />
            </section>
          )}
        </div>
      </section>
    </main>
  );
}