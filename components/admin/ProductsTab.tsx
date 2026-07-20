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

type ProductId = number | string;

type ProductVariant = {
  id: number;
  product_id: ProductId;
  name: string;
  price: number;
  stock_quantity: number;
  sku: string | null;
  active: boolean;
  sort_order: number;
};

type Product = {
  id: ProductId;
  name: string;
  description: string | null;
  price: number;
  weight: string | null;
  image_url: string | null;
  image_path: string | null;
  available: boolean;
  active: boolean;
  sort_order: number;
  product_variants: ProductVariant[];
};

type VariantDraft = {
  localId: string;
  id: number | null;
  name: string;
  price: string;
  stockQuantity: string;
  sku: string;
  active: boolean;
  sortOrder: string;
};

type ProductsTabProps = {
  onProductCountChange?: (count: number) => void;
};

function createLocalId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createEmptyVariant(index = 0): VariantDraft {
  return {
    localId: createLocalId(),
    id: null,
    name: "",
    price: "",
    stockQuantity: "0",
    sku: "",
    active: true,
    sortOrder: String(index),
  };
}

function variantToDraft(variant: ProductVariant): VariantDraft {
  return {
    localId: `saved-${variant.id}`,
    id: variant.id,
    name: variant.name,
    price: String(variant.price),
    stockQuantity: String(variant.stock_quantity ?? 0),
    sku: variant.sku ?? "",
    active: variant.active,
    sortOrder: String(variant.sort_order ?? 0),
  };
}

