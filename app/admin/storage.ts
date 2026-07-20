import { supabase } from "@/lib/supabase";

export const PRODUCT_IMAGE_BUCKET =
  "product-images";

export const MAX_PRODUCT_IMAGE_SIZE =
  10 * 1024 * 1024;

export const ALLOWED_PRODUCT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export type UploadedProductImage = {
  publicUrl: string;
  filePath: string;
};

export function validateProductImage(
  file: File,
): string | null {
  if (
    !ALLOWED_PRODUCT_IMAGE_TYPES.includes(
      file.type,
    )
  ) {
    return "Du kan bara ladda upp JPEG, PNG, WebP eller GIF.";
  }

  if (
    file.size > MAX_PRODUCT_IMAGE_SIZE
  ) {
    return "Bilden är för stor. Maximal filstorlek är 10 MB.";
  }

  return null;
}

function sanitizeFileName(
  fileName: string,
): string {
  const extension =
    fileName
      .split(".")
      .pop()
      ?.toLowerCase() || "jpg";

  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return `${
    baseName || "produktbild"
  }.${extension}`;
}

export function getStoragePathFromUrl(
  imageUrl: string | null,
): string | null {
  if (!imageUrl) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;

  const markerIndex =
    imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const storagePath = imageUrl.slice(
    markerIndex + marker.length,
  );

  try {
    return decodeURIComponent(
      storagePath,
    );
  } catch {
    return storagePath;
  }
}

export async function uploadProductImage(
  file: File,
): Promise<UploadedProductImage> {
  const validationError =
    validateProductImage(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const safeFileName =
    sanitizeFileName(file.name);

  const uniqueFileName =
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  const filePath =
    `products/${uniqueFileName}`;

  const { error: uploadError } =
    await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

  if (uploadError) {
    throw new Error(
      `Bilden kunde inte laddas upp: ${uploadError.message}`,
    );
  }

  const { data } =
    supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(filePath);

  if (!data.publicUrl) {
    await removeProductImageByPath(
      filePath,
    );

    throw new Error(
      "Bildens publika adress kunde inte skapas.",
    );
  }

  return {
    publicUrl: data.publicUrl,
    filePath,
  };
}

export async function removeProductImageByPath(
  filePath: string,
): Promise<void> {
  const { error } =
    await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([filePath]);

  if (error) {
    throw new Error(
      `Produktbilden kunde inte raderas: ${error.message}`,
    );
  }
}

export async function removeProductImageByUrl(
  imageUrl: string | null,
): Promise<void> {
  const storagePath =
    getStoragePathFromUrl(imageUrl);

  if (!storagePath) {
    return;
  }

  await removeProductImageByPath(
    storagePath,
  );
}