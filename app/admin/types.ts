export type AdminTab =
  | "orders"
  | "products";

export type OrderStatus =
  | "Ny"
  | "Bekräftad"
  | "Planerad"
  | "Levererad"
  | "Avbruten";

export type OrderProduct = {
  id?: number | string;
  name: string;
  description?: string | null;
  weight?: string | null;
  price: number;
  quantity: number;
  rowTotal: number;
  available?: boolean;
  waitingForAvailability?: boolean;
};

export type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  street_address: string;
  postal_code: string;
  city: string;
  delivery_date: string | null;
  delivery_message: string | null;
  products: OrderProduct[] | null;
  total_items: number;
  total_price: number;
  status: OrderStatus;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type Product = {
  id: number | string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  weight: string | null;
  active: boolean | null;
  available: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
};

export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  weight: string;
  sortOrder: string;
  active: boolean;
  available: boolean;
};

export type ProductImageState = {
  currentImageUrl: string;
  selectedImageFile: File | null;
  imagePreviewUrl: string;
  removeCurrentImage: boolean;
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  weight: "40 liter",
  sortOrder: "0",
  active: true,
  available: true,
};

export const EMPTY_PRODUCT_IMAGE_STATE: ProductImageState = {
  currentImageUrl: "",
  selectedImageFile: null,
  imagePreviewUrl: "",
  removeCurrentImage: false,
};

export const ORDER_STATUSES: OrderStatus[] = [
  "Ny",
  "Bekräftad",
  "Planerad",
  "Levererad",
  "Avbruten",
];