function formatPrice(value: number) {
  return Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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

  return `${baseName || "produkt"}-${createLocalId()}.${extension}`;
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
  const [sortOrder, setSortOrder] = useState("0");
  const [available, setAvailable] = useState(true);
  const [active, setActive] = useState(true);

  const [variants, setVariants] = useState<VariantDraft[]>([
    createEmptyVariant(),
  ]);

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

  const [busyProductId, setBusyProductId] =
    useState<ProductId | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = editingProduct !== null;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        weight,
        image_url,
        image_path,
        available,
        active,
        sort_order,
        product_variants (
          id,
          product_id,
          name,
          price,
          stock_quantity,
          sku,
          active,
          sort_order
        )
      `)
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

    const loadedProducts = ((data ?? []) as Product[]).map(
      (product) => ({
        ...product,
        product_variants: [
          ...(product.product_variants ?? []),
        ].sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0),
        ),
      }),
    );

    setProducts(loadedProducts);
    onProductCountChange?.(loadedProducts.length);
    setLoading(false);
  }, [onProductCountChange]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function clearSelectedImage() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetForm() {
    clearSelectedImage();

    setEditingProduct(null);
    setName("");
    setDescription("");
    setSortOrder("0");
    setAvailable(true);
    setActive(true);
    setVariants([createEmptyVariant()]);
    setExistingImageUrl(null);
    setExistingImagePath(null);
    setRemoveExistingImage(false);
  }

  function startEditing(product: Product) {
    clearSelectedImage();

    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description ?? "");
    setSortOrder(String(product.sort_order ?? 0));
    setAvailable(product.available);
    setActive(product.active);

    setExistingImageUrl(product.image_url);
    setExistingImagePath(product.image_path);
    setRemoveExistingImage(false);

    if (product.product_variants.length > 0) {
      setVariants(
        product.product_variants.map(variantToDraft),
      );
    } else {
      setVariants([
        {
          ...createEmptyVariant(),
          name: product.weight || "Standard",
          price: String(product.price ?? 0),
        },
      ]);
    }

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

  function addVariant() {
    setVariants((current) => [
      ...current,
      createEmptyVariant(current.length),
    ]);
  }

  function updateVariant(
    localId: string,
    changes: Partial<VariantDraft>,
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.localId === localId
          ? {
              ...variant,
              ...changes,
            }
          : variant,
      ),
    );
  }

  function removeVariant(localId: string) {
    if (variants.length <= 1) {
      setErrorMessage(
        "Produkten måste ha minst en variant.",
      );
      return;
    }

    setVariants((current) =>
      current.filter(
        (variant) => variant.localId !== localId,
      ),
    );

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

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  }

  function removeImage() {
    if (selectedImage) {
      clearSelectedImage();
      return;
    }

    if (existingImageUrl || existingImagePath) {
      setExistingImageUrl(null);
      setRemoveExistingImage(true);
    }
  }

  async function uploadSelectedImage() {
    if (!selectedImage) {
      return {
        imageUrl: null,
        imagePath: null,
      };
    }

    const imagePath = `products/${createSafeFileName(
      selectedImage,
    )}`;

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

    const { data } = supabase.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(imagePath);

    if (!data.publicUrl) {
      await supabase.storage
        .from(IMAGE_BUCKET)
        .remove([imagePath]);

      throw new Error(
        "Supabase kunde inte skapa en bildadress.",
      );
    }

    return {
      imageUrl: data.publicUrl,
      imagePath,
    };
  }

  async function removeStorageImage(imagePath: string | null) {
    if (!imagePath) {
      return;
    }

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove([imagePath]);

    if (error) {
      console.error(
        "Bilden kunde inte tas bort från lagringen:",
        error,
      );
    }
  }

  function validateVariants() {
    if (variants.length === 0) {
      return "Lägg till minst en variant.";
    }

    for (const variant of variants) {
      const variantName = variant.name.trim();
      const numericPrice = Number(variant.price);
      const numericStock = Number(variant.stockQuantity);

      if (!variantName) {
        return "Alla varianter måste ha ett namn, exempelvis 50 g.";
      }

      if (
        variant.price.trim() === "" ||
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
      ) {
        return `Ange ett giltigt pris för ${variantName}.`;
      }

      if (
        variant.stockQuantity.trim() === "" ||
        !Number.isInteger(numericStock) ||
        numericStock < 0
      ) {
        return `Ange ett giltigt lagersaldo för ${variantName}.`;
      }
    }

    return null;
  }

  async function saveVariants(
    productId: ProductId,
    previousVariants: ProductVariant[],
  ) {
    const previousIds = previousVariants.map(
      (variant) => variant.id,
    );

    const currentSavedIds = variants
      .map((variant) => variant.id)
      .filter((id): id is number => id !== null);

    const idsToDelete = previousIds.filter(
      (id) => !currentSavedIds.includes(id),
    );

    if (idsToDelete.length > 0) {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .in("id", idsToDelete);

      if (error) {
        throw new Error(
          `Varianter kunde inte tas bort: ${error.message}`,
        );
      }
    }

    for (const [index, variant] of variants.entries()) {
      const parsedSortOrder = Number(variant.sortOrder);

      const variantData = {
        product_id: productId,
        name: variant.name.trim(),
        price: Number(variant.price),
        stock_quantity: Number(variant.stockQuantity),
        sku: variant.sku.trim() || null,
        active: variant.active,
        sort_order: Number.isFinite(parsedSortOrder)
          ? parsedSortOrder
          : index,
        updated_at: new Date().toISOString(),
      };

      if (variant.id !== null) {
        const { error } = await supabase
          .from("product_variants")
          .update(variantData)
          .eq("id", variant.id);

        if (error) {
          throw new Error(
            `Varianten ${variant.name} kunde inte uppdateras: ${error.message}`,
          );
        }
      } else {
        const { error } = await supabase
          .from("product_variants")
          .insert(variantData);

        if (error) {
          throw new Error(
            `Varianten ${variant.name} kunde inte sparas: ${error.message}`,
          );
        }
      }
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const cleanedName = name.trim();
    const variantError = validateVariants();

    if (!cleanedName) {
      setErrorMessage("Du måste ange ett produktnamn.");
      return;
    }

    if (variantError) {
      setErrorMessage(variantError);
      return;
    }

    setSaving(true);

    let newlyUploadedImagePath: string | null = null;

    try {
      let finalImageUrl = existingImageUrl;
      let finalImagePath = existingImagePath;

      if (selectedImage) {
        const uploadedImage = await uploadSelectedImage();

        finalImageUrl = uploadedImage.imageUrl;
        finalImagePath = uploadedImage.imagePath;
        newlyUploadedImagePath = uploadedImage.imagePath;
      } else if (removeExistingImage) {
        finalImageUrl = null;
        finalImagePath = null;
      }

      const firstVariant = variants[0];
      const parsedSortOrder = Number(sortOrder);

      const productData = {
        name: cleanedName,
        description: description.trim() || null,

        // De gamla fälten behålls tills kundsidan
        // också använder product_variants.
        price: Number(firstVariant.price),
        weight: firstVariant.name.trim(),

        image_url: finalImageUrl,
        image_path: finalImagePath,
        available,
        active,
        sort_order: Number.isFinite(parsedSortOrder)
          ? parsedSortOrder
          : 0,
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
            await removeStorageImage(newlyUploadedImagePath);
          }

          throw new Error(
            `Produkten kunde inte uppdateras: ${error.message}`,
          );
        }

        await saveVariants(
          editingProduct.id,
          editingProduct.product_variants,
        );

        if (
          oldImagePath &&
          oldImagePath !== finalImagePath &&
          (selectedImage || removeExistingImage)
        ) {
          await removeStorageImage(oldImagePath);
        }

        resetForm();
        setMessage(
          "Produkten och varianterna har uppdaterats.",
        );
      } else {
        const { data: createdProduct, error } = await supabase
          .from("products")
          .insert(productData)
          .select("id")
          .single();

        if (error || !createdProduct) {
          if (newlyUploadedImagePath) {
            await removeStorageImage(newlyUploadedImagePath);
          }

          throw new Error(
            `Produkten kunde inte sparas: ${
              error?.message || "Produkt-ID saknas."
            }`,
          );
        }

        try {
          await saveVariants(createdProduct.id, []);
        } catch (variantError) {
          await supabase
            .from("products")
            .delete()
            .eq("id", createdProduct.id);

          if (newlyUploadedImagePath) {
            await removeStorageImage(newlyUploadedImagePath);
          }

          throw variantError;
        }

        resetForm();
        setMessage(
          "Produkten och varianterna har lagts till.",
        );
      }

      await loadProducts();
    } catch (error) {
      const readableMessage =
        error instanceof Error
          ? error.message
          : "Ett okänt fel inträffade.";

      setErrorMessage(readableMessage);
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductAvailable(product: Product) {
    setBusyProductId(product.id);
    setMessage("");
    setErrorMessage("");

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
      setMessage("Produktens lagerstatus har ändrats.");
      await loadProducts();
    }

    setBusyProductId(null);
  }

  async function toggleProductActive(product: Product) {
    setBusyProductId(product.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("products")
      .update({
        active: !product.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setErrorMessage(
        `Produktens synlighet kunde inte ändras: ${error.message}`,
      );
    } else {
      setMessage("Produktens synlighet har ändrats.");
      await loadProducts();
    }

    setBusyProductId(null);
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Vill du radera "${product.name}" och alla varianter?`,
    );

    if (!confirmed) {
      return;
    }

    setBusyProductId(product.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setErrorMessage(
        `Produkten kunde inte raderas: ${error.message}`,
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

  const displayedImage =
    imagePreview ||
    (!removeExistingImage ? existingImageUrl : null);

  return (
    <section className="products-manager">
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 16,
          background:
            "linear-gradient(135deg, #1f2937, #111827)",
          color: "white",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            opacity: 0.75,
          }}
        >
          Ny produktadministration
        </p>

        <h2
          style={{
            margin: "7px 0 5px",
            fontSize: 28,
          }}
        >
          Produktvarianter V2
        </h2>

        <p
          style={{
            margin: 0,
            opacity: 0.82,
          }}
        >
          Lägg till flera storlekar, priser, lagersaldon och
          artikelnummer på samma produkt.
        </p>
      </div>

      <section className="products-form-card">
        <div className="products-card-heading">
          <div>
            <p className="products-eyebrow">
              {isEditing ? "Redigera produkt" : "Ny produkt"}
            </p>

            <h2>
              {isEditing
                ? `Redigera ${editingProduct.name}`
                : "Lägg till produkt"}
            </h2>
          </div>
        </div>

        {message && (
          <div className="products-message">{message}</div>
        )}

        {errorMessage && (
          <div className="products-error">{errorMessage}</div>
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
                placeholder="Exempel: Texas BBQ Rub"
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
                placeholder="Beskriv produkten"
                disabled={saving}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />
            </label>

            <label className="products-field products-field-full">
              <span>Produktens sorteringsordning</span>

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

          <section
            style={{
              marginTop: 26,
              padding: 20,
              border: "2px solid #e5e7eb",
              borderRadius: 16,
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div>
                <p
                  className="products-eyebrow"
                  style={{ marginBottom: 5 }}
                >
                  Produktvarianter
                </p>

                <h3
                  style={{
                    margin: 0,
                    fontSize: 21,
                  }}
                >
                  Storlekar, priser och lager
                </h3>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#6b7280",
                  }}
                >
                  Exempel: 50 g – 45 kr och 100 g – 69 kr.
                </p>
              </div>

              <button
                type="button"
                className="products-primary-button"
                disabled={saving}
                onClick={addVariant}
              >
                + Lägg till variant
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: 16,
              }}
            >
              {variants.map((variant, index) => (
                <article
                  key={variant.localId}
                  style={{
                    padding: 18,
                    border: "1px solid #d1d5db",
                    borderRadius: 14,
                    background: "white",
                    boxShadow:
                      "0 3px 12px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 15,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 17,
                      }}
                    >
                      Variant {index + 1}
                    </strong>

                    <button
                      type="button"
                      className="products-danger-button"
                      disabled={
                        saving || variants.length === 1
                      }
                      onClick={() =>
                        removeVariant(variant.localId)
                      }
                    >
                      Ta bort
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <label className="products-field">
                      <span>Storlek eller namn *</span>

                      <input
                        type="text"
                        value={variant.name}
                        placeholder="Exempel: 50 g"
                        required
                        disabled={saving}
                        onChange={(event) =>
                          updateVariant(variant.localId, {
                            name: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="products-field">
                      <span>Pris i kronor *</span>

                      <input
                        type="number"
                        value={variant.price}
                        placeholder="45"
                        min="0"
                        step="0.01"
                        required
                        disabled={saving}
                        onChange={(event) =>
                          updateVariant(variant.localId, {
                            price: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="products-field">
                      <span>Lagersaldo *</span>

                      <input
                        type="number"
                        value={variant.stockQuantity}
                        min="0"
                        step="1"
                        required
                        disabled={saving}
                        onChange={(event) =>
                          updateVariant(variant.localId, {
                            stockQuantity: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="products-field">
                      <span>Artikelnummer</span>

                      <input
                        type="text"
                        value={variant.sku}
                        placeholder="Exempel: RUB-50"
                        disabled={saving}
                        onChange={(event) =>
                          updateVariant(variant.localId, {
                            sku: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="products-field">
                      <span>Sorteringsordning</span>

                      <input
                        type="number"
                        value={variant.sortOrder}
                        min="0"
                        step="1"
                        disabled={saving}
                        onChange={(event) =>
                          updateVariant(variant.localId, {
                            sortOrder: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        alignSelf: "end",
                        minHeight: 47,
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={variant.active}
                        disabled={saving}
                        onChange={(event) =>
                          updateVariant(variant.localId, {
                            active: event.target.checked,
                          })
                        }
                      />

                      Varianten är aktiv
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div
            className="product-image-uploader"
            style={{ marginTop: 25 }}
          >
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

              {displayedImage ? (
                <div className="product-image-preview">
                  <img
                    src={displayedImage}
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
                      onClick={removeImage}
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
                  <span className="product-image-icon">📷</span>

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
                  Produkten går att beställa.
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
                ? "Sparar..."
                : isEditing
                  ? "Spara produkt"
                  : "Lägg till produkt"}
            </button>

            <button
              type="button"
              className="products-secondary-button"
              disabled={saving}
              onClick={
                isEditing ? cancelEditing : resetForm
              }
            >
              {isEditing ? "Avbryt" : "Rensa"}
            </button>
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
            <p>Lägg till din första produkt.</p>
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
                        </div>
                      </div>
                    </div>

                    {product.description && (
                      <p className="products-product-description">
                        {product.description}
                      </p>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gap: 9,
                        marginTop: 14,
                        marginBottom: 18,
                      }}
                    >
                      {product.product_variants.length === 0 ? (
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            background: "#fef3c7",
                          }}
                        >
                          Produkten saknar sparade varianter.
                        </div>
                      ) : (
                        product.product_variants.map(
                          (variant) => (
                            <div
                              key={variant.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(100px, 1fr) auto auto",
                                gap: 12,
                                alignItems: "center",
                                padding: "11px 13px",
                                border: "1px solid #e5e7eb",
                                borderRadius: 10,
                                background: "#f9fafb",
                              }}
                            >
                              <div>
                                <strong>
                                  {variant.name}
                                </strong>

                                {variant.sku && (
                                  <small
                                    style={{
                                      display: "block",
                                      marginTop: 3,
                                      color: "#6b7280",
                                    }}
                                  >
                                    Art.nr: {variant.sku}
                                  </small>
                                )}
                              </div>

                              <strong>
                                {formatPrice(variant.price)} kr
                              </strong>

                              <span
                                style={{
                                  fontSize: 13,
                                  color: "#4b5563",
                                }}
                              >
                                Lager:{" "}
                                {variant.stock_quantity}
                              </span>

                              {!variant.active && (
                                <small
                                  style={{
                                    color: "#b91c1c",
                                    fontWeight: 700,
                                  }}
                                >
                                  Varianten är dold
                                </small>
                              )}
                            </div>
                          ),
                        )
                      )}
                    </div>

                    <div className="products-product-actions">
                      <button
                        type="button"
                        className="products-primary-button"
                        disabled={isBusy}
                        onClick={() => startEditing(product)}
                      >
                        Redigera
                      </button>

                      <button
                        type="button"
                        className="products-action-button"
                        disabled={isBusy}
                        onClick={() =>
                          void toggleProductAvailable(product)
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
                          void toggleProductActive(product)
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
                          void deleteProduct(product)
                        }
                      >
                        {isBusy ? "Arbetar..." : "Radera"}
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