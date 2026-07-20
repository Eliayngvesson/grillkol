"use client";

import { useState } from "react";
import Link from "next/link";

import type { AdminTab } from "./types";

import ProductsTab from "@/components/admin/ProductsTab";
import OrdersTab from "@/components/orders/OrdersTab";

import styles from "./page.module.css";

type ActiveAdminView =
  | "overview"
  | AdminTab;

export default function AdminPage() {
  const [activeView, setActiveView] =
    useState<ActiveAdminView>("overview");

  const [orderCount, setOrderCount] =
    useState(0);

  const [productCount, setProductCount] =
    useState(0);

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

          <div className={styles.headerActions}>
            <Link
              href="/"
              className={styles.customerLink}
            >
              <span>↗</span>
              Visa kundsidan
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.shell}>
        <nav
          className={styles.mainNavigation}
          aria-label="Administration"
        >
          <button
            type="button"
            className={`${styles.navigationButton} ${
              activeView === "overview"
                ? styles.navigationActive
                : ""
            }`}
            onClick={() =>
              setActiveView("overview")
            }
          >
            <span
              className={styles.navigationIcon}
            >
              🏠
            </span>

            <span>Översikt</span>
          </button>

          <button
            type="button"
            className={`${styles.navigationButton} ${
              activeView === "orders"
                ? styles.navigationActive
                : ""
            }`}
            onClick={openOrders}
          >
            <span
              className={styles.navigationIcon}
            >
              🛒
            </span>

            <span>Beställningar</span>

            <strong
              className={styles.navigationCount}
            >
              {orderCount}
            </strong>
          </button>

          <button
            type="button"
            className={`${styles.navigationButton} ${
              activeView === "products"
                ? styles.navigationActive
                : ""
            }`}
            onClick={openProducts}
          >
            <span
              className={styles.navigationIcon}
            >
              📦
            </span>

            <span>Produkter</span>

            <strong
              className={styles.navigationCount}
            >
              {productCount}
            </strong>
          </button>

          <Link
            href="/admin/leveranser"
            className={styles.navigationLink}
          >
            <span
              className={styles.navigationIcon}
            >
              🚚
            </span>

            <span>Leveranser</span>
          </Link>
        </nav>

        <div className={styles.content}>
          {activeView === "overview" && (
            <section className={styles.overview}>
              <article
                className={styles.welcomeCard}
              >
                <div
                  className={styles.welcomeText}
                >
                  <p className={styles.eyebrow}>
                    Kontrollpanel
                  </p>

                  <h2>
                    Välkommen till
                    administrationen
                  </h2>

                  <p>
                    Här hanterar du
                    beställningar, produkter
                    och leveranser från en och
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

              <section
                className={styles.statistics}
                aria-label="Sammanfattning"
              >
                <article
                  className={styles.statCard}
                >
                  <div
                    className={styles.statIcon}
                  >
                    🛒
                  </div>

                  <div
                    className={
                      styles.statInformation
                    }
                  >
                    <span>
                      Beställningar
                    </span>

                    <strong>
                      {orderCount}
                    </strong>
                  </div>
                </article>

                <article
                  className={styles.statCard}
                >
                  <div
                    className={styles.statIcon}
                  >
                    📦
                  </div>

                  <div
                    className={
                      styles.statInformation
                    }
                  >
                    <span>
                      Produkter
                    </span>

                    <strong>
                      {productCount}
                    </strong>
                  </div>
                </article>

                <article
                  className={styles.statCard}
                >
                  <div
                    className={styles.statIcon}
                  >
                    🚚
                  </div>

                  <div
                    className={
                      styles.statInformation
                    }
                  >
                    <span>
                      Leveransplanering
                    </span>

                    <strong>Aktiv</strong>
                  </div>
                </article>
              </section>

              <section
                className={styles.quickSection}
              >
                <div
                  className={
                    styles.sectionHeading
                  }
                >
                  <p className={styles.eyebrow}>
                    Snabbval
                  </p>

                  <h2>
                    Vad vill du göra?
                  </h2>
                </div>

                <div
                  className={styles.quickGrid}
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
                        produkter, adresser
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
                        Lägg till, ändra,
                        aktivera eller ta bort
                        produkter.
                      </span>
                    </span>
                  </button>

                  <Link
                    href="/admin/leveranser"
                    className={styles.quickLink}
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
                        Placera order på kartan
                        och bygg dagens rutt.
                      </span>
                    </span>
                  </Link>
                </div>
              </section>

              <section
                className={styles.quickSection}
              >
                <div
                  className={
                    styles.sectionHeading
                  }
                >
                  <p className={styles.eyebrow}>
                    Funktioner
                  </p>

                  <h2>
                    Det här finns i systemet
                  </h2>
                </div>

                <div
                  className={
                    styles.functionGrid
                  }
                >
                  <article
                    className={
                      styles.functionCard
                    }
                  >
                    <span>🛒</span>
                    <strong>
                      Beställningar
                    </strong>
                    <small>
                      Visa och uppdatera
                      kundernas order.
                    </small>
                  </article>

                  <article
                    className={
                      styles.functionCard
                    }
                  >
                    <span>📦</span>
                    <strong>
                      Produkter
                    </strong>
                    <small>
                      Priser, bilder,
                      tillgänglighet och
                      sortering.
                    </small>
                  </article>

                  <article
                    className={
                      styles.functionCard
                    }
                  >
                    <span>📍</span>
                    <strong>
                      Kartpositioner
                    </strong>
                    <small>
                      Placera leveranser på
                      kartan.
                    </small>
                  </article>

                  <article
                    className={
                      styles.functionCard
                    }
                  >
                    <span>🗺️</span>
                    <strong>
                      Ruttplanering
                    </strong>
                    <small>
                      Skapa och öppna rutter i
                      Google Maps.
                    </small>
                  </article>
                </div>
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