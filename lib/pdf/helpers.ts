import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

export type PdfOrderProduct = {
  id?: number | string | null;
  product_id?: number | string | null;

  name?: string | null;
  product_name?: string | null;

  variant_name?: string | null;
  variant?: string | null;
  weight?: string | null;
  size?: string | null;

  sku?: string | null;

  quantity?: number | string | null;
  price?: number | string | null;

  row_total?: number | string | null;
  rowTotal?: number | string | null;
  total_price?: number | string | null;
};

export type PdfOrder = {
  id: number | string;

  order_number?: string | number | null;
  created_at?: string | null;

  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;

  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;

  delivery_message?: string | null;
  comment?: string | null;
  notes?: string | null;

  delivery_date?: string | null;
  status?: string | null;

  total_price?: number | string | null;
  total_items?: number | string | null;

  products?: PdfOrderProduct[] | null;
};

export type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

export type PdfPageState = {
  page: PDFPage;
  y: number;
  pageNumber: number;
};

export const PDF_PAGE_WIDTH = 595.28;
export const PDF_PAGE_HEIGHT = 841.89;

export const PDF_MARGIN_LEFT = 42;
export const PDF_MARGIN_RIGHT = 42;
export const PDF_MARGIN_TOP = 46;
export const PDF_MARGIN_BOTTOM = 46;

export const PDF_CONTENT_WIDTH =
  PDF_PAGE_WIDTH -
  PDF_MARGIN_LEFT -
  PDF_MARGIN_RIGHT;

export const PDF_COLORS = {
  black: rgb(0.12, 0.12, 0.12),
  darkGray: rgb(0.27, 0.27, 0.27),
  gray: rgb(0.48, 0.48, 0.48),
  lightGray: rgb(0.9, 0.9, 0.9),
  veryLightGray: rgb(0.965, 0.965, 0.965),
  white: rgb(1, 1, 1),

  brown: rgb(0.25, 0.17, 0.11),
  orange: rgb(0.9, 0.32, 0.05),
  paleOrange: rgb(1, 0.94, 0.88),
};

export async function createPdfDocument(): Promise<{
  document: PDFDocument;
  fonts: PdfFonts;
}> {
  const document =
    await PDFDocument.create();

  const regular =
    await document.embedFont(
      StandardFonts.Helvetica,
    );

  const bold =
    await document.embedFont(
      StandardFonts.HelveticaBold,
    );

  document.setTitle(
    "Grillkol Susingstorp",
  );

  document.setAuthor(
    "Grillkol Susingstorp",
  );

  document.setCreator(
    "grillkolsusingstorp.se",
  );

  document.setProducer(
    "Grillkol Susingstorp",
  );

  return {
    document,
    fonts: {
      regular,
      bold,
    },
  };
}

export function addPdfPage(
  document: PDFDocument,
): PdfPageState {
  const page = document.addPage([
    PDF_PAGE_WIDTH,
    PDF_PAGE_HEIGHT,
  ]);

  return {
    page,
    y:
      PDF_PAGE_HEIGHT -
      PDF_MARGIN_TOP,
    pageNumber:
      document.getPageCount(),
  };
}

