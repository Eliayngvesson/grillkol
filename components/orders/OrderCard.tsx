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

type OrderProduct = {
  id?: number | string;
  product_id?: number | string;

  name?: string;
  product_name?: string;

  variant_name?: string | null;
  variant?: string | null;
  weight?: string | null;
  size?: string | null;

  sku?: string | null;

  quantity?: number | string;
  price?: number | string;

  rowTotal?: number | string;
  row_total?: number | string;
  total_price?: number | string;
};

function formatPrice(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const numericValue =
    Number(value ?? 0);

  return new Intl.NumberFormat(
    "sv-SE",
    {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 0,
    },
  ).format(
    Number.isFinite(numericValue)
      ? numericValue
      : 0,
  );
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "Datum saknas";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

function statusClass(
  status: string,
) {
  return status
    .toLocaleLowerCase("sv-SE")
    .replaceAll("å", "a")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll(" ", "-");
}

function getProductName(
  product: OrderProduct,
) {
  return (
    product.name ||
    product.product_name ||
    "Produkt"
  );
}

function getVariantName(
  product: OrderProduct,
) {
  return (
    product.variant_name ||
    product.variant ||
    product.weight ||
    product.size ||
    null
  );
}

function getRowTotal(
  product: OrderProduct,
) {
  const savedTotal =
    product.rowTotal ??
    product.row_total ??
    product.total_price;

  if (
    savedTotal !== undefined &&
    savedTotal !== null
  ) {
    return Number(savedTotal);
  }

  const quantity =
    Number(product.quantity ?? 0);

  const price =
    Number(product.price ?? 0);

  return quantity * price;
}

export default function OrderCard({
  order,
  onOpen,
  onStatusChange,
  onDelete,
}: OrderCardProps) {
  const products =
    (order.products ??
      []) as OrderProduct[];

  const calculatedItemCount =
    products.reduce(
      (total, product) =>
        total +
        Number(
          product.quantity ?? 0,
        ),
      0,
    );

  const itemCount =
    calculatedItemCount > 0
      ? calculatedItemCount
      : Number(
          order.total_items ?? 0,
        );

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
            Order{" "}
            {order.order_number}
          </p>

          <h3>
            {order.customer_name}
          </h3>

          <p className="modern-order-created">
            Beställd{" "}
            {formatDateTime(
              order.created_at,
            )}
          </p>
        </div>

        <span
          className={`modern-status modern-status-${statusClass(
            order.status,
          )}`}
        >
          {order.status}
        </span>
      </header>

      <div className="modern-order-information">
        {order.phone && (
          <a
            href={`tel:${order.phone}`}
          >
            <span>📞</span>

            <strong>
              {order.phone}
            </strong>
          </a>
        )}

        {order.email && (
          <a
            href={`mailto:${order.email}`}
          >
            <span>✉️</span>

            <strong>
              {order.email}
            </strong>
          </a>
        )}

        <p>
          <span>📍</span>

          <strong>
            {address ||
              "Adress saknas"}
          </strong>
        </p>
      </div>

      <section className="order-card-products">
        <div className="order-card-products-heading">
          <div>
            <span>
              📦
            </span>

            <h4>
              Beställda produkter
            </h4>
          </div>

          <strong>
            {itemCount} st
          </strong>
        </div>

        {products.length === 0 ? (
          <p className="order-card-no-products">
            Produktinformationen
            saknas på denna order.
          </p>
        ) : (
          <div className="order-card-product-list">
            {products.map(
              (
                product,
                index,
              ) => {
                const quantity =
                  Number(
                    product.quantity ??
                      0,
                  );

                const price =
                  Number(
                    product.price ??
                      0,
                  );

                const variant =
                  getVariantName(
                    product,
                  );

                const rowTotal =
                  getRowTotal(
                    product,
                  );

                return (
                  <article
                    className="order-card-product-row"
                    key={`${
                      product.id ??
                      product.product_id ??
                      index
                    }-${index}`}
                  >
                    <div className="order-card-product-description">
                      <strong>
                        {getProductName(
                          product,
                        )}
                      </strong>

                      {variant && (
                        <span>
                          Variant:{" "}
                          {variant}
                        </span>
                      )}

                      {product.sku && (
                        <small>
                          Art.nr:{" "}
                          {product.sku}
                        </small>
                      )}
                    </div>

                    <div className="order-card-product-price">
                      <span>
                        {quantity} st ×{" "}
                        {formatPrice(
                          price,
                        )}
                      </span>

                      <strong>
                        {formatPrice(
                          rowTotal,
                        )}
                      </strong>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      <div className="modern-order-summary">
        <div>
          <span>
            Antal produkter
          </span>

          <strong>
            {itemCount} st
          </strong>
        </div>

        <div>
          <span>
            Ordervärde
          </span>

          <strong>
            {formatPrice(
              order.total_price,
            )}
          </strong>
        </div>

        <div>
          <span>
            Leverans
          </span>

          <strong>
            {order.delivery_date ||
              "Inte planerad"}
          </strong>
        </div>
      </div>

      {order.delivery_message && (
        <div className="order-card-message">
          <span>
            Kundens kommentar
          </span>

          <p>
            {
              order.delivery_message
            }
          </p>
        </div>
      )}

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
          <span>
            Ändra status
          </span>

          <select
            value={order.status}
            onChange={(
              event,
            ) =>
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