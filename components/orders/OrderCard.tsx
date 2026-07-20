"use client";

import type {
  Order,
  OrderStatus,
} from "@/app/admin/types";

import {
  formatDateTime,
  formatPrice,
  getStatusClass,
  orderContainsWaitingProduct,
} from "@/app/admin/helpers";

type OrderCardProps = {
  order: Order;
  onOpen: (order: Order) => void;
  onStatusChange: (
    orderId: number,
    status: OrderStatus,
  ) => void;
  onDelete: (order: Order) => void;
};

const ORDER_STATUSES: OrderStatus[] = [
  "Ny",
  "Bekräftad",
  "Planerad",
  "Levererad",
  "Avbruten",
];

export default function OrderCard({
  order,
  onOpen,
  onStatusChange,
  onDelete,
}: OrderCardProps) {
  const waitingForProduct =
    orderContainsWaitingProduct(order);

  return (
    <article className="order-card">
      <div className="order-card-top">
        <div>
          <span className="order-number">
            {order.order_number}
          </span>

          <h2>{order.customer_name}</h2>

          <p>
            {formatDateTime(
              order.created_at,
            )}
          </p>
        </div>

        <span
          className={`status-badge status-${getStatusClass(
            order.status,
          )}`}
        >
          {order.status}
        </span>
      </div>

      {waitingForProduct && (
        <div className="waiting-order-notice">
          ⏳ Kunden har beställt en
          produkt som är tillfälligt
          slut
        </div>
      )}

      <div className="order-address">
        <strong>
          Leveransadress
        </strong>

        <span>
          {order.street_address}
        </span>

        <span>
          {order.postal_code}{" "}
          {order.city}
        </span>
      </div>

      <div className="order-contact">
        <a href={`tel:${order.phone}`}>
          📞 {order.phone}
        </a>

        {order.email && (
          <a
            href={`mailto:${order.email}`}
          >
            ✉️ {order.email}
          </a>
        )}
      </div>

      <div className="order-card-summary">
        <span>
          {order.total_items} st
        </span>

        <strong>
          {formatPrice(
            order.total_price,
          )}
        </strong>
      </div>

      <div className="order-card-actions">
        <button
          type="button"
          onClick={() =>
            onOpen(order)
          }
        >
          Visa order
        </button>

        <select
          value={order.status}
          aria-label={`Ändra status för ${order.order_number}`}
          onChange={(event) =>
            onStatusChange(
              order.id,
              event.target
                .value as OrderStatus,
            )
          }
        >
          {ORDER_STATUSES.map(
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

        <button
          type="button"
          className="danger-button"
          onClick={() =>
            onDelete(order)
          }
        >
          Radera
        </button>
      </div>
    </article>
  );
}