export function formatPdfDate(
  value?: string | null,
): string {
  if (!value) {
    return "Datum saknas";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

export function formatPdfDateTime(
  value?: string | null,
): string {
  if (!value) {
    return "Datum saknas";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export function formatGeneratedDateTime(): string {
  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date());
}

export function formatPdfPrice(
  value:
    | number
    | string
    | null
    | undefined,
): string {
  const numericValue =
    Number(value ?? 0);

  const safeValue =
    Number.isFinite(numericValue)
      ? numericValue
      : 0;

  return new Intl.NumberFormat(
    "sv-SE",
    {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(safeValue);
}

export function normalizePdfText(
  value:
    | string
    | number
    | null
    | undefined,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("\u00a0", " ")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .trim();
}

export function getOrderNumber(
  order: PdfOrder,
): string {
  const orderNumber =
    normalizePdfText(
      order.order_number,
    );

  if (orderNumber) {
    return orderNumber;
  }

  return normalizePdfText(
    order.id,
  );
}

export function getProductName(
  product: PdfOrderProduct,
): string {
  return (
    normalizePdfText(
      product.name,
    ) ||
    normalizePdfText(
      product.product_name,
    ) ||
    "Produkt"
  );
}

export function getProductVariant(
  product: PdfOrderProduct,
): string {
  return (
    normalizePdfText(
      product.variant_name,
    ) ||
    normalizePdfText(
      product.variant,
    ) ||
    normalizePdfText(
      product.weight,
    ) ||
    normalizePdfText(
      product.size,
    )
  );
}

export function getProductQuantity(
  product: PdfOrderProduct,
): number {
  const quantity = Number(
    product.quantity ?? 0,
  );

  if (
    !Number.isFinite(quantity)
  ) {
    return 0;
  }

  return quantity;
}

export function getProductPrice(
  product: PdfOrderProduct,
): number {
  const price = Number(
    product.price ?? 0,
  );

  if (!Number.isFinite(price)) {
    return 0;
  }

  return price;
}

export function getProductRowTotal(
  product: PdfOrderProduct,
): number {
  const savedTotal =
    product.row_total ??
    product.rowTotal ??
    product.total_price;

  if (
    savedTotal !== null &&
    savedTotal !== undefined
  ) {
    const numericSavedTotal =
      Number(savedTotal);

    if (
      Number.isFinite(
        numericSavedTotal,
      )
    ) {
      return numericSavedTotal;
    }
  }

  return (
    getProductQuantity(product) *
    getProductPrice(product)
  );
}

export function getOrderProducts(
  order: PdfOrder,
): PdfOrderProduct[] {
  if (
    !Array.isArray(
      order.products,
    )
  ) {
    return [];
  }

  return order.products;
}

export function getOrderAddress(
  order: PdfOrder,
): string {
  const street =
    normalizePdfText(
      order.street_address,
    );

  const postalCode =
    normalizePdfText(
      order.postal_code,
    );

  const city =
    normalizePdfText(
      order.city,
    );

  const postalCity = [
    postalCode,
    city,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    street,
    postalCity,
  ]
    .filter(Boolean)
    .join(", ");
}

export function getOrderComment(
  order: PdfOrder,
): string {
  return (
    normalizePdfText(
      order.delivery_message,
    ) ||
    normalizePdfText(
      order.comment,
    ) ||
    normalizePdfText(
      order.notes,
    )
  );
}

export function getOrderItemCount(
  order: PdfOrder,
): number {
  const productCount =
    getOrderProducts(order).reduce(
      (total, product) =>
        total +
        getProductQuantity(product),
      0,
    );

  if (productCount > 0) {
    return productCount;
  }

  const savedItemCount =
    Number(
      order.total_items ?? 0,
    );

  return Number.isFinite(
    savedItemCount,
  )
    ? savedItemCount
    : 0;
}

export function getOrderTotal(
  order: PdfOrder,
): number {
  const savedTotal = Number(
    order.total_price ?? 0,
  );

  if (
    Number.isFinite(savedTotal) &&
    savedTotal > 0
  ) {
    return savedTotal;
  }

  return getOrderProducts(
    order,
  ).reduce(
    (total, product) =>
      total +
      getProductRowTotal(
        product,
      ),
    0,
  );
}

export function isUnhandledOrder(
  order: PdfOrder,
): boolean {
  const status =
    normalizePdfText(
      order.status,
    ).toLocaleLowerCase(
      "sv-SE",
    );

  if (!status) {
    return true;
  }

  const handledStatuses = [
    "behandlad",
    "klar",
    "levererad",
    "avslutad",
    "makulerad",
    "annullerad",
  ];

  return !handledStatuses.includes(
    status,
  );
}

export function sortOrdersForPdf(
  orders: PdfOrder[],
): PdfOrder[] {
  return [...orders].sort(
    (first, second) => {
      const firstDate =
        first.created_at
          ? new Date(
              first.created_at,
            ).getTime()
          : 0;

      const secondDate =
        second.created_at
          ? new Date(
              second.created_at,
            ).getTime()
          : 0;

      return firstDate - secondDate;
    },
  );
}

export function filterUnhandledOrders(
  orders: PdfOrder[],
): PdfOrder[] {
  return sortOrdersForPdf(
    orders.filter(
      isUnhandledOrder,
    ),
  );
}

export function truncatePdfText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string {
  const normalizedText =
    normalizePdfText(text);

  if (
    font.widthOfTextAtSize(
      normalizedText,
      fontSize,
    ) <= maxWidth
  ) {
    return normalizedText;
  }

  let shortened =
    normalizedText;

  while (
    shortened.length > 0 &&
    font.widthOfTextAtSize(
      `${shortened}...`,
      fontSize,
    ) > maxWidth
  ) {
    shortened =
      shortened.slice(0, -1);
  }

  return `${shortened}...`;
}

export function wrapPdfText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const normalizedText =
    normalizePdfText(text);

  if (!normalizedText) {
    return [];
  }

  const paragraphs =
    normalizedText.split(/\n+/);

  const lines: string[] = [];

  for (
    const paragraph
    of paragraphs
  ) {
    const words =
      paragraph.split(/\s+/);

    let currentLine = "";

    for (const word of words) {
      const testLine =
        currentLine
          ? `${currentLine} ${word}`
          : word;

      const width =
        font.widthOfTextAtSize(
          testLine,
          fontSize,
        );

      if (
        width <= maxWidth
      ) {
        currentLine =
          testLine;

        continue;
      }

      if (currentLine) {
        lines.push(
          currentLine,
        );
      }

      if (
        font.widthOfTextAtSize(
          word,
          fontSize,
        ) <= maxWidth
      ) {
        currentLine = word;
      } else {
        let wordPart = "";

        for (
          const character
          of word
        ) {
          const testPart =
            `${wordPart}${character}`;

          if (
            font.widthOfTextAtSize(
              testPart,
              fontSize,
            ) <= maxWidth
          ) {
            wordPart =
              testPart;
          } else {
            if (wordPart) {
              lines.push(
                wordPart,
              );
            }

            wordPart =
              character;
          }
        }

        currentLine =
          wordPart;
      }
    }

    if (currentLine) {
      lines.push(
        currentLine,
      );
    }
  }

  return lines;
}

export function drawPdfText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    font: PDFFont;
    size: number;
    maxWidth?: number;
    color?: ReturnType<
      typeof rgb
    >;
  },
): void {
  const {
    x,
    y,
    font,
    size,
    maxWidth,
    color =
      PDF_COLORS.black,
  } = options;

  const safeText = maxWidth
    ? truncatePdfText(
        text,
        font,
        size,
        maxWidth,
      )
    : normalizePdfText(text);

  page.drawText(
    safeText,
    {
      x,
      y,
      size,
      font,
      color,
    },
  );
}

export function drawWrappedPdfText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    font: PDFFont;
    size: number;
    maxWidth: number;
    lineHeight?: number;
    color?: ReturnType<
      typeof rgb
    >;
  },
): number {
  const {
    x,
    y,
    font,
    size,
    maxWidth,
    lineHeight =
      size + 4,
    color =
      PDF_COLORS.black,
  } = options;

  const lines = wrapPdfText(
    text,
    font,
    size,
    maxWidth,
  );

  let currentY = y;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size,
      font,
      color,
    });

    currentY -=
      lineHeight;
  }

  return currentY;
}

