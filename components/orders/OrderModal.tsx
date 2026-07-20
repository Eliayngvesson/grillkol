"use client";

import type {
  Order,
  OrderStatus,
} from "@/app/admin/types";

import {
  ORDER_STATUSES,
} from "@/app/admin/types";

type OrderModalProps = {
  order: Order;
  onClose: () => void;
  onStatusChange: (
    orderId: number,
    status: OrderStatus,
  ) => void;
};

type OrderProduct = {
  id?: number | string;
  product_id?: number | string;
  name?: string;
  description?: string | null;
  weight?: string | null;
  variant_id?: number | string;
  variant_name?: string | null;
  sku?: string | null;
  price?: number | string;
  quantity?: number | string;
  rowTotal?: number | string;
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

export default function OrderModal({
  order,
  onClose,
  onStatusChange,
}: OrderModalProps) {
  const products =
    (order.products ??
      []) as OrderProduct[];

  const address = [
    order.street_address,
    `${order.postal_code ?? ""} ${
      order.city ?? ""
    }`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="modern-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="modern-order-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        <header className="modern-modal-header">
          <div>
            <p>
              Order{" "}
              {order.order_number}
            </p>

            <h2 id="order-modal-title">
              {order.customer_name}
            </h2>

            <span>
              Beställd{" "}
              {formatDateTime(
                order.created_at,
              )}
            </span>
          </div>

          <button
            type="button"
            className="modern-close-button"
            onClick={onClose}
            aria-label="Stäng ordern"
          >
            ×
          </button>
        </header>

        <div className="modern-modal-status-row">
          <label>
            <span>Orderstatus</span>

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

          <div>
            <span>Totalt</span>

            <strong>
              {formatPrice(
                order.total_price,
              )}
            </strong>
          </div>
        </div>

        <div className="modern-modal-grid">
          <section className="modern-detail-panel">
            <h3>Kunduppgifter</h3>

            <dl>
              <div>
                <dt>Namn</dt>

                <dd>
                  {order.customer_name}
                </dd>
              </div>

              <div>
                <dt>Telefon</dt>

                <dd>
                  <a
                    href={`tel:${order.phone}`}
                  >
                    {order.phone}
                  </a>
                </dd>
              </div>

              <div>
                <dt>E-post</dt>

                <dd>
                  {order.email ? (
                    <a
                      href={`mailto:${order.email}`}
                    >
                      {order.email}
                    </a>
                  ) : (
                    "Inte angivet"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="modern-detail-panel">
            <h3>Leverans</h3>

            <dl>
              <div>
                <dt>Adress</dt>

                <dd>{address}</dd>
              </div>

              <div>
                <dt>
                  Leveransdatum
                </dt>

                <dd>
                  {order.delivery_date ||
                    "Inte planerad"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="modern-products-panel">
          <div className="modern-products-heading">
            <h3>
              Beställda produkter
            </h3>

            <strong>
              {Number(
                order.total_items ?? 0,
              )}{" "}
              st
            </strong>
          </div>

          {products.length === 0 ? (
            <p className="modern-empty-products">
              Inga produktrader hittades.
            </p>
          ) : (
            <div className="modern-product-rows">
              {products.map(
                (product, index) => {
                  const quantity =
                    Number(
                      product.quantity ??
                        0,
                    );

                  const price =
                    Number(
                      product.price ?? 0,
                    );

                  const rowTotal =
                    Number(
                      product.rowTotal ??
                        price *
                          quantity,
                    );

                  return (
                    <article
                      className="modern-product-row"
                      key={`${
                        product.id ??
                        product.product_id ??
                        index
                      }-${index}`}
                    >
                      <div>
                        <h4>
                          {product.name ||
                            "Produkt"}
                        </h4>

                        {(product.variant_name ||
                          product.weight) && (
                          <p>
                            Variant:{" "}
                            {product.variant_name ||
                              product.weight}
                          </p>
                        )}

                        {product.sku && (
                          <small>
                            Art.nr:{" "}
                            {
                              product.sku
                            }
                          </small>
                        )}
                      </div>

                      <div className="modern-product-numbers">
                        <span>
                          {quantity} ×{" "}
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

          <div className="modern-order-total">
            <span>
              Totalt att betala
            </span>

            <strong>
              {formatPrice(
                order.total_price,
              )}
            </strong>
          </div>
        </section>

        <section className="modern-message-panel">
          <h3>
            Kundens kommentar
          </h3>

          <p>
            {order.delivery_message?.trim() ||
              "Ingen kommentar lämnades."}
          </p>
        </section>

        <footer className="modern-modal-footer">
          <a
            className="modern-contact-button"
            href={`tel:${order.phone}`}
          >
            Ring kunden
          </a>

          <button
            type="button"
            className="modern-secondary-button"
            onClick={() =>
              window.print()
            }
          >
            Skriv ut order
          </button>

          <button
            type="button"
            className="modern-primary-button"
            onClick={onClose}
          >
            Klar
          </button>
        </footer>
      </section>
    </div>
  );
}