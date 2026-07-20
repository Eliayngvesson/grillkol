import {
  PDFDocument,
  PDFPage,
} from "pdf-lib";

import {
  PDF_COLORS,
  PDF_CONTENT_WIDTH,
  PDF_MARGIN_BOTTOM,
  PDF_MARGIN_LEFT,
  PdfFonts,
  PdfOrder,
  createPdfDocument,
  createPdfFilename,
  drawCheckbox,
  drawDocumentFooter,
  drawDocumentHeader,
  drawHorizontalLine,
  drawPdfText,
  drawWrappedPdfText,
  filterUnhandledOrders,
  formatGeneratedDateTime,
  formatPdfDateTime,
  formatPdfPrice,
  getOrderAddress,
  getOrderComment,
  getOrderItemCount,
  getOrderNumber,
  getOrderProducts,
  getOrderTotal,
  getProductName,
  getProductQuantity,
  getProductVariant,
  saveAndDownloadPdf,
} from "./helpers";

type PageState = {
  page: PDFPage;
  y: number;
  pageNumber: number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const TOP_AFTER_HEADER = 742;
const MINIMUM_Y = PDF_MARGIN_BOTTOM + 42;

function addPage(
  document: PDFDocument,
  fonts: PdfFonts,
  title = "Plocklista",
): PageState {
  const page = document.addPage([
    PAGE_WIDTH,
    PAGE_HEIGHT,
  ]);

  const pageNumber =
    document.getPageCount();

  const y = drawDocumentHeader(
    page,
    fonts,
    title,
    `Skapad ${formatGeneratedDateTime()}`,
  );

  return {
    page,
    y,
    pageNumber,
  };
}

function finishPage(
  state: PageState,
  fonts: PdfFonts,
): void {
  drawDocumentFooter(
    state.page,
    fonts,
    state.pageNumber,
  );
}

function ensureSpace(
  document: PDFDocument,
  fonts: PdfFonts,
  state: PageState,
  requiredHeight: number,
): PageState {
  if (
    state.y - requiredHeight >=
    MINIMUM_Y
  ) {
    return state;
  }

  finishPage(state, fonts);

  return addPage(
    document,
    fonts,
  );
}

function drawSummaryBox(
  state: PageState,
  fonts: PdfFonts,
  orderCount: number,
  itemCount: number,
  totalValue: number,
): void {
  const boxHeight = 58;

  state.page.drawRectangle({
    x: PDF_MARGIN_LEFT,
    y: state.y - boxHeight,
    width: PDF_CONTENT_WIDTH,
    height: boxHeight,
    color: PDF_COLORS.paleOrange,
    borderColor: PDF_COLORS.orange,
    borderWidth: 1,
  });

  drawPdfText(
    state.page,
    "OBEHANDLADE ORDRAR",
    {
      x: PDF_MARGIN_LEFT + 14,
      y: state.y - 18,
      font: fonts.bold,
      size: 10,
      color: PDF_COLORS.orange,
    },
  );

  drawPdfText(
    state.page,
    `${orderCount} ordrar`,
    {
      x: PDF_MARGIN_LEFT + 14,
      y: state.y - 40,
      font: fonts.bold,
      size: 15,
    },
  );

  drawPdfText(
    state.page,
    `${itemCount} produkter`,
    {
      x: PDF_MARGIN_LEFT + 185,
      y: state.y - 40,
      font: fonts.bold,
      size: 15,
    },
  );

  drawPdfText(
    state.page,
    formatPdfPrice(totalValue),
    {
      x: PDF_MARGIN_LEFT + 365,
      y: state.y - 40,
      font: fonts.bold,
      size: 15,
      maxWidth: 130,
    },
  );

  state.y -= boxHeight + 22;
}

function drawOrderHeader(
  state: PageState,
  fonts: PdfFonts,
  order: PdfOrder,
): void {
  const orderNumber =
    getOrderNumber(order);

  state.page.drawRectangle({
    x: PDF_MARGIN_LEFT,
    y: state.y - 34,
    width: PDF_CONTENT_WIDTH,
    height: 34,
    color: PDF_COLORS.brown,
  });

  drawPdfText(
    state.page,
    `ORDER #${orderNumber}`,
    {
      x: PDF_MARGIN_LEFT + 12,
      y: state.y - 22,
      font: fonts.bold,
      size: 14,
      color: PDF_COLORS.white,
    },
  );

  drawPdfText(
    state.page,
    formatPdfDateTime(
      order.created_at,
    ),
    {
      x: PDF_MARGIN_LEFT + 330,
      y: state.y - 21,
      font: fonts.regular,
      size: 9,
      maxWidth: 165,
      color: PDF_COLORS.white,
    },
  );

  state.y -= 48;
}

function drawCustomerInformation(
  state: PageState,
  fonts: PdfFonts,
  order: PdfOrder,
): void {
  const customerName =
    order.customer_name?.trim() ||
    "Kundnamn saknas";

  const address =
    getOrderAddress(order) ||
    "Adress saknas";

  drawPdfText(
    state.page,
    "KUNDUPPGIFTER",
    {
      x: PDF_MARGIN_LEFT,
      y: state.y,
      font: fonts.bold,
      size: 9,
      color: PDF_COLORS.gray,
    },
  );

  state.y -= 17;

  drawPdfText(
    state.page,
    customerName,
    {
      x: PDF_MARGIN_LEFT,
      y: state.y,
      font: fonts.bold,
      size: 12,
      maxWidth: 240,
    },
  );

  if (order.phone) {
    drawPdfText(
      state.page,
      `Telefon: ${order.phone}`,
      {
        x: PDF_MARGIN_LEFT + 265,
        y: state.y,
        font: fonts.regular,
        size: 10,
        maxWidth: 230,
      },
    );
  }

  state.y -= 17;

  drawPdfText(
    state.page,
    address,
    {
      x: PDF_MARGIN_LEFT,
      y: state.y,
      font: fonts.regular,
      size: 10,
      maxWidth: 245,
    },
  );

  if (order.email) {
    drawPdfText(
      state.page,
      `E-post: ${order.email}`,
      {
        x: PDF_MARGIN_LEFT + 265,
        y: state.y,
        font: fonts.regular,
        size: 10,
        maxWidth: 230,
      },
    );
  }

  state.y -= 21;

  drawHorizontalLine(
    state.page,
    state.y,
  );

  state.y -= 18;
}

function drawProductTableHeader(
  state: PageState,
  fonts: PdfFonts,
): void {
  state.page.drawRectangle({
    x: PDF_MARGIN_LEFT,
    y: state.y - 24,
    width: PDF_CONTENT_WIDTH,
    height: 24,
    color: PDF_COLORS.veryLightGray,
  });

  drawPdfText(
    state.page,
    "KLAR",
    {
      x: PDF_MARGIN_LEFT + 7,
      y: state.y - 16,
      font: fonts.bold,
      size: 8,
      color: PDF_COLORS.gray,
    },
  );

  drawPdfText(
    state.page,
    "PRODUKT",
    {
      x: PDF_MARGIN_LEFT + 47,
      y: state.y - 16,
      font: fonts.bold,
      size: 8,
      color: PDF_COLORS.gray,
    },
  );

  drawPdfText(
    state.page,
    "VARIANT",
    {
      x: PDF_MARGIN_LEFT + 270,
      y: state.y - 16,
      font: fonts.bold,
      size: 8,
      color: PDF_COLORS.gray,
    },
  );

  drawPdfText(
    state.page,
    "ANTAL",
    {
      x: PDF_MARGIN_LEFT + 435,
      y: state.y - 16,
      font: fonts.bold,
      size: 8,
      color: PDF_COLORS.gray,
    },
  );

  state.y -= 32;
}

function drawProductRow(
  state: PageState,
  fonts: PdfFonts,
  product: ReturnType<
    typeof getOrderProducts
  >[number],
): void {
  const productName =
    getProductName(product);

  const variant =
    getProductVariant(product) ||
    "-";

  const quantity =
    getProductQuantity(product);

  drawCheckbox(
    state.page,
    PDF_MARGIN_LEFT + 10,
    state.y + 2,
    11,
  );

  drawPdfText(
    state.page,
    productName,
    {
      x: PDF_MARGIN_LEFT + 47,
      y: state.y,
      font: fonts.bold,
      size: 10,
      maxWidth: 210,
    },
  );

  drawPdfText(
    state.page,
    variant,
    {
      x: PDF_MARGIN_LEFT + 270,
      y: state.y,
      font: fonts.regular,
      size: 10,
      maxWidth: 150,
    },
  );

  drawPdfText(
    state.page,
    `${quantity} st`,
    {
      x: PDF_MARGIN_LEFT + 435,
      y: state.y,
      font: fonts.bold,
      size: 11,
      maxWidth: 60,
    },
  );

  state.y -= 20;

  drawHorizontalLine(
    state.page,
    state.y + 5,
    {
      x: PDF_MARGIN_LEFT + 40,
      width:
        PDF_CONTENT_WIDTH - 40,
      thickness: 0.5,
    },
  );

  state.y -= 6;
}

function drawNoProducts(
  state: PageState,
  fonts: PdfFonts,
): void {
  state.page.drawRectangle({
    x: PDF_MARGIN_LEFT,
    y: state.y - 36,
    width: PDF_CONTENT_WIDTH,
    height: 36,
    color: PDF_COLORS.paleOrange,
  });

  drawPdfText(
    state.page,
    "Produktinformation saknas på ordern.",
    {
      x: PDF_MARGIN_LEFT + 12,
      y: state.y - 23,
      font: fonts.bold,
      size: 10,
      color: PDF_COLORS.orange,
    },
  );

  state.y -= 48;
}

function drawComment(
  state: PageState,
  fonts: PdfFonts,
  comment: string,
): void {
  if (!comment) {
    return;
  }

  state.page.drawRectangle({
    x: PDF_MARGIN_LEFT,
    y: state.y - 18,
    width: PDF_CONTENT_WIDTH,
    height: 18,
    color: PDF_COLORS.paleOrange,
  });

  drawPdfText(
    state.page,
    "KUNDENS KOMMENTAR",
    {
      x: PDF_MARGIN_LEFT + 9,
      y: state.y - 13,
      font: fonts.bold,
      size: 8,
      color: PDF_COLORS.orange,
    },
  );

  state.y -= 30;

  state.y = drawWrappedPdfText(
    state.page,
    comment,
    {
      x: PDF_MARGIN_LEFT + 9,
      y: state.y,
      font: fonts.regular,
      size: 10,
      maxWidth:
        PDF_CONTENT_WIDTH - 18,
      lineHeight: 14,
    },
  );

  state.y -= 10;
}

function drawOrderFooter(
  state: PageState,
  fonts: PdfFonts,
  order: PdfOrder,
): void {
  drawHorizontalLine(
    state.page,
    state.y,
  );

  state.y -= 18;

  drawPdfText(
    state.page,
    `Totalt antal: ${getOrderItemCount(
      order,
    )} st`,
    {
      x: PDF_MARGIN_LEFT,
      y: state.y,
      font: fonts.bold,
      size: 10,
    },
  );

  drawPdfText(
    state.page,
    `Ordervärde: ${formatPdfPrice(
      getOrderTotal(order),
    )}`,
    {
      x: PDF_MARGIN_LEFT + 185,
      y: state.y,
      font: fonts.bold,
      size: 10,
      maxWidth: 150,
    },
  );

  drawPdfText(
    state.page,
    "Order plockad:",
    {
      x: PDF_MARGIN_LEFT + 375,
      y: state.y,
      font: fonts.bold,
      size: 10,
      maxWidth: 130,
    },
  );

  drawCheckbox(
    state.page,
    PDF_MARGIN_LEFT + 462,
    state.y + 2,
    11,
  );

  state.y -= 34;
}

function estimateOrderHeight(
  order: PdfOrder,
): number {
  const products =
    getOrderProducts(order);

  const comment =
    getOrderComment(order);

  const productHeight =
    Math.max(
      products.length,
      1,
    ) * 26;

  const commentHeight =
    comment
      ? Math.max(
          50,
          Math.ceil(
            comment.length / 75,
          ) * 14 + 35,
        )
      : 0;

  return (
    48 +
    75 +
    32 +
    productHeight +
    commentHeight +
    55
  );
}

export async function generatePlocklistaPdf(
  allOrders: PdfOrder[],
): Promise<void> {
  const orders =
    filterUnhandledOrders(
      allOrders,
    );

  if (orders.length === 0) {
    throw new Error(
      "Det finns inga obehandlade ordrar att skriva ut.",
    );
  }

  const {
    document,
    fonts,
  } = await createPdfDocument();

  let state = addPage(
    document,
    fonts,
  );

  state.y = TOP_AFTER_HEADER;

  const totalItemCount =
    orders.reduce(
      (total, order) =>
        total +
        getOrderItemCount(order),
      0,
    );

  const totalValue =
    orders.reduce(
      (total, order) =>
        total +
        getOrderTotal(order),
      0,
    );

  drawSummaryBox(
    state,
    fonts,
    orders.length,
    totalItemCount,
    totalValue,
  );

  for (
    const order of orders
  ) {
    state = ensureSpace(
      document,
      fonts,
      state,
      Math.min(
        estimateOrderHeight(
          order,
        ),
        400,
      ),
    );

    drawOrderHeader(
      state,
      fonts,
      order,
    );

    drawCustomerInformation(
      state,
      fonts,
      order,
    );

    drawProductTableHeader(
      state,
      fonts,
    );

    const products =
      getOrderProducts(order);

    if (
      products.length === 0
    ) {
      drawNoProducts(
        state,
        fonts,
      );
    } else {
      for (
        const product
        of products
      ) {
        state = ensureSpace(
          document,
          fonts,
          state,
          50,
        );

        drawProductRow(
          state,
          fonts,
          product,
        );
      }
    }

    const comment =
      getOrderComment(order);

    if (comment) {
      state = ensureSpace(
        document,
        fonts,
        state,
        90,
      );

      drawComment(
        state,
        fonts,
        comment,
      );
    }

    state = ensureSpace(
      document,
      fonts,
      state,
      60,
    );

    drawOrderFooter(
      state,
      fonts,
      order,
    );
  }

  finishPage(
    state,
    fonts,
  );

  await saveAndDownloadPdf(
    document,
    createPdfFilename(
      "plocklista",
    ),
  );
}