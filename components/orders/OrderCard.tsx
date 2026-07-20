"use client";

import type {
  Order,
  OrderStatus,
} from "@/app/admin/types";

import {
  ORDER_STATUSES,
} from "@/app/admin/types";

type OrderCardProps = {
  order: Order;
  onOpen: (order: Order) => void;
  onStatusChange: (
    orderId: number,
    status: OrderStatus,
  ) => void;
  onDelete: (order: Order) => void;
};

function formatPrice(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(number) ? number : 0,
  );
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "Datum saknas";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getStatusClass(
  status: string,
) {
  return status
    .toLocaleLowerCase("sv-SE")
    .replaceAll("å", "a")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll(" ", "-");
}

export default function OrderCard({
  order,
  onOpen,
  onStatusChange,
  onDelete,
}: OrderCardProps) {
  const address = [
    order.street_address,
    `${order.postal_code ?? ""} ${
      order.city ?? ""
    }`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="modern-order-card">
      <header className="modern-order-header">
        <div>
          <p className="modern-order-number">
            {order.order_number}
          </p>

          <h3>{order.customer_name}</h3>

          <p className="modern-order-created">
            Beställd{" "}
            {formatDateTime(
              order.created_at,
            )}
          </p>
        </div>

        <span
          className={`modern-status modern-status-${getStatusClass(
            order.status,
          )}`}
        >
          {order.status}
        </span>
      </header>

      <div className="modern-order-information">
        <a href={`tel:${order.phone}`}>
          <span>📞</span>

          <strong>
            {order.phone}
          </strong>
        </a>

        {order.email && (
          <a href={`mailto:${order.email}`}>
            <span>✉️</span>

            <strong>
              {order.email}
            </strong>
          </a>
        )}

        <p>
          <span>📍</span>

          <strong>{address}</strong>
        </p>
      </div>

      <div className="modern-order-summary">
        <div>
          <span>Produkter</span>

          <strong>
            {Number(
              order.total_items ?? 0,
            )}{" "}
            st
          </strong>
        </div>

        <div>
          <span>Ordervärde</span>

          <strong>
            {formatPrice(
              order.total_price,
            )}
          </strong>
        </div>

        <div>
          <span>Leverans</span>

          <strong>
            {order.delivery_date ||
              "Inte planerad"}
          </strong>
        </div>
      </div>

      <div className="modern-order-actions">
        <button
          type="button"
          className="modern-primary-button"
          onClick={() =>
            onOpen(order)
          }
        >
          Visa hela ordern
        </button>

        <label className="modern-status-select">
          <span>Ändra status</span>

          <select
            value={order.status}
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
        </label>

        <button
          type="button"
          className="modern-delete-button"
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