"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import styles from "./storefront.module.css";

type Product = {
  id: string | number;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  weight: string | null;
  active: boolean | null;
  sort_order: number | null;
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
    maximumFractionDigits: 0,
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

function getProductPrice(product: Product) {
  const price = Number(product.price ?? 0);

  return Number.isFinite(price) ? price : 0;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(
    [],
  );

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
        .select("*")
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
          (product) => product.active !== false,
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
        }));

      setProducts(loadedProducts);

      const initialQuantities: Record<
        string,
        number
      > = {};

      loadedProducts.forEach((product) => {
        initialQuantities[String(product.id)] = 0;
      });

      setQuantities(initialQuantities);
      setLoadingProducts(false);
    }

    void loadProducts();
  }, []);

  const selectedProducts = useMemo(() => {
    return products
      .map((product) => ({
        ...product,
        quantity:
          quantities[String(product.id)] ?? 0,
        numericPrice: getProductPrice(product),
      }))
      .filter((product) => product.quantity > 0);
  }, [products, quantities]);

  const totalItems = useMemo(() => {
    return selectedProducts.reduce(
      (total, product) =>
        total + product.quantity,
      0,
    );
  }, [selectedProducts]);

  const totalPrice = useMemo(() => {
    return selectedProducts.reduce(
      (total, product) =>
        total +
        product.numericPrice *
          product.quantity,
      0,
    );
  }, [selectedProducts]);

  function changeQuantity(
    productId: string | number,
    difference: number,
  ) {
    const key = String(productId);

    setQuantities((current) => {
      const currentQuantity =
        current[key] ?? 0;

      return {
        ...current,
        [key]: Math.max(
          0,
          currentQuantity + difference,
        ),
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
      selectedProducts.map((product) => ({
        id: product.id,
        name: product.name,
        description:
          product.description || null,
        weight: product.weight || null,
        price: product.numericPrice,
        quantity: product.quantity,
        rowTotal:
          product.numericPrice *
          product.quantity,
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
      clearedQuantities[
        String(product.id)
      ] = 0;
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
                  Välj dina produkter och
                  antal.
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
                  i Supabase.
                </p>
              </div>
            ) : (
              <div
                className={styles.productList}
              >
                {products.map((product) => {
                  const quantity =
                    quantities[
                      String(product.id)
                    ] ?? 0;

                  const price =
                    getProductPrice(product);

                  const rowTotal =
                    price * quantity;

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
                              {product.weight ||
                                "40 LITER"}
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

                        {product.weight && (
                          <span
                            className={
                              styles.weightBadge
                            }
                          >
                            {product.weight}
                          </span>
                        )}

                        <strong
                          className={
                            styles.productPrice
                          }
                        >
                          {formatPrice(price)}{" "}
                          / st
                        </strong>
                      </div>

                      <div
                        className={
                          styles.quantityColumn
                        }
                      >
                        <div
                          className={
                            styles.quantityControl
                          }
                        >
                          <button
                            type="button"
                            disabled={
                              quantity === 0
                            }
                            onClick={() =>
                              changeQuantity(
                                product.id,
                                -1,
                              )
                            }
                            aria-label={`Minska antal ${product.name}`}
                          >
                            −
                          </button>

                          <span>
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(
                                product.id,
                                1,
                              )
                            }
                            aria-label={`Öka antal ${product.name}`}
                          >
                            +
                          </button>
                        </div>

                        <strong>
                          {formatPrice(rowTotal)}
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
                Ange hur många säckar du
                vill beställa.
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