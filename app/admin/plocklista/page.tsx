"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

import styles from "./page.module.css";

type OrderStatus =
  | "Ny"
  | "Bekräftad"
  | "Planerad"
  | "Plockad"
  | "Levererad"
  | "Avbruten"
  | string;

type OrderProduct = {
  id?: number | string | null;
  product_id?: number | string | null;

  name?: string | null;
  product_name?: string | null;

  variant_id?: number | string | null;
  variant_name?: string | null;

  sku?: string | null;
  weight?: string | null;

  price?: number | string | null;
  quantity?: number | string | null;

  rowTotal?: number | string | null;
  row_total?: number | string | null;
};

type Order = {
  id: number;
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
  total_price: number | null;

  status: OrderStatus | null;
  created_at: string;
};

type PickingItem = {
  key: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  orderCount: number;
};

const STATUS_OPTIONS = [
  "Ny",
  "Bekräftad",
  "Planerad",
  "Plockad",
  "Levererad",
  "Avbruten",
];

function getNumber(
  value: number | string | null | undefined,
) {
  const parsedValue = Number(value ?? 0);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}

function getProductName(product: OrderProduct) {
  return (
    product.name?.trim() ||
    product.product_name?.trim() ||
    "Okänd produkt"
  );
}

function getVariantName(product: OrderProduct) {
  const variantName =
    product.variant_name?.trim();

  if (variantName) {
    return variantName;
  }

  const weight = product.weight?.trim();

  if (
    weight &&
    weight.toLowerCase() !==
      getProductName(product).toLowerCase()
  ) {
    return weight;
  }

  return "";
}

function createProductKey(product: OrderProduct) {
  const productId =
    product.product_id ?? product.id ?? "";

  const variantId = product.variant_id ?? "";

  const productName =
    getProductName(product).toLowerCase();

  const variantName =
    getVariantName(product).toLowerCase();

  const sku =
    product.sku?.trim().toLowerCase() ?? "";

  return [
    productId,
    variantId,
    productName,
    variantName,
    sku,
  ].join("::");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Datum ej bestämt";
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
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

function formatAddress(order: Order) {
  return [
    order.street_address,
    [order.postal_code, order.city]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function getOrderProductText(product: OrderProduct) {
  const quantity = getNumber(product.quantity);
  const productName = getProductName(product);
  const variantName = getVariantName(product);

  return `${quantity} × ${productName}${
    variantName ? ` – ${variantName}` : ""
  }`;
}

export default function PickingListPage() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [selectedOrderIds, setSelectedOrderIds] =
    useState<Set<number>>(new Set());

  const [statusFilter, setStatusFilter] =
    useState("Planerad");

  const [dateFilter, setDateFilter] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_name,
        phone,
        email,
        street_address,
        postal_code,
        city,
        delivery_date,
        delivery_message,
        products,
        total_items,
        total_price,
        status,
        created_at
      `)
      .order("delivery_date", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setErrorMessage(
        `Beställningarna kunde inte hämtas: ${error.message}`,
      );

      setLoading(false);
      return;
    }

    const loadedOrders = (data ?? []) as Order[];

    setOrders(loadedOrders);

    const plannedOrderIds = loadedOrders
      .filter(
        (order) => order.status === "Planerad",
      )
      .map((order) => order.id);

    setSelectedOrderIds(
      new Set(plannedOrderIds),
    );

    setLastUpdated(
      new Date().toISOString(),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "Alla" ||
        order.status === statusFilter;

      const matchesDate =
        !dateFilter ||
        order.delivery_date === dateFilter;

      const searchableText = [
        order.order_number,
        order.customer_name,
        order.street_address,
        order.postal_code,
        order.city,
        order.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        );

      return (
        matchesStatus &&
        matchesDate &&
        matchesSearch
      );
    });
  }, [
    dateFilter,
    orders,
    searchText,
    statusFilter,
  ]);

  const selectedOrders = useMemo(() => {
    return orders.filter((order) =>
      selectedOrderIds.has(order.id),
    );
  }, [orders, selectedOrderIds]);

  const pickingItems = useMemo<
    PickingItem[]
  >(() => {
    const productMap = new Map<
      string,
      {
        productName: string;
        variantName: string;
        sku: string;
        quantity: number;
        orderIds: Set<number>;
      }
    >();

    selectedOrders.forEach((order) => {
      const products = Array.isArray(
        order.products,
      )
        ? order.products
        : [];

      products.forEach((product) => {
        const quantity = getNumber(
          product.quantity,
        );

        if (quantity <= 0) {
          return;
        }

        const key =
          createProductKey(product);

        const existingItem =
          productMap.get(key);

        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.orderIds.add(order.id);

          return;
        }

        productMap.set(key, {
          productName:
            getProductName(product),
          variantName:
            getVariantName(product),
          sku: product.sku?.trim() ?? "",
          quantity,
          orderIds: new Set([order.id]),
        });
      });
    });

    return Array.from(
      productMap.entries(),
    )
      .map(([key, item]) => ({
        key,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        orderCount: item.orderIds.size,
      }))
      .sort((a, b) => {
        const productComparison =
          a.productName.localeCompare(
            b.productName,
            "sv",
          );

        if (productComparison !== 0) {
          return productComparison;
        }

        return a.variantName.localeCompare(
          b.variantName,
          "sv",
        );
      });
  }, [selectedOrders]);

  const totalUnits = useMemo(() => {
    return pickingItems.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );
  }, [pickingItems]);

  const selectedDeliveryDates =
    useMemo(() => {
      return Array.from(
        new Set(
          selectedOrders
            .map(
              (order) =>
                order.delivery_date,
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ),
      ).sort();
    }, [selectedOrders]);

  function toggleOrder(orderId: number) {
    setSelectedOrderIds(
      (currentSelectedIds) => {
        const nextSelectedIds = new Set(
          currentSelectedIds,
        );

        if (
          nextSelectedIds.has(orderId)
        ) {
          nextSelectedIds.delete(orderId);
        } else {
          nextSelectedIds.add(orderId);
        }

        return nextSelectedIds;
      },
    );
  }

  function selectAllVisibleOrders() {
    setSelectedOrderIds(
      (currentSelectedIds) => {
        const nextSelectedIds = new Set(
          currentSelectedIds,
        );

        filteredOrders.forEach((order) => {
          nextSelectedIds.add(order.id);
        });

        return nextSelectedIds;
      },
    );
  }

  function deselectAllVisibleOrders() {
    setSelectedOrderIds(
      (currentSelectedIds) => {
        const nextSelectedIds = new Set(
          currentSelectedIds,
        );

        filteredOrders.forEach((order) => {
          nextSelectedIds.delete(order.id);
        });

        return nextSelectedIds;
      },
    );
  }

  function selectOnlyPlannedOrders() {
    const plannedOrderIds = orders
      .filter(
        (order) =>
          order.status === "Planerad",
      )
      .map((order) => order.id);

    setSelectedOrderIds(
      new Set(plannedOrderIds),
    );

    setStatusFilter("Planerad");
    setDateFilter("");
    setSearchText("");
  }

  function printPickingList() {
    if (selectedOrders.length === 0) {
      window.alert(
        "Välj minst en beställning innan du skriver ut plocklistan.",
      );

      return;
    }

    window.print();
  }

  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) =>
      selectedOrderIds.has(order.id),
    );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Leveransförberedelse
          </p>

          <h1>Plocklista</h1>

          <p className={styles.intro}>
            Välj beställningarna som ska
            ingå i leveransrundan. Alla
            produkter summeras automatiskt.
          </p>
        </div>

        <div
          className={styles.headerActions}
        >
          <Link
            href="/admin/leveranser"
            className={styles.secondaryButton}
          >
            ← Leveranser
          </Link>

          <Link
            href="/admin"
            className={styles.secondaryButton}
          >
            Administration
          </Link>

          <button
            type="button"
            className={styles.printButton}
            onClick={printPickingList}
            disabled={
              selectedOrders.length === 0
            }
          >
            Skriv ut plocklista
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className={styles.errorBox}>
          <strong>Ett fel uppstod</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      <section
        className={styles.controlPanel}
      >
        <div className={styles.filters}>
          <label>
            <span>Status</span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <option value="Alla">
                Alla statusar
              </option>

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>Leveransdatum</span>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(
                  event.target.value,
                )
              }
            />
          </label>

          <label
            className={styles.searchField}
          >
            <span>Sök beställning</span>

            <input
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value,
                )
              }
              placeholder="Kund, ordernummer eller ort"
            />
          </label>
        </div>

        <div className={styles.selectionActions}>
          <button
            type="button"
            onClick={selectOnlyPlannedOrders}
          >
            Välj alla planerade
          </button>

          <button
            type="button"
            onClick={selectAllVisibleOrders}
            disabled={
              filteredOrders.length === 0 ||
              allVisibleSelected
            }
          >
            Välj alla som visas
          </button>

          <button
            type="button"
            onClick={
              deselectAllVisibleOrders
            }
            disabled={
              filteredOrders.length === 0
            }
          >
            Avmarkera visade
          </button>

          <button
            type="button"
            onClick={() =>
              void loadOrders()
            }
            disabled={loading}
          >
            {loading
              ? "Uppdaterar..."
              : "Uppdatera"}
          </button>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <article>
          <span>Valda beställningar</span>
          <strong>
            {selectedOrders.length}
          </strong>
        </article>

        <article>
          <span>Olika produkter</span>
          <strong>
            {pickingItems.length}
          </strong>
        </article>

        <article>
          <span>Totalt att plocka</span>
          <strong>
            {totalUnits} st
          </strong>
        </article>

        <article>
          <span>Visade beställningar</span>
          <strong>
            {filteredOrders.length}
          </strong>
        </article>
      </section>

      <div className={styles.screenLayout}>
        <section
          className={styles.ordersPanel}
        >
          <div
            className={styles.sectionHeading}
          >
            <div>
              <p className={styles.eyebrow}>
                Beställningar
              </p>

              <h2>Välj leveranser</h2>
            </div>

            <span>
              {
                filteredOrders.filter(
                  (order) =>
                    selectedOrderIds.has(
                      order.id,
                    ),
                ).length
              }{" "}
              valda i listan
            </span>
          </div>

          {loading ? (
            <div className={styles.emptyBox}>
              Hämtar beställningar...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className={styles.emptyBox}>
              Inga beställningar matchar
              filtret.
            </div>
          ) : (
            <div className={styles.orderList}>
              {filteredOrders.map(
                (order) => {
                  const products =
                    Array.isArray(
                      order.products,
                    )
                      ? order.products
                      : [];

                  const selected =
                    selectedOrderIds.has(
                      order.id,
                    );

                  return (
                    <label
                      key={order.id}
                      className={`${styles.orderCard} ${
                        selected
                          ? styles.orderCardSelected
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleOrder(order.id)
                        }
                      />

                      <div
                        className={
                          styles.orderContent
                        }
                      >
                        <div
                          className={
                            styles.orderTop
                          }
                        >
                          <div>
                            <strong>
                              {order.customer_name ||
                                "Kund saknas"}
                            </strong>

                            <span>
                              {order.order_number ||
                                `Order ${order.id}`}
                            </span>
                          </div>

                          <span
                            className={
                              styles.statusBadge
                            }
                          >
                            {order.status ||
                              "Ingen status"}
                          </span>
                        </div>

                        <p
                          className={
                            styles.address
                          }
                        >
                          {formatAddress(order) ||
                            "Adress saknas"}
                        </p>

                        <div
                          className={
                            styles.orderMeta
                          }
                        >
                          <span>
                            Leverans:{" "}
                            {formatDate(
                              order.delivery_date,
                            )}
                          </span>

                          <span>
                            {products.reduce(
                              (
                                total,
                                product,
                              ) =>
                                total +
                                getNumber(
                                  product.quantity,
                                ),
                              0,
                            )}{" "}
                            artiklar
                          </span>
                        </div>

                        <div
                          className={
                            styles.orderProducts
                          }
                        >
                          {products.length ===
                          0 ? (
                            <span>
                              Inga produkter
                              registrerade
                            </span>
                          ) : (
                            products.map(
                              (
                                product,
                                index,
                              ) => (
                                <span
                                  key={`${order.id}-${index}`}
                                >
                                  {getOrderProductText(
                                    product,
                                  )}
                                </span>
                              ),
                            )
                          )}
                        </div>
                      </div>
                    </label>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section
          className={styles.previewPanel}
        >
          <div
            className={styles.sectionHeading}
          >
            <div>
              <p className={styles.eyebrow}>
                Sammanställning
              </p>

              <h2>Att plocka</h2>
            </div>
          </div>

          {pickingItems.length === 0 ? (
            <div className={styles.emptyBox}>
              Välj en eller flera
              beställningar för att skapa
              plocklistan.
            </div>
          ) : (
            <div
              className={
                styles.pickingTableWrapper
              }
            >
              <table
                className={
                  styles.pickingTable
                }
              >
                <thead>
                  <tr>
                    <th>Produkt</th>
                    <th>Variant</th>
                    <th>Antal</th>
                  </tr>
                </thead>

                <tbody>
                  {pickingItems.map(
                    (item) => (
                      <tr key={item.key}>
                        <td>
                          <strong>
                            {item.productName}
                          </strong>

                          {item.sku && (
                            <small>
                              Artikelnummer:{" "}
                              {item.sku}
                            </small>
                          )}
                        </td>

                        <td>
                          {item.variantName ||
                            "Standard"}
                        </td>

                        <td
                          className={
                            styles.quantityCell
                          }
                        >
                          {item.quantity}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={2}>
                      Totalt antal
                    </td>

                    <td
                      className={
                        styles.quantityCell
                      }
                    >
                      {totalUnits}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className={styles.printSheet}>
        <div className={styles.printHeader}>
          <div>
            <p>Grillkolsbutiken</p>
            <h1>Plocklista</h1>
          </div>

          <div
            className={styles.printInformation}
          >
            <span>
              Utskriven:{" "}
              {new Intl.DateTimeFormat(
                "sv-SE",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              ).format(new Date())}
            </span>

            <span>
              Leveransdatum:{" "}
              {selectedDeliveryDates.length ===
              0
                ? "Ej angivet"
                : selectedDeliveryDates
                    .map(formatDate)
                    .join(", ")}
            </span>
          </div>
        </div>

        <div className={styles.printSummary}>
          <div>
            <span>Beställningar</span>
            <strong>
              {selectedOrders.length}
            </strong>
          </div>

          <div>
            <span>Produktsorter</span>
            <strong>
              {pickingItems.length}
            </strong>
          </div>

          <div>
            <span>Totalt antal</span>
            <strong>
              {totalUnits}
            </strong>
          </div>
        </div>

        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>Klart</th>
              <th>Produkt</th>
              <th>Variant/storlek</th>
              <th>Art.nr</th>
              <th>Antal</th>
            </tr>
          </thead>

          <tbody>
            {pickingItems.map((item) => (
              <tr key={item.key}>
                <td
                  className={
                    styles.checkColumn
                  }
                >
                  □
                </td>

                <td>
                  <strong>
                    {item.productName}
                  </strong>
                </td>

                <td>
                  {item.variantName ||
                    "Standard"}
                </td>

                <td>{item.sku || "–"}</td>

                <td
                  className={
                    styles.printQuantity
                  }
                >
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={4}>
                Totalt att lasta
              </td>

              <td
                className={
                  styles.printQuantity
                }
              >
                {totalUnits}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className={styles.printOrders}>
          <strong>
            Beställningar som ingår:
          </strong>

          <p>
            {selectedOrders
              .map(
                (order) =>
                  `${
                    order.order_number ||
                    `Order ${order.id}`
                  } – ${
                    order.customer_name ||
                    "Kund saknas"
                  }`,
              )
              .join(" • ")}
          </p>
        </div>

        <div className={styles.printNotes}>
          <span>Anteckningar</span>

          <div />
          <div />
        </div>
      </section>

      {lastUpdated && (
        <p className={styles.updatedText}>
          Senast uppdaterad{" "}
          {formatDateTime(lastUpdated)}
        </p>
      )}
    </main>
  );
}