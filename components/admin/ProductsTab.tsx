"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import "./products.css";

const IMAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type Product = {
  id: number | string;
  name: string;
  description: string | null;
  price: number;
  weight: string | null;
  image_url: string | null;
  image_path: string | null;
  available: boolean;
  active: boolean;
  sort_order: number;
};

type ProductsTabProps = {
  onProductCountChange?: (count: number) => void;
};

function createSafeFileName(file: File) {
  const extension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  const uniquePart =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return `${baseName || "produkt"}-${uniquePart}.${extension}`;
}

function validateImage(file: File) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    return "Bilden måste vara JPG, PNG eller WebP.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "Bilden får vara högst 5 MB.";
  }

  return null;
}

export default function ProductsTab({
  onProductCountChange,
}: ProductsTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<Product[]>([]);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [available, setAvailable] = useState(true);
  const [active, setActive] = useState(true);

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [existingImageUrl, setExistingImageUrl] =
    useState<string | null>(null);

  const [existingImagePath, setExistingImagePath] =
    useState<string | null>(null);

  const [removeExistingImage, setRemoveExistingImage] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busyProductId, setBusyProductId] = useState<
    Product["id"] | null
  >(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = editingProduct !== null;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select(
        `
          id,
          name,
          description,
          price,
          weight,
          image_url,
          image_path,
          available,
          active,
          sort_order
        `,
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setErrorMessage(
        `Produkterna kunde inte hämtas: ${error.message}`,
      );

      setLoading(false);
      return;
    }

    const loadedProducts = (data ?? []) as Product[];

    setProducts(loadedProducts);
    onProductCountChange?.(loadedProducts.length);
    setLoading(false);
  }, [onProductCountChange]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    return () => {
      if (
        imagePreview &&
        imagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function clearFileInput() {
    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetForm() {
    clearFileInput();

    setEditingProduct(null);
    setName("");
    setDescription("");
    setPrice("");
    setWeight("");
    setSortOrder("0");
    setAvailable(true);
    setActive(true);
    setExistingImageUrl(null);
    setExistingImagePath(null);
    setRemoveExistingImage(false);
  }

  function startEditing(product: Product) {
    clearFileInput();

    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description ?? "");
    setPrice(String(product.price));
    setWeight(product.weight ?? "");
    setSortOrder(String(product.sort_order ?? 0));
    setAvailable(product.available);
    setActive(product.active);
    setExistingImageUrl(product.image_url);
    setExistingImagePath(product.image_path);
    setRemoveExistingImage(false);
    setMessage("");
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditing() {
    resetForm();
    setMessage("Redigeringen avbröts.");
    setErrorMessage("");
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setMessage("");
    setErrorMessage("");

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      setErrorMessage(validationError);
      event.target.value = "";
      return;
    }

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  }

  function removeSelectedOrExistingImage() {
    if (selectedImage) {
      clearFileInput();
      return;
    }

    if (existingImageUrl || existingImagePath) {
      setRemoveExistingImage(true);
      setExistingImageUrl(null);
      setImagePreview(null);
    }
  }

  async function uploadSelectedImage() {
    if (!selectedImage) {
      return {
        imageUrl: null,
        imagePath: null,
      };
    }

    const fileName = createSafeFileName(selectedImage);
    const imagePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(imagePath, selectedImage, {
        cacheControl: "3600",
        contentType: selectedImage.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Bilden kunde inte laddas upp: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(imagePath);

    if (!publicUrlData.publicUrl) {
      await supabase.storage
        .from(IMAGE_BUCKET)
        .remove([imagePath]);

      throw new Error(
        "Supabase kunde inte skapa en bildadress.",
      );
    }

    return {
      imageUrl: publicUrlData.publicUrl,
      imagePath,
    };
  }

  async function removeStorageImage(
    imagePath: string | null,
  ) {
    if (!imagePath) {
      return;
    }

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove([imagePath]);

    if (error) {
      console.error(
        "Bilden kunde inte tas bort från Storage:",
        error,
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const cleanedName = name.trim();
    const numericPrice = Number(price);
    const numericSortOrder = Number(sortOrder || 0);

    if (!cleanedName) {
      setErrorMessage("Du måste ange ett produktnamn.");
      return;
    }

    if (
      price.trim() === "" ||
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      setErrorMessage("Du måste ange ett giltigt pris.");
      return;
    }

    setSaving(true);

    let newlyUploadedImagePath: string | null = null;

    try {
      let finalImageUrl = existingImageUrl;
      let finalImagePath = existingImagePath;

      if (selectedImage) {
        const uploadedImage =
          await uploadSelectedImage();

        finalImageUrl = uploadedImage.imageUrl;
        finalImagePath = uploadedImage.imagePath;
        newlyUploadedImagePath =
          uploadedImage.imagePath;
      } else if (removeExistingImage) {
        finalImageUrl = null;
        finalImagePath = null;
      }

      const productData = {
        name: cleanedName,
        description: description.trim() || null,
        price: numericPrice,
        weight: weight.trim() || null,
        image_url: finalImageUrl,
        image_path: finalImagePath,
        active,
        available,
        sort_order: Number.isNaN(numericSortOrder)
          ? 0
          : numericSortOrder,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        const oldImagePath = editingProduct.image_path;

        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) {
          if (newlyUploadedImagePath) {
            await removeStorageImage(
              newlyUploadedImagePath,
            );
          }

          throw new Error(
            `Produkten kunde inte uppdateras: ${error.message}`,
          );
        }

        const imageWasReplaced =
          selectedImage &&
          oldImagePath &&
          oldImagePath !== finalImagePath;

        const imageWasRemoved =
          removeExistingImage && oldImagePath;

        if (imageWasReplaced || imageWasRemoved) {
          await removeStorageImage(oldImagePath);
        }

        resetForm();
        setMessage("Produkten har uppdaterats.");
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);

        if (error) {
          if (newlyUploadedImagePath) {
            await removeStorageImage(
              newlyUploadedImagePath,
            );
          }

          throw new Error(
            `Produkten kunde inte sparas: ${error.message}`,
          );
        }

        resetForm();
        setMessage("Produkten har lagts till.");
      }

      await loadProducts();
    } catch (error) {
      const readableMessage =
        error instanceof Error
          ? error.message
          : "Ett okänt fel inträffade.";

      setErrorMessage(readableMessage);
      window.alert(readableMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailable(
    product: Product,
  ) {
    setMessage("");
    setErrorMessage("");
    setBusyProductId(product.id);

    const { error } = await supabase
      .from("products")
      .update({
        available: !product.available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setErrorMessage(
        `Tillgängligheten kunde inte ändras: ${error.message}`,
      );
    } else {
      setMessage("Produktens lagerstatus ändrades.");
      await loadProducts();
    }

    setBusyProductId(null);
  }

  async function handleToggleActive(
    product: Product,
  ) {
    setMessage("");
    setErrorMessage("");
    setBusyProductId(product.id);

    const { error } = await supabase
      .from("products")
      .update({
        active: !product.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setErrorMessage(
        `Synligheten kunde inte ändras: ${error.message}`,
      );
    } else {
      setMessage("Produktens synlighet ändrades.");
      await loadProducts();
    }

    setBusyProductId(null);
  }

  async function handleDeleteProduct(
    product: Product,
  ) {
    const confirmed = window.confirm(
      `Vill du radera produkten "${product.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");
    setBusyProductId(product.id);

    const { error: deleteProductError } =
      await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

    if (deleteProductError) {
      setErrorMessage(
        `Produkten kunde inte raderas: ${deleteProductError.message}`,
      );

      setBusyProductId(null);
      return;
    }

    await removeStorageImage(product.image_path);

    if (editingProduct?.id === product.id) {
      resetForm();
    }

    setMessage("Produkten har raderats.");
    await loadProducts();
    setBusyProductId(null);
  }

  const displayedPreview =
    imagePreview ||
    (!removeExistingImage
      ? existingImageUrl
      : null);

  return (
    <section className="products-manager">
      <section className="products-form-card">
        <div className="products-card-heading">
          <div>
            <p className="products-eyebrow">
              {isEditing
                ? "Redigera produkt"
                : "Ny produkt"}
            </p>

            <h2>
              {isEditing
                ? `Redigera ${editingProduct.name}`
                : "Lägg till produkt"}
            </h2>
          </div>
        </div>

        {message && (
          <div className="products-message">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="products-error">
            {errorMessage}
          </div>
        )}

        <form
          className="products-form"
          onSubmit={handleSubmit}
        >
          <div className="products-field-grid">
            <label className="products-field products-field-full">
              <span>Produktnamn *</span>

              <input
                type="text"
                value={name}
                placeholder="Exempel: Grillkol 10 kg"
                required
                disabled={saving}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </label>

            <label className="products-field products-field-full">
              <span>Beskrivning</span>

              <textarea
                value={description}
                placeholder="Skriv en utförlig beskrivning av produkten"
                disabled={saving}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />
            </label>

            <label className="products-field">
              <span>Pris i kronor *</span>

              <input
                type="number"
                value={price}
                placeholder="200"
                min="0"
                step="1"
                required
                disabled={saving}
                onChange={(event) =>
                  setPrice(event.target.value)
                }
              />
            </label>

            <label className="products-field">
              <span>Vikt</span>

              <input
                type="text"
                value={weight}
                placeholder="Exempel: 10 kg"
                disabled={saving}
                onChange={(event) =>
                  setWeight(event.target.value)
                }
              />
            </label>

            <label className="products-field products-field-full">
              <span>Sorteringsordning</span>

              <input
                type="number"
                value={sortOrder}
                min="0"
                step="1"
                disabled={saving}
                onChange={(event) =>
                  setSortOrder(event.target.value)
                }
              />
            </label>
          </div>

          <div className="product-image-uploader">
            <span className="product-image-label">
              Produktbild
            </span>

            <div className="product-image-dropzone">
              <input
                ref={fileInputRef}
                id="product-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saving}
                onChange={handleImageChange}
              />

              {displayedPreview ? (
                <div className="product-image-preview">
                  <img
                    src={displayedPreview}
                    alt="Förhandsvisning av produktbild"
                  />

                  <div className="product-image-preview-overlay">
                    <label
                      className="product-image-change"
                      htmlFor="product-image-input"
                    >
                      Byt bild
                    </label>

                    <button
                      type="button"
                      className="product-image-remove"
                      disabled={saving}
                      onClick={
                        removeSelectedOrExistingImage
                      }
                    >
                      Ta bort bild
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className="product-image-select"
                  htmlFor="product-image-input"
                >
                  <span className="product-image-icon">
                    📷
                  </span>

                  <strong>Välj produktbild</strong>

                  <small>
                    JPG, PNG eller WebP. Högst 5 MB.
                  </small>
                </label>
              )}
            </div>
          </div>

          <div className="products-checkbox-grid">
            <label className="products-checkbox">
              <input
                type="checkbox"
                checked={available}
                disabled={saving}
                onChange={(event) =>
                  setAvailable(event.target.checked)
                }
              />

              <span>
                <strong>Tillgänglig</strong>

                <small>
                  Produkten går att beställa direkt.
                </small>
              </span>
            </label>

            <label className="products-checkbox">
              <input
                type="checkbox"
                checked={active}
                disabled={saving}
                onChange={(event) =>
                  setActive(event.target.checked)
                }
              />

              <span>
                <strong>Visa på kundsidan</strong>

                <small>
                  Produkten är synlig för kunder.
                </small>
              </span>
            </label>
          </div>

          <div className="products-form-actions">
            <button
              type="submit"
              className="products-primary-button"
              disabled={saving}
            >
              {saving
                ? isEditing
                  ? "Sparar ändringarna..."
                  : "Lägger till produkten..."
                : isEditing
                  ? "Spara ändringar"
                  : "Lägg till produkt"}
            </button>

            {isEditing ? (
              <button
                type="button"
                className="products-secondary-button"
                disabled={saving}
                onClick={cancelEditing}
              >
                Avbryt
              </button>
            ) : (
              <button
                type="button"
                className="products-secondary-button"
                disabled={saving}
                onClick={resetForm}
              >
                Rensa
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="products-list-card">
        <div className="products-card-heading">
          <div>
            <p className="products-eyebrow">
              Befintliga produkter
            </p>

            <h2>Produkter ({products.length})</h2>
          </div>

          <button
            type="button"
            className="products-secondary-button"
            disabled={loading}
            onClick={() => void loadProducts()}
          >
            {loading ? "Hämtar..." : "Uppdatera"}
          </button>
        </div>

        {loading ? (
          <div className="products-empty">
            <span>⏳</span>
            <h3>Hämtar produkter</h3>
          </div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            <span>🔥</span>
            <h3>Inga produkter ännu</h3>

            <p>
              Lägg till din första produkt i formuläret.
            </p>
          </div>
        ) : (
          <div className="products-list">
            {products.map((product) => {
              const isBusy =
                busyProductId === product.id;

              return (
                <article
                  className="products-product-card"
                  key={product.id}
                >
                  <div className="products-product-image">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                      />
                    ) : (
                      <span className="products-image-placeholder">
                        🔥
                      </span>
                    )}
                  </div>

                  <div className="products-product-info">
                    <div className="products-product-top">
                      <div>
                        <h3>{product.name}</h3>

                        <div className="products-product-meta">
                          <span
                            className={
                              product.available
                                ? "products-badge products-badge-available"
                                : "products-badge products-badge-unavailable"
                            }
                          >
                            {product.available
                              ? "Tillgänglig"
                              : "Tillfälligt slut"}
                          </span>

                          {!product.active && (
                            <span className="products-badge products-badge-hidden">
                              Dold
                            </span>
                          )}

                          {product.weight && (
                            <span className="products-badge products-badge-hidden">
                              {product.weight}
                            </span>
                          )}
                        </div>
                      </div>

                      <strong className="products-product-price">
                        {Number(
                          product.price,
                        ).toLocaleString("sv-SE")}{" "}
                        kr
                      </strong>
                    </div>

                    {product.description && (
                      <p className="products-product-description">
                        {product.description}
                      </p>
                    )}

                    <div className="products-product-actions">
                      <button
                        type="button"
                        className="products-primary-button"
                        disabled={isBusy}
                        onClick={() =>
                          startEditing(product)
                        }
                      >
                        Redigera
                      </button>

                      <button
                        type="button"
                        className="products-action-button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleToggleAvailable(
                            product,
                          )
                        }
                      >
                        {product.available
                          ? "Markera som slut"
                          : "Markera som tillgänglig"}
                      </button>

                      <button
                        type="button"
                        className="products-action-button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleToggleActive(product)
                        }
                      >
                        {product.active
                          ? "Dölj från kundsidan"
                          : "Visa på kundsidan"}
                      </button>

                      <button
                        type="button"
                        className="products-danger-button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleDeleteProduct(product)
                        }
                      >
                        {isBusy
                          ? "Arbetar..."
                          : "Radera"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}