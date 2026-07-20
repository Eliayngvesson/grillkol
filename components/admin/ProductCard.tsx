"use client";

import type { Product } from "@/app/admin/types";
import { formatPrice } from "@/app/admin/helpers";

type ProductCardProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onToggleAvailable: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function ProductCard({
  product,
  onEdit,
  onToggleAvailable,
  onToggleActive,
  onDelete,
}: ProductCardProps) {
  const active = product.active !== false;
  const available = product.available !== false;

  return (
    <article className="admin-product-card">
      <div className="admin-product-image">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
          />
        ) : (
          <div className="admin-product-placeholder">
            🔥
          </div>
        )}
      </div>

      <div className="admin-product-information">
        <div className="admin-product-heading">
          <div>
            <h3>{product.name}</h3>

            <p>{product.weight}</p>
          </div>

          <div className="product-statuses">
            <span
              className={
                available
                  ? "product-available"
                  : "product-unavailable"
              }
            >
              {available
                ? "Tillgänglig"
                : "Tillfälligt slut"}
            </span>

            <span
              className={
                active
                  ? "product-active"
                  : "product-inactive"
              }
            >
              {active
                ? "Visas"
                : "Dold"}
            </span>
          </div>
        </div>

        <p className="admin-product-description">
          {product.description}
        </p>

        <div className="product-numbers">
          <span>
            Pris

            <strong>
              {formatPrice(product.price)}
            </strong>
          </span>

          <span>
            Sortering

            <strong>
              {product.sort_order ?? 0}
            </strong>
          </span>
        </div>

        <div className="admin-product-actions">
          <button
            type="button"
            onClick={() =>
              onEdit(product)
            }
          >
            Redigera
          </button>

          <button
            type="button"
            className={
              available
                ? "availability-button unavailable-action"
                : "availability-button available-action"
            }
            onClick={() =>
              onToggleAvailable(product)
            }
          >
            {available
              ? "Markera som slut"
              : "Markera tillgänglig"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onToggleActive(product)
            }
          >
            {active
              ? "Dölj"
              : "Visa"}
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={() =>
              onDelete(product)
            }
          >
            Radera
          </button>
        </div>
      </div>
    </article>
  );
}