export function drawCheckbox(
  page: PDFPage,
  x: number,
  y: number,
  size = 10,
): void {
  page.drawRectangle({
    x,
    y: y - size + 2,
    width: size,
    height: size,
    borderWidth: 1,
    borderColor:
      PDF_COLORS.darkGray,
    color:
      PDF_COLORS.white,
  });
}

export function drawHorizontalLine(
  page: PDFPage,
  y: number,
  options?: {
    x?: number;
    width?: number;
    thickness?: number;
  },
): void {
  const x =
    options?.x ??
    PDF_MARGIN_LEFT;

  const width =
    options?.width ??
    PDF_CONTENT_WIDTH;

  const thickness =
    options?.thickness ??
    0.8;

  page.drawLine({
    start: {
      x,
      y,
    },
    end: {
      x: x + width,
      y,
    },
    thickness,
    color:
      PDF_COLORS.lightGray,
  });
}

export function drawDocumentHeader(
  page: PDFPage,
  fonts: PdfFonts,
  title: string,
  subtitle?: string,
): number {
  const headerHeight = 70;

  page.drawRectangle({
    x: 0,
    y:
      PDF_PAGE_HEIGHT -
      headerHeight,
    width:
      PDF_PAGE_WIDTH,
    height:
      headerHeight,
    color:
      PDF_COLORS.brown,
  });

  drawPdfText(
    page,
    "GRILLKOL SUSINGSTORP",
    {
      x: PDF_MARGIN_LEFT,
      y:
        PDF_PAGE_HEIGHT -
        31,
      font: fonts.bold,
      size: 14,
      color:
        PDF_COLORS.white,
    },
  );

  drawPdfText(
    page,
    title,
    {
      x: PDF_MARGIN_LEFT,
      y:
        PDF_PAGE_HEIGHT -
        52,
      font: fonts.bold,
      size: 20,
      maxWidth:
        PDF_CONTENT_WIDTH -
        165,
      color:
        PDF_COLORS.white,
    },
  );

  if (subtitle) {
    drawPdfText(
      page,
      subtitle,
      {
        x:
          PDF_PAGE_WIDTH -
          PDF_MARGIN_RIGHT -
          155,
        y:
          PDF_PAGE_HEIGHT -
          48,
        font:
          fonts.regular,
        size: 9,
        maxWidth: 155,
        color:
          PDF_COLORS.white,
      },
    );
  }

  return (
    PDF_PAGE_HEIGHT -
    headerHeight -
    24
  );
}

