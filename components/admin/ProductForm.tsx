"use client";

import type { FormEvent } from "react";

import type {
  ProductFormValues,
  ProductImageState,
} from "@/app/admin/types";

import ImageUploader from "./ImageUploader";

type ProductFormProps = {
  values: ProductFormValues;
  imageState: ProductImageState;
  editingProductId: number | string | null;
  savingProduct: boolean;
  uploadingImage: boolean;

  onChange: (
    field: keyof ProductFormValues,
    value: string | boolean,
  ) => void;

  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;

  onCancelEditing: () => void;
  onSelectImage: (file: File) => void;
  onRemoveImage: () => void;
  onRestoreImage: () => void;
  onImageError: (message: string) => void;
};

export default function ProductForm({
  values,
  imageState,
  editingProductId,
  savingProduct,
  uploadingImage,
  onChange,
  onSubmit,
  onCancelEditing,
  onSelectImage,
  onRemoveImage,
  onRestoreImage,
  onImageError,
}: ProductFormProps) {
  const isEditing =
    editingProductId !== null;

  const isBusy =
    savingProduct || uploadingImage;

  return (
    <section className="product-form-card">
      <div className="product-form-heading">
        <div>
          <p className="admin-eyebrow">
            {isEditing
              ? "Redigera produkt"
              : "Ny produkt"}
          </p>

          <h2>
            {isEditing
              ? "Ändra produkten"
              : "Lägg till produkt"}
          </h2>
        </div>
      </div>

      <form
        className="product-form"
        onSubmit={onSubmit}
      >
        <div className="product-form-grid">
          <label className="product-field product-field-full">
            <span>Produktnamn *</span>

            <input
              type="text"
              value={values.name}
              placeholder="Exempel: Grillkol 10 kg"
              required
              disabled={isBusy}
              onChange={(event) =>
                onChange(
                  "name",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="product-field product-field-full">
            <span>Beskrivning</span>

            <textarea
              value={values.description}
              placeholder="Beskriv produkten"
              disabled={isBusy}
              onChange={(event) =>
                onChange(
                  "description",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="product-field">
            <span>Pris i kronor *</span>

            <input
              type="number"
              value={values.price}
              placeholder="200"
              min="0"
              step="1"
              required
              disabled={isBusy}
              onChange={(event) =>
                onChange(
                  "price",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="product-field">
            <span>Vikt</span>

            <input
              type="text"
              value={values.weight}
              placeholder="Exempel: 10 kg"
              disabled={isBusy}
              onChange={(event) =>
                onChange(
                  "weight",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="product-field">
            <span>Sorteringsordning</span>

            <input
              type="number"
              value={values.sortOrder}
              min="0"
              step="1"
              disabled={isBusy}
              onChange={(event) =>
                onChange(
                  "sortOrder",
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <ImageUploader
          imageState={imageState}
          disabled={isBusy}
          onSelectImage={onSelectImage}
          onRemoveImage={onRemoveImage}
          onRestoreImage={onRestoreImage}
          onError={onImageError}
        />

        <div className="product-checkboxes">
          <label className="product-checkbox">
            <input
              type="checkbox"
              checked={values.available}
              disabled={isBusy}
              onChange={(event) =>
                onChange(
                  "available",
                  event.target.checked,
                )
              }
            />

            <span>
              <strong>Tillgänglig</strong>

              <small>
                Produkten går att beställa
                direkt.
              </small>
            </span>
          </label>

          <label className="product-checkbox">
            <input
              type="checkbox"
              checked={values.active}
              disabled={isBusy}
              onChange={(event) =>
                onChange(
                  "active",
                  event.target.checked,
                )
              }
            />

            <span>
              <strong>Visa på kundsidan</strong>

              <small>
                Avmarkera för att dölja
                produkten.
              </small>
            </span>
          </label>
        </div>

        <div className="product-form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={isBusy}
          >
            {uploadingImage
              ? "Laddar upp bild..."
              : savingProduct
                ? "Sparar..."
                : isEditing
                  ? "Spara ändringar"
                  : "Lägg till produkt"}
          </button>

          {isEditing && (
            <button
              type="button"
              className="secondary-button"
              disabled={isBusy}
              onClick={onCancelEditing}
            >
              Avbryt redigering
            </button>
          )}
        </div>
      </form>
    </section>
  );
}