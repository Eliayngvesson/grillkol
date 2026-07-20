"use client";

import type {
  Order,
  OrderStatus,
} from "@/app/admin/types";

import {
  formatDate,
  formatDateTime,
  formatPrice,
} from "@/app/admin/helpers";

type OrderModalProps = {
  order: Order;
  onClose: () => void;
  onStatusChange: (
    orderId: number,
    status: OrderStatus,
  ) => void;
};

const ORDER_STATUSES: OrderStatus[] = [
  "Ny",
  "Bekräftad",
  "Planerad",
  "Levererad",
  "Avbruten",
];

export default function OrderModal({
  order,
  onClose,
  onStatusChange,
}: OrderModalProps) {
  return (
    <div
      className="order-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="order-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="order-modal-heading">
          <div>
            <p className="admin-eyebrow">
              {order.order_number}
            </p>

            <h2 id="order-modal-title">
              {order.customer_name}
            </h2>

            <p>
              Beställd{" "}
              {formatDateTime(
                order.created_at,
              )}
            </p>
          </div>

          <button
            type="button"
            className="order-modal-close"
            aria-label="Stäng ordern"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="order-detail-grid">
          <div>
            <span>Telefon</span>

            <a href={`tel:${order.phone}`}>
              {order.phone}
            </a>
          </div>

          <div>
            <span>E-post</span>

            {order.email ? (
              <a
                href={`mailto:${order.email}`}
              >
                {order.email}
              </a>
            ) : (
              <strong>
                Inte angivet
              </strong>
            )}
          </div>

          <div>
            <span>Status</span>

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
          </div>

          <div>
            <span>
              Önskat leveransdatum
            </span>

            <strong>
              {formatDate(
                order.delivery_date,
              )}
            </strong>
          </div>
        </div>

        <div className="modal-section">
          <h3>Leveransadress</h3>

          <p>{order.street_address}</p>

          <p>
            {order.postal_code}{" "}
            {order.city}
          </p>

          {order.latitude !== null &&
            order.longitude !== null && (
              <a
                className="map-link"
                href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Öppna adressen i Google
                Maps
              </a>
            )}
        </div>

        <div className="modal-section">
          <h3>Produkter</h3>

          {(order.products ?? []).length ===
          0 ? (
            <p>
              Inga produktuppgifter
              finns sparade på ordern.
            </p>
          ) : (
            <div className="modal-products">
              {(order.products ?? []).map(
                (product, index) => {
                  const waiting =
                    product.waitingForAvailability ===
                    true;

                  return (
                    <div
                      className={`modal-product-row ${
                        waiting
                          ? "modal-product-waiting"
                          : ""
                      }`}
                      key={`${
                        product.id ??
                        product.name
                      }-${index}`}
                    >
                      <div>
                        <span>
                          {product.quantity} ×{" "}
                          {product.name}
                        </span>

                        {product.weight && (
                          <small>
                            {product.weight}
                          </small>
                        )}

                        {waiting && (
                          <strong className="waiting-product-text">
                            ⏳ Kunden har
                            godkänt att vänta
                            på nästa leverans
                          </strong>
                        )}
                      </div>

                      <strong>
                        {formatPrice(
                          product.rowTotal ??
                            Number(
                              product.price,
                            ) *
                              Number(
                                product.quantity,
                              ),
                        )}
                      </strong>
                    </div>
                  );
                },
              )}
            </div>
          )}

          <div className="modal-total">
            <span>
              Totalt antal
            </span>

            <strong>
              {order.total_items} st
            </strong>
          </div>

          <div className="modal-total">
            <span>Totalsumma</span>

            <strong>
              {formatPrice(
                order.total_price,
              )}
            </strong>
          </div>
        </div>

        {order.delivery_message && (
          <div className="modal-section">
            <h3>
              Kommentar och
              leveransinformation
            </h3>

            <p className="modal-message">
              {order.delivery_message}
            </p>
          </div>
        )}

        <div className="order-modal-footer">
          <a
            href={`tel:${order.phone}`}
          >
            Ring kunden
          </a>

          {order.email && (
            <a
              href={`mailto:${order.email}?subject=Angående order ${encodeURIComponent(
                order.order_number,
              )}`}
            >
              Skicka e-post
            </a>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Stäng
          </button>
        </div>
      </section>
    </div>
  );
}