export function drawDocumentFooter(
  page: PDFPage,
  fonts: PdfFonts,
  pageNumber: number,
): void {
  drawHorizontalLine(
    page,
    PDF_MARGIN_BOTTOM - 7,
  );

  drawPdfText(
    page,
    "grillkolsusingstorp.se",
    {
      x: PDF_MARGIN_LEFT,
      y:
        PDF_MARGIN_BOTTOM -
        25,
      font:
        fonts.regular,
      size: 8,
      color:
        PDF_COLORS.gray,
    },
  );

  const pageText =
    `Sida ${pageNumber}`;

  const pageTextWidth =
    fonts.regular.widthOfTextAtSize(
      pageText,
      8,
    );

  drawPdfText(
    page,
    pageText,
    {
      x:
        PDF_PAGE_WIDTH -
        PDF_MARGIN_RIGHT -
        pageTextWidth,
      y:
        PDF_MARGIN_BOTTOM -
        25,
      font:
        fonts.regular,
      size: 8,
      color:
        PDF_COLORS.gray,
    },
  );
}

export async function saveAndDownloadPdf(
  document: PDFDocument,
  filename: string,
): Promise<void> {
  const pages =
    document.getPages();

  pages.forEach(
    (page, index) => {
      const regularFont =
        document
          .getForm()
          ? undefined
          : undefined;

      void regularFont;
      void page;
      void index;
    },
  );

  const pdfBytes =
    await document.save();

  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;

  const blob = new Blob(
    [pdfBuffer],
    {
      type: "application/pdf",
    },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    window.document.createElement(
      "a",
    );

  anchor.href = url;
  anchor.download =
    filename.endsWith(".pdf")
      ? filename
      : `${filename}.pdf`;

  window.document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function createPdfFilename(
  prefix: string,
): string {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  const hours =
    String(
      now.getHours(),
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes(),
    ).padStart(2, "0");

  return `${prefix}-${year}-${month}-${day}-${hours}${minutes}.pdf`;
}