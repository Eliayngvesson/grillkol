"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import styles from "./storefront.module.css";

type ProductId = string | number;

type ProductVariant = {
  id: number;
  product_id: ProductId;
  name: string;
  price: number | string;
  stock_quantity: number | null;
  sku: string | null;
  active: boolean | null;
  sort_order: number | null;
};

type Product = {
  id: ProductId;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  weight: string | null;
  active: boolean | null;
  available: boolean | null;
  sort_order: number | null;
  product_variants: ProductVariant[];
};

type CustomerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  message: string;
  acceptsDeliveryTerms: boolean;
};

type SelectedVariant = {
  productId: ProductId;
  productName: string;
  productDescription: string | null;
  variantId: number;
  variantName: string;
  sku: string | null;
  price: number;
  stockQuantity: number;
  quantity: number;
};

const EMPTY_FORM: CustomerForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  streetAddress: "",
  postalCode: "",
  city: "",
  message: "",
  acceptsDeliveryTerms: false,
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function generateOrderNumber() {
  const now = new Date();

  const datePart = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const timePart = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.floor(
    100 + Math.random() * 900,
  );

  return `GK-${datePart}-${timePart}-${randomPart}`;
}

function normalizePostalCode(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 5);

  if (digits.length > 3) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }

  return digits;
}

function getVariantPrice(variant: ProductVariant) {
  const price = Number(variant.price ?? 0);

  return Number.isFinite(price) ? price : 0;
}

function getVariantStock(variant: ProductVariant) {
  const stock = Number(variant.stock_quantity ?? 0);

  if (!Number.isFinite(stock) || stock < 0) {
    return 0;
  }

  return Math.floor(stock);
}

function getQuantityKey(variantId: number) {
  return String(variantId);
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<
    Record<string, number>
  >({});

  const [form, setForm] =
    useState<CustomerForm>(EMPTY_FORM);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [
    completedOrderNumber,
    setCompletedOrderNumber,
  ] = useState("");

  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          weight,
          active,
          available,
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
        });

      if (error) {
        console.error(error);

        setErrorMessage(
          `Produkterna kunde inte hämtas: ${error.message}`,
        );

        setLoadingProducts(false);
        return;
      }

      const loadedProducts = (
        (data ?? []) as Product[]
      )
        .filter(
          (product) =>
            product.active !== false &&
            product.available !== false,
        )
        .map((product) => ({
          ...product,
          name: product.name || "Produkt",
          description:
            product.description || "",
          image_url: product.image_url || "",
          weight: product.weight || "",
          price: Number(product.price ?? 0),
          sort_order: Number(
            product.sort_order ?? 0,
          ),
          product_variants: [
            ...(product.product_variants ?? []),
          ]
            .filter(
              (variant) =>
                variant.active !== false,
            )
            .map((variant) => ({
              ...variant,
              price: Number(
                variant.price ?? 0,
              ),
              stock_quantity:
                getVariantStock(variant),
              sort_order: Number(
                variant.sort_order ?? 0,
              ),
            }))
            .sort(
              (a, b) =>
                Number(a.sort_order ?? 0) -
                Number(b.sort_order ?? 0),
            ),
        }))
        .filter(
          (product) =>
            product.product_variants.length > 0,
        );

      setProducts(loadedProducts);

      const initialQuantities: Record<
        string,
        number
      > = {};

      loadedProducts.forEach((product) => {
        product.product_variants.forEach(
          (variant) => {
            initialQuantities[
              getQuantityKey(variant.id)
            ] = 0;
          },
        );
      });

      setQuantities(initialQuantities);
      setLoadingProducts(false);
    }

    void loadProducts();
  }, []);

  const selectedVariants = useMemo<
    SelectedVariant[]
  >(() => {
    return products.flatMap((product) =>
      product.product_variants
        .map((variant) => {
          const quantity =
            quantities[
              getQuantityKey(variant.id)
            ] ?? 0;

          return {
            productId: product.id,
            productName: product.name,
            productDescription:
              product.description || null,
            variantId: variant.id,
            variantName: variant.name,
            sku: variant.sku,
            price: getVariantPrice(variant),
            stockQuantity:
              getVariantStock(variant),
            quantity,
          };
        })
        .filter(
          (variant) => variant.quantity > 0,
        ),
    );
  }, [products, quantities]);

  const totalItems = useMemo(() => {
    return selectedVariants.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );
  }, [selectedVariants]);

  const totalPrice = useMemo(() => {
    return selectedVariants.reduce(
      (total, item) =>
        total +
        item.price * item.quantity,
      0,
    );
  }, [selectedVariants]);

  function changeQuantity(
    variant: ProductVariant,
    difference: number,
  ) {
    const key = getQuantityKey(variant.id);
    const maxStock =
      getVariantStock(variant);

    setQuantities((current) => {
      const currentQuantity =
        current[key] ?? 0;

      const nextQuantity = Math.max(
        0,
        Math.min(
          maxStock,
          currentQuantity + difference,
        ),
      );

      return {
        ...current,
        [key]: nextQuantity,
      };
    });

    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateForm(
    field: keyof CustomerForm,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  }

  function validateOrder() {
    if (totalItems < 1) {
      return "Välj minst en produkt innan du skickar beställningen.";
    }

    const itemOverStock =
      selectedVariants.find(
        (item) =>
          item.quantity >
          item.stockQuantity,
      );

    if (itemOverStock) {
      return `${itemOverStock.productName} – ${itemOverStock.variantName} finns inte i valt antal.`;
    }

    if (form.firstName.trim().length < 2) {
      return "Fyll i ditt förnamn.";
    }

    if (form.lastName.trim().length < 2) {
      return "Fyll i ditt efternamn.";
    }

    if (
      form.phone.replace(/\D/g, "").length < 6
    ) {
      return "Fyll i ett giltigt telefonnummer.";
    }

    if (
      form.streetAddress.trim().length < 3
    ) {
      return "Fyll i leveransadressen.";
    }

    if (
      form.postalCode.replace(/\D/g, "")
        .length !== 5
    ) {
      return "Fyll i ett giltigt postnummer med fem siffror.";
    }

    if (form.city.trim().length < 2) {
      return "Fyll i orten.";
    }

    if (!form.acceptsDeliveryTerms) {
      return "Du behöver bekräfta att du har läst informationen om leveransområde och leveranstid.";
    }

    return "";
  }

  async function submitOrder(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setCompletedOrderNumber("");

    const validationError = validateOrder();

    if (validationError) {
      setErrorMessage(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setSubmitting(true);

    const orderNumber = generateOrderNumber();

    const customerName =
      `${form.firstName.trim()} ${form.lastName.trim()}`;

    const orderProducts =
      selectedVariants.map((item) => ({
        id: item.productId,
        product_id: item.productId,
        name: item.productName,
        description:
          item.productDescription,
        variant_id: item.variantId,
        variant_name: item.variantName,
        sku: item.sku,
        weight: item.variantName,
        price: item.price,
        quantity: item.quantity,
        rowTotal:
          item.price * item.quantity,
      }));

    const deliveryMessageParts = [
      form.message.trim(),
      "Kunden har bekräftat informationen om leveransområde och eventuell längre leveranstid.",
    ].filter(Boolean);

    const { error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customerName,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        street_address:
          form.streetAddress.trim(),
        postal_code:
          form.postalCode.trim(),
        city: form.city.trim(),
        delivery_date: null,
        delivery_message:
          deliveryMessageParts.join("\n\n"),
        products: orderProducts,
        total_items: totalItems,
        total_price: totalPrice,
        status: "Ny",
        latitude: null,
        longitude: null,
      });

    if (error) {
      console.error(error);

      setErrorMessage(
        `Beställningen kunde inte sparas: ${error.message}`,
      );

      setSubmitting(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setCompletedOrderNumber(orderNumber);

    setSuccessMessage(
      "Tack! Din beställning är mottagen. Vi kontaktar dig med information om leveransen.",
    );

    setForm(EMPTY_FORM);

    const clearedQuantities: Record<
      string,
      number
    > = {};

    products.forEach((product) => {
      product.product_variants.forEach(
        (variant) => {
          clearedQuantities[
            getQuantityKey(variant.id)
          ] = 0;
        },
      );
    });

    setQuantities(clearedQuantities);
    setSubmitting(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        aria-label="Beställ grillkol"
      >
        <img
          src="/grillkol-banner-ren.png"
          alt="Beställ grillkol med hemleverans"
          className={styles.heroImage}
        />
      </section>

      <div
        id="bestall"
        className={styles.pageContent}
      >
        {errorMessage && (
          <div className={styles.errorMessage}>
            <span>!</span>

            <div>
              <strong>
                Något behöver rättas
              </strong>

              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div
            className={styles.successMessage}
          >
            <span>✓</span>

            <div>
              <strong>
                Beställningen är mottagen
              </strong>

              <p>{successMessage}</p>

              {completedOrderNumber && (
                <p>
                  Ditt ordernummer är{" "}
                  <b>
                    {completedOrderNumber}
                  </b>
                  .
                </p>
              )}
            </div>
          </div>
        )}

        <section
          className={styles.deliveryInformation}
        >
          <div
            className={
              styles.deliveryInformationIcon
            }
          >
            🚚
          </div>

          <div
            className={
              styles.deliveryInformationContent
            }
          >
            <p
              className={
                styles.deliveryInformationLabel
              }
            >
              Viktig leveransinformation
            </p>

            <h2>Vårt leveransområde</h2>

            <p>
              Vi erbjuder utkörning inom{" "}
              <strong>Sävsjö kommun</strong>.
            </p>

            <p>
              Vi kör även till{" "}
              <strong>
                Jönköping, Växjö, Vetlanda
                och Värnamo
              </strong>{" "}
              med jämna mellanrum. Det går
              därför bra att beställa till
              dessa orter, men leveransen
              samordnas med våra körningar och
              det kan innebära en längre
              väntetid.
            </p>

            <div
              className={
                styles.deliveryCities
              }
            >
              <span>Sävsjö kommun</span>
              <span>Jönköping</span>
              <span>Växjö</span>
              <span>Vetlanda</span>
              <span>Värnamo</span>
            </div>
          </div>
        </section>

        <form
          className={styles.orderCard}
          onSubmit={submitOrder}
        >
          <section
            className={styles.productsSection}
          >
            <div
              className={styles.sectionHeader}
            >
              <span>1</span>

              <div>
                <h2>Välj produkter</h2>

                <p>
                  Välj storlek och antal.
                </p>
              </div>
            </div>

            {loadingProducts ? (
              <div
                className={styles.loadingBox}
              >
                <div
                  className={styles.spinner}
                />

                <p>Hämtar produkter...</p>
              </div>
            ) : products.length === 0 ? (
              <div
                className={styles.emptyBox}
              >
                <span>📦</span>

                <h3>
                  Inga produkter finns
                </h3>

                <p>
                  Lägg till aktiva produkter
                  och varianter i admin.
                </p>
              </div>
            ) : (
              <div
                className={styles.productList}
              >
                {products.map((product) => {
                  const selectedForProduct =
                    product.product_variants.reduce(
                      (total, variant) =>
                        total +
                        (quantities[
                          getQuantityKey(
                            variant.id,
                          )
                        ] ?? 0),
                      0,
                    );

                  const productSubtotal =
                    product.product_variants.reduce(
                      (total, variant) => {
                        const quantity =
                          quantities[
                            getQuantityKey(
                              variant.id,
                            )
                          ] ?? 0;

                        return (
                          total +
                          getVariantPrice(
                            variant,
                          ) *
                            quantity
                        );
                      },
                      0,
                    );

                  return (
                    <article
                      className={
                        styles.productRow
                      }
                      key={product.id}
                    >
                      <div
                        className={
                          styles.productImageArea
                        }
                      >
                        {product.image_url ? (
                          <img
                            src={
                              product.image_url
                            }
                            alt={product.name}
                            className={
                              styles.productImage
                            }
                          />
                        ) : (
                          <div
                            className={
                              styles.fallbackBag
                            }
                          >
                            <span>🔥</span>

                            <strong>
                              GRILLKOL
                            </strong>

                            <small>
                              VÄLJ STORLEK
                            </small>
                          </div>
                        )}
                      </div>

                      <div
                        className={
                          styles.productDetails
                        }
                      >
                        <h3>
                          {product.name}
                        </h3>

                        {product.description && (
                          <p>
                            {
                              product.description
                            }
                          </p>
                        )}

                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            marginTop: 16,
                          }}
                        >
                          {product.product_variants.map(
                            (variant) => {
                              const key =
                                getQuantityKey(
                                  variant.id,
                                );

                              const quantity =
                                quantities[key] ??
                                0;

                              const price =
                                getVariantPrice(
                                  variant,
                                );

                              const stock =
                                getVariantStock(
                                  variant,
                                );

                              const soldOut =
                                stock === 0;

                              return (
                                <div
                                  key={variant.id}
                                  style={{
                                    display:
                                      "grid",
                                    gridTemplateColumns:
                                      "minmax(110px, 1fr) auto",
                                    gap: 12,
                                    alignItems:
                                      "center",
                                    padding:
                                      "12px 14px",
                                    border:
                                      quantity > 0
                                        ? "2px solid #111827"
                                        : "1px solid #d1d5db",
                                    borderRadius:
                                      12,
                                    background:
                                      quantity > 0
                                        ? "#f3f4f6"
                                        : "#ffffff",
                                    opacity:
                                      soldOut
                                        ? 0.65
                                        : 1,
                                  }}
                                >
                                  <div>
                                    <strong
                                      style={{
                                        display:
                                          "block",
                                        fontSize:
                                          16,
                                      }}
                                    >
                                      {
                                        variant.name
                                      }
                                    </strong>

                                    <span
                                      style={{
                                        display:
                                          "block",
                                        marginTop:
                                          4,
                                        fontWeight:
                                          800,
                                      }}
                                    >
                                      {formatPrice(
                                        price,
                                      )}{" "}
                                      / st
                                    </span>

                                    <small
                                      style={{
                                        display:
                                          "block",
                                        marginTop:
                                          3,
                                        color:
                                          soldOut
                                            ? "#b91c1c"
                                            : "#6b7280",
                                      }}
                                    >
                                      {soldOut
                                        ? "Slut i lager"
                                        : `${stock} st i lager`}
                                    </small>
                                  </div>

                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "44px 38px 44px",
                                      alignItems: "center",
                                      justifyContent: "end",
                                      gap: 6,
                                      minWidth: 138,
                                      flexShrink: 0,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      disabled={
                                        quantity ===
                                          0 ||
                                        submitting
                                      }
                                      onClick={() =>
                                        changeQuantity(
                                          variant,
                                          -1,
                                        )
                                      }
                                      aria-label={`Minska antal ${product.name} ${variant.name}`}
                                      style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 10,
                                        border:
                                          "1px solid #cbd5e1",
                                        background:
                                          quantity === 0 ||
                                          submitting
                                            ? "#f1f5f9"
                                            : "#ffffff",
                                        color:
                                          quantity === 0 ||
                                          submitting
                                            ? "#94a3b8"
                                            : "#111827",
                                        fontSize: 26,
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        cursor:
                                          quantity === 0 ||
                                          submitting
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      −
                                    </button>

                                    <span
                                      style={{
                                        display: "grid",
                                        placeItems: "center",
                                        minWidth: 38,
                                        height: 44,
                                        fontSize: 18,
                                        fontWeight: 800,
                                        color: "#111827",
                                      }}
                                    >
                                      {quantity}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={
                                        soldOut ||
                                        quantity >=
                                          stock ||
                                        submitting
                                      }
                                      onClick={() =>
                                        changeQuantity(
                                          variant,
                                          1,
                                        )
                                      }
                                      aria-label={`Öka antal ${product.name} ${variant.name}`}
                                      style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 10,
                                        border:
                                          "1px solid #cbd5e1",
                                        background:
                                          soldOut ||
                                          quantity >= stock ||
                                          submitting
                                            ? "#f1f5f9"
                                            : "#ffffff",
                                        color:
                                          soldOut ||
                                          quantity >= stock ||
                                          submitting
                                            ? "#94a3b8"
                                            : "#111827",
                                        fontSize: 26,
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        cursor:
                                          soldOut ||
                                          quantity >= stock ||
                                          submitting
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>

                      <div
                        className={
                          styles.quantityColumn
                        }
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: "#6b7280",
                          }}
                        >
                          Valda
                        </span>

                        <strong>
                          {selectedForProduct} st
                        </strong>

                        <strong>
                          {formatPrice(
                            productSubtotal,
                          )}
                        </strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div
              className={
                styles.productSubtotal
              }
            >
              <span>Delsumma</span>

              <strong>
                {formatPrice(totalPrice)}
              </strong>
            </div>
          </section>

          <section
            className={styles.customerSection}
          >
            <div
              className={styles.sectionHeader}
            >
              <span>2</span>

              <div>
                <h2>Dina uppgifter</h2>

                <p>
                  Fyll i dina
                  kontaktuppgifter.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label>
                <span>
                  Förnamn <b>*</b>
                </span>

                <input
                  type="text"
                  value={form.firstName}
                  onChange={(event) =>
                    updateForm(
                      "firstName",
                      event.target.value,
                    )
                  }
                  placeholder="Förnamn"
                  autoComplete="given-name"
                  required
                />
              </label>

              <label>
                <span>
                  Efternamn <b>*</b>
                </span>

                <input
                  type="text"
                  value={form.lastName}
                  onChange={(event) =>
                    updateForm(
                      "lastName",
                      event.target.value,
                    )
                  }
                  placeholder="Efternamn"
                  autoComplete="family-name"
                  required
                />
              </label>

              <label
                className={styles.fullWidth}
              >
                <span>
                  Telefonnummer <b>*</b>
                </span>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateForm(
                      "phone",
                      event.target.value,
                    )
                  }
                  placeholder="070 123 45 67"
                  autoComplete="tel"
                  required
                />
              </label>

              <label
                className={styles.fullWidth}
              >
                <span>
                  E-post (valfritt)
                </span>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="namn@example.com"
                  autoComplete="email"
                />
              </label>
            </div>

            <div
              className={styles.addressHeader}
            >
              <span>📍</span>

              <div>
                <h2>Leveransadress</h2>

                <p>
                  Leverans inom Sävsjö kommun
                  sker löpande. Leveranser
                  till övriga angivna orter
                  samordnas med våra körningar.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label
                className={styles.fullWidth}
              >
                <span>
                  Gatuadress <b>*</b>
                </span>

                <input
                  type="text"
                  value={form.streetAddress}
                  onChange={(event) =>
                    updateForm(
                      "streetAddress",
                      event.target.value,
                    )
                  }
                  placeholder="Gatuadress"
                  autoComplete="street-address"
                  required
                />
              </label>

              <label>
                <span>
                  Postnummer <b>*</b>
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={form.postalCode}
                  onChange={(event) =>
                    updateForm(
                      "postalCode",
                      normalizePostalCode(
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="123 45"
                  autoComplete="postal-code"
                  maxLength={6}
                  required
                />
              </label>

              <label>
                <span>
                  Ort <b>*</b>
                </span>

                <input
                  type="text"
                  value={form.city}
                  onChange={(event) =>
                    updateForm(
                      "city",
                      event.target.value,
                    )
                  }
                  placeholder="Ort"
                  autoComplete="address-level2"
                  required
                />
              </label>

              <label
                className={styles.fullWidth}
              >
                <span>
                  Kommentar (valfritt)
                </span>

                <textarea
                  value={form.message}
                  onChange={(event) =>
                    updateForm(
                      "message",
                      event.target.value,
                    )
                  }
                  placeholder="Övriga önskemål eller information..."
                  rows={4}
                />
              </label>
            </div>

            <div
              className={styles.orderSummary}
            >
              <div>
                <span>Antal produkter</span>

                <strong>
                  {totalItems} st
                </strong>
              </div>

              <div
                className={
                  styles.orderSummaryTotal
                }
              >
                <span>
                  Totalt att betala
                </span>

                <strong>
                  {formatPrice(totalPrice)}
                </strong>
              </div>
            </div>

            <label
              className={
                styles.deliveryTerms
              }
            >
              <input
                type="checkbox"
                checked={
                  form.acceptsDeliveryTerms
                }
                onChange={(event) =>
                  updateForm(
                    "acceptsDeliveryTerms",
                    event.target.checked,
                  )
                }
              />

              <span
                className={
                  styles.customCheckbox
                }
                aria-hidden="true"
              >
                ✓
              </span>

              <span
                className={
                  styles.deliveryTermsText
                }
              >
                Jag har läst informationen om
                leveransområdet och förstår
                att leveranstiden kan vara
                längre till Jönköping, Växjö,
                Vetlanda och Värnamo.
              </span>
            </label>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                submitting ||
                loadingProducts
              }
            >
              {submitting ? (
                <>
                  <span
                    className={
                      styles.buttonSpinner
                    }
                  />

                  Skickar beställningen...
                </>
              ) : (
                <>
                  <span>🛒</span>
                  Skicka beställning
                </>
              )}
            </button>

            <div
              className={styles.securityText}
            >
              <span>🔒</span>

              <p>
                Dina uppgifter används
                endast för din beställning
                och leverans.
              </p>
            </div>
          </section>
        </form>

        <section
          className={styles.howItWorks}
        >
          <h2>Så här fungerar det</h2>

          <div className={styles.steps}>
            <article>
              <span>🛒</span>

              <h3>Välj produkter</h3>

              <p>
                Välj storlek och ange hur
                många du vill beställa.
              </p>
            </article>

            <article>
              <span>📝</span>

              <h3>Fyll i uppgifterna</h3>

              <p>
                Ange kontaktuppgifter och
                leveransadress.
              </p>
            </article>

            <article>
              <span>🚚</span>

              <h3>Vi kontaktar dig</h3>

              <p>
                Vi återkommer med information
                om din leverans.
              </p>
            </article>

            <article>
              <span>🔥</span>

              <h3>Dags att grilla</h3>

              <p>
                Ta emot grillkolet och tänd
                grillen.
              </p>
            </article>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <strong>GRILLKOL</strong>

        <span>
          Kvalitet som ger mer värme 🔥
        </span>
      </footer>
    </main>
  );
}