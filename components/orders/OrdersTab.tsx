"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  Order,
  OrderStatus,
} from "@/app/admin/types";

import {
  ORDER_STATUSES,
} from "@/app/admin/types";

import {
  formatPrice,
  orderContainsWaitingProduct,
} from "@/app/admin/helpers";

import OrderCard from "./OrderCard";
import OrderModal from "./OrderModal";
import PdfButtons from "./PdfButtons";

type OrdersTabProps = {
  onOrderCountChange?: (
    count: number,
  ) => void;
};

type OrderFilter =
  | "Alla"
  | OrderStatus
  | "Väntar på produkt";

type OrderSort =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

export default function OrdersTab({
  onOrderCountChange,
}: OrdersTabProps) {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [searchText, setSearchText] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState<OrderFilter>("Alla");

  const [sortOrder, setSortOrder] =
    useState<OrderSort>("newest");

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [updatingOrderId, setUpdatingOrderId] =
    useState<number | null>(null);

  const loadOrders =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } =
        await supabase
          .from("orders")
          .select("*")
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        setErrorMessage(
          `Beställningarna kunde inte hämtas: ${error.message}`,
        );

        setLoading(false);
        return;
      }

      const loadedOrders =
        (data ?? []) as Order[];

      setOrders(loadedOrders);

      onOrderCountChange?.(
        loadedOrders.length,
      );

      setSelectedOrder(
        (currentOrder) => {
          if (!currentOrder) {
            return null;
          }

          return (
            loadedOrders.find(
              (order) =>
                order.id ===
                currentOrder.id,
            ) ?? null
          );
        },
      );

      setLoading(false);
    }, [onOrderCountChange]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        selectedOrder
      ) {
        setSelectedOrder(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [selectedOrder]);

  function clearMessages() {
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  const filteredOrders =
    useMemo(() => {
      const normalizedSearch =
        searchText
          .trim()
          .toLocaleLowerCase("sv-SE");

      const matchingOrders =
        orders.filter((order) => {
          const matchesFilter =
            activeFilter === "Alla"
              ? true
              : activeFilter ===
                  "Väntar på produkt"
                ? orderContainsWaitingProduct(
                    order,
                  )
                : order.status ===
                  activeFilter;

          if (!matchesFilter) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchableText = [
            order.order_number,
            order.customer_name,
            order.phone,
            order.email,
            order.street_address,
            order.postal_code,
            order.city,
            order.delivery_message,
            ...(order.products ?? []).map(
              (product) =>
                product.name,
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(
              "sv-SE",
            );

          return searchableText.includes(
            normalizedSearch,
          );
        });

      return [...matchingOrders].sort(
        (firstOrder, secondOrder) => {
          if (sortOrder === "oldest") {
            return (
              new Date(
                firstOrder.created_at,
              ).getTime() -
              new Date(
                secondOrder.created_at,
              ).getTime()
            );
          }

          if (sortOrder === "highest") {
            return (
              Number(
                secondOrder.total_price,
              ) -
              Number(
                firstOrder.total_price,
              )
            );
          }

          if (sortOrder === "lowest") {
            return (
              Number(
                firstOrder.total_price,
              ) -
              Number(
                secondOrder.total_price,
              )
            );
          }

          return (
            new Date(
              secondOrder.created_at,
            ).getTime() -
            new Date(
              firstOrder.created_at,
            ).getTime()
          );
        },
      );
    }, [
      activeFilter,
      orders,
      searchText,
      sortOrder,
    ]);

  const orderStatistics =
    useMemo(() => {
      const newOrders =
        orders.filter(
          (order) =>
            order.status === "Ny",
        ).length;

      const plannedOrders =
        orders.filter(
          (order) =>
            order.status ===
            "Planerad",
        ).length;

      const waitingOrders =
        orders.filter((order) =>
          orderContainsWaitingProduct(
            order,
          ),
        ).length;

      const activeValue =
        orders
          .filter(
            (order) =>
              order.status !==
                "Levererad" &&
              order.status !==
                "Avbruten",
          )
          .reduce(
            (total, order) =>
              total +
              Number(
                order.total_price,
              ),
            0,
          );

      return {
        newOrders,
        plannedOrders,
        waitingOrders,
        activeValue,
      };
    }, [orders]);

  async function handleStatusChange(
    orderId: number,
    status: OrderStatus,
  ) {
    clearMessages();
    setUpdatingOrderId(orderId);

    const { error } =
      await supabase
        .from("orders")
        .update({
          status,
        })
        .eq("id", orderId);

    if (error) {
      setErrorMessage(
        `Orderstatusen kunde inte ändras: ${error.message}`,
      );

      setUpdatingOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map(
        (order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order,
      ),
    );

    setSelectedOrder(
      (currentOrder) =>
        currentOrder?.id ===
        orderId
          ? {
              ...currentOrder,
              status,
            }
          : currentOrder,
    );

    setSuccessMessage(
      `Orderstatusen har ändrats till "${status}".`,
    );

    setUpdatingOrderId(null);
  }

  async function handleDeleteOrder(
    order: Order,
  ) {
    const confirmed =
      window.confirm(
        `Vill du verkligen radera order ${order.order_number} från ${order.customer_name}?`,
      );

    if (!confirmed) {
      return;
    }

    clearMessages();
    setUpdatingOrderId(order.id);

    const { error } =
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

    if (error) {
      setErrorMessage(
        `Ordern kunde inte raderas: ${error.message}`,
      );

      setUpdatingOrderId(null);
      return;
    }

    const remainingOrders =
      orders.filter(
        (existingOrder) =>
          existingOrder.id !==
          order.id,
      );

    setOrders(remainingOrders);

    onOrderCountChange?.(
      remainingOrders.length,
    );

    if (
      selectedOrder?.id ===
      order.id
    ) {
      setSelectedOrder(null);
    }

    setSuccessMessage(
      `Order ${order.order_number} har raderats.`,
    );

    setUpdatingOrderId(null);
  }

  function handleClearFilters() {
    setSearchText("");
    setActiveFilter("Alla");
    setSortOrder("newest");
  }

  const filterOptions:
    OrderFilter[] = [
      "Alla",
      ...ORDER_STATUSES,
      "Väntar på produkt",
    ];

  return (
    <section className="admin-content orders-admin-content">
      <div className="orders-statistics">
        <article className="admin-stat-card">
          <span className="admin-stat-icon">
            🛒
          </span>

          <div>
            <small>
              Nya beställningar
            </small>

            <strong>
              {orderStatistics.newOrders}
            </strong>
          </div>
        </article>

        <article className="admin-stat-card">
          <span className="admin-stat-icon">
            🚚
          </span>

          <div>
            <small>
              Planerade
            </small>

            <strong>
              {
                orderStatistics.plannedOrders
              }
            </strong>
          </div>
        </article>

        <article className="admin-stat-card">
          <span className="admin-stat-icon">
            ⏳
          </span>

          <div>
            <small>
              Väntar på produkt
            </small>

            <strong>
              {
                orderStatistics.waitingOrders
              }
            </strong>
          </div>
        </article>

        <article className="admin-stat-card">
          <span className="admin-stat-icon">
            💰
          </span>

          <div>
            <small>
              Aktivt ordervärde
            </small>

            <strong>
              {formatPrice(
                orderStatistics.activeValue,
              )}
            </strong>
          </div>
        </article>
      </div>

      {successMessage && (
        <div className="admin-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="admin-error">
          {errorMessage}
        </div>
      )}

      <div className="orders-toolbar">
        <div className="orders-toolbar-heading">
          <div>
            <p className="admin-eyebrow">
              Beställningar
            </p>

            <h2>
              Orderlista (
              {filteredOrders.length})
            </h2>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              void loadOrders()
            }
            disabled={loading}
          >
            {loading
              ? "Uppdaterar..."
              : "↻ Uppdatera"}
          </button>
        </div>

        <div className="orders-search-row">
          <label className="admin-search-field">
            <span>Sök order</span>

            <input
              type="search"
              value={searchText}
              placeholder="Kund, ordernummer, ort, telefon eller produkt"
              onChange={(event) =>
                setSearchText(
                  event.target.value,
                )
              }
            />
          </label>

          <label className="admin-select-field">
            <span>Sortering</span>

            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  event.target
                    .value as OrderSort,
                )
              }
            >
              <option value="newest">
                Nyaste först
              </option>

              <option value="oldest">
                Äldsta först
              </option>

              <option value="highest">
                Högsta belopp först
              </option>

              <option value="lowest">
                Lägsta belopp först
              </option>
            </select>
          </label>
        </div>

        <div className="orders-filter-buttons">
          {filterOptions.map(
            (filter) => {
              const active =
                activeFilter ===
                filter;

              return (
                <button
                  key={filter}
                  type="button"
                  className={
                    active
                      ? "filter-button filter-button-active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setActiveFilter(
                      filter,
                    )
                  }
                >
                  {filter}
                </button>
              );
            },
          )}

          {(searchText ||
            activeFilter !==
              "Alla" ||
            sortOrder !==
              "newest") && (
            <button
              type="button"
              className="filter-clear-button"
              onClick={
                handleClearFilters
              }
            >
              Rensa filter
            </button>
          )}
        </div>
      </div>

      <PdfButtons orders={orders} />

      {loading ? (
        <div className="admin-empty">
          <span>⏳</span>

          <h2>
            Hämtar beställningar
          </h2>

          <p>
            Vänta ett ögonblick.
          </p>
        </div>
      ) : filteredOrders.length ===
        0 ? (
        <div className="admin-empty">
          <span>📦</span>

          <h2>
            Inga beställningar hittades
          </h2>

          <p>
            {orders.length === 0
              ? "Det finns ännu inga beställningar."
              : "Inga beställningar matchar dina valda filter."}
          </p>

          {orders.length > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={
                handleClearFilters
              }
            >
              Visa alla beställningar
            </button>
          )}
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(
            (order) => (
              <div
                key={order.id}
                className={
                  updatingOrderId ===
                  order.id
                    ? "order-card-wrapper order-card-updating"
                    : "order-card-wrapper"
                }
              >
                <OrderCard
                  order={order}
                  onOpen={
                    setSelectedOrder
                  }
                  onStatusChange={(
                    orderId,
                    status,
                  ) =>
                    void handleStatusChange(
                      orderId,
                      status,
                    )
                  }
                  onDelete={(
                    selectedOrderToDelete,
                  ) =>
                    void handleDeleteOrder(
                      selectedOrderToDelete,
                    )
                  }
                />

                {updatingOrderId ===
                  order.id && (
                  <div className="order-updating-overlay">
                    Uppdaterar…
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() =>
            setSelectedOrder(null)
          }
          onStatusChange={(
            orderId,
            status,
          ) =>
            void handleStatusChange(
              orderId,
              status,
            )
          }
        />
      )}
    </section>
  );
}