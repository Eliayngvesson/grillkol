"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  filterUnhandledOrders,
  type PdfOrder,
} from "@/lib/pdf/helpers";

import {
  generatePlocklistaPdf,
} from "@/lib/pdf/plocklista";

import "./PdfButton.css";

type PdfButtonsProps = {
  orders: PdfOrder[];
};

export default function PdfButtons({
  orders,
}: PdfButtonsProps) {
  const [isGenerating, setIsGenerating] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const unhandledOrders = useMemo(
    () =>
      filterUnhandledOrders(
        orders,
      ),
    [orders],
  );

  const totalItems = useMemo(
    () =>
      unhandledOrders.reduce(
        (total, order) => {
          const products =
            Array.isArray(
              order.products,
            )
              ? order.products
              : [];

          const productQuantity =
            products.reduce(
              (
                productTotal,
                product,
              ) => {
                const quantity =
                  Number(
                    product.quantity ??
                      0,
                  );

                return (
                  productTotal +
                  (Number.isFinite(
                    quantity,
                  )
                    ? quantity
                    : 0)
                );
              },
              0,
            );

          if (
            productQuantity > 0
          ) {
            return (
              total +
              productQuantity
            );
          }

          const savedTotal =
            Number(
              order.total_items ??
                0,
            );

          return (
            total +
            (Number.isFinite(
              savedTotal,
            )
              ? savedTotal
              : 0)
          );
        },
        0,
      ),
    [unhandledOrders],
  );

  async function handleGeneratePdf() {
    if (
      unhandledOrders.length === 0
    ) {
      setMessage(
        "Det finns inga obehandlade ordrar att skriva ut.",
      );

      return;
    }

    try {
      setIsGenerating(true);
      setMessage(null);

      await generatePlocklistaPdf(
        orders,
      );

      setMessage(
        `Plocklistan skapades med ${unhandledOrders.length} ordrar.`,
      );
    } catch (error) {
      console.error(
        "Kunde inte skapa PDF:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Kunde inte skapa plocklistan.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="pdf-tools">
      <div className="pdf-tools-information">
        <div className="pdf-tools-icon">
          📄
        </div>

        <div>
          <h3>
            Plocklista
          </h3>

          <p>
            Skriver ut alla
            obehandlade ordrar med
            kunduppgifter, produkter,
            varianter och antal.
          </p>
        </div>
      </div>

      <div className="pdf-tools-summary">
        <div>
          <span>
            Obehandlade ordrar
          </span>

          <strong>
            {
              unhandledOrders.length
            }
          </strong>
        </div>

        <div>
          <span>
            Produkter att plocka
          </span>

          <strong>
            {totalItems} st
          </strong>
        </div>
      </div>

      <button
        type="button"
        className="pdf-generate-button"
        onClick={
          handleGeneratePdf
        }
        disabled={
          isGenerating ||
          unhandledOrders.length ===
            0
        }
      >
        {isGenerating
          ? "Skapar PDF..."
          : "Ladda ner plocklista PDF"}
      </button>

      {message && (
        <p
          className={
            unhandledOrders.length ===
            0
              ? "pdf-message pdf-message-warning"
              : "pdf-message pdf-message-success"
          }
        >
          {message}
        </p>
      )}
    </section>
  );
}