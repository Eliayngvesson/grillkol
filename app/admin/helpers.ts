import type {
  Order,
  ProductFormValues,
} from "./types";

export function formatPrice(
  value:
    | number
    | string
    | null
    | undefined,
): string {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(numericValue)
      ? numericValue
      : 0,
  );
}

export function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Datum saknas";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Inte angivet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getStatusClass(
  status: string,
): string {
  return status
    .toLowerCase()
    .replaceAll("å", "a")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll(" ", "-");
}

export function orderContainsWaitingProduct(
  order: Order,
): boolean {
  return (order.products ?? []).some(
    (product) =>
      product.waitingForAvailability === true,
  );
}

export function validateProductForm(
  values: ProductFormValues,
): string | null {
  if (values.name.trim().length < 2) {
    return "Fyll i produktens namn.";
  }

  if (
    values.description.trim().length < 10
  ) {
    return "Fyll i en produktbeskrivning med minst 10 tecken.";
  }

  const price = Number(values.price);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    return "Fyll i ett giltigt pris.";
  }

  if (!values.weight.trim()) {
    return "Fyll i storlek, exempelvis 40 liter.";
  }

  return null;
}

export function createProductDatabaseData(
  values: ProductFormValues,
  imageUrl: string | null,
) {
  const price = Number(values.price);
  const sortOrder = Number(
    values.sortOrder,
  );

  return {
    name: values.name.trim(),
    description:
      values.description.trim(),
    price,
    image_url: imageUrl,
    weight: values.weight.trim(),
    active: values.active,
    available: values.available,
    sort_order: Number.isFinite(
      sortOrder,
    )
      ? sortOrder
      : 0,
  };
}