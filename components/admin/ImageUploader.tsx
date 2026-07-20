"use client";

import {
  type ChangeEvent,
  useRef,
} from "react";

import type {
  ProductImageState,
} from "@/app/admin/types";

import {
  validateProductImage,
} from "@/app/admin/storage";

type ImageUploaderProps = {
  imageState: ProductImageState;
  disabled?: boolean;
  onSelectImage: (file: File) => void;
  onRemoveImage: () => void;
  onRestoreImage: () => void;
  onError: (message: string) => void;
};

export default function ImageUploader({
  imageState,
  disabled = false,
  onSelectImage,
  onRemoveImage,
  onRestoreImage,
  onError,
}: ImageUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const {
    currentImageUrl,
    selectedImageFile,
    imagePreviewUrl,
    removeCurrentImage,
  } = imageState;

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError =
      validateProductImage(file);

    if (validationError) {
      onError(validationError);
      return;
    }

    onSelectImage(file);
  }

  const visibleImageUrl =
    imagePreviewUrl ||
    (!removeCurrentImage
      ? currentImageUrl
      : "");

  const hasVisibleImage =
    Boolean(visibleImageUrl);

  return (
    <div className="image-upload-field">
      <span className="image-upload-label">
        Produktbild
      </span>

      <div className="image-upload-box">
        <div className="image-preview">
          {hasVisibleImage ? (
            <img
              src={visibleImageUrl}
              alt="Förhandsvisning av produktbild"
            />
          ) : (
            <div className="image-preview-empty">
              <span>📷</span>

              <p>Ingen bild vald</p>
            </div>
          )}
        </div>

        <div className="image-upload-information">
          <strong>
            Ladda upp från dator eller
            mobil
          </strong>

          <p>
            JPEG, PNG, WebP eller GIF.
            Maximal filstorlek är 10 MB.
          </p>

          {selectedImageFile && (
            <small>
              Vald fil:{" "}
              {selectedImageFile.name}
            </small>
          )}

          <input
            ref={inputRef}
            className="image-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={disabled}
          />

          <div className="image-upload-actions">
            <button
              type="button"
              className="image-file-button"
              onClick={() =>
                inputRef.current?.click()
              }
              disabled={disabled}
            >
              {hasVisibleImage
                ? "Byt bild"
                : "Välj bild"}
            </button>

            {hasVisibleImage && (
              <button
                type="button"
                className="image-remove-button"
                onClick={onRemoveImage}
                disabled={disabled}
              >
                Ta bort bild
              </button>
            )}

            {removeCurrentImage &&
              currentImageUrl && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onRestoreImage}
                  disabled={disabled}
                >
                  Återställ bild
                </button>
              )}
          </div>

          {removeCurrentImage &&
            currentImageUrl && (
              <small className="image-remove-warning">
                Den nuvarande bilden tas
                bort när produkten sparas.
              </small>
            )}
        </div>
      </div>
    </div>
  );
}