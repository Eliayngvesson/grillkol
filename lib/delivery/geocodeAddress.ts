export type GeocodeAddressInput = {
  streetAddress: string;
  postalCode?: string;
  city: string;
  country?: string;
};

export type GeocodedPosition = {
  latitude: number;
  longitude: number;
  displayName: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

const CACHE_PREFIX = "grillkol-geocode:";

function createCacheKey(input: GeocodeAddressInput) {
  return `${CACHE_PREFIX}${[
    input.streetAddress,
    input.postalCode ?? "",
    input.city,
    input.country ?? "Sverige",
  ]
    .join("|")
    .trim()
    .toLocaleLowerCase("sv-SE")}`;
}

function readCachedPosition(cacheKey: string): GeocodedPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(cacheKey);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as GeocodedPosition;

    if (
      !Number.isFinite(parsedValue.latitude) ||
      !Number.isFinite(parsedValue.longitude)
    ) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function saveCachedPosition(cacheKey: string, position: GeocodedPosition) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(position));
  } catch {
    // Kartplaceringen ska fungera även om
    // webbläsaren blockerar localStorage.
  }
}

async function searchNominatim(
  parameters: URLSearchParams,
): Promise<GeocodedPosition | null> {
  parameters.set("format", "jsonv2");
  parameters.set("limit", "1");
  parameters.set("countrycodes", "se");
  parameters.set("addressdetails", "1");
  parameters.set("accept-language", "sv");

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${parameters.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Adresstjänsten svarade med ${response.status}.`);
  }

  const results = (await response.json()) as NominatimResult[];

  const firstResult = results[0];

  if (!firstResult?.lat || !firstResult?.lon) {
    return null;
  }

  const latitude = Number(firstResult.lat);
  const longitude = Number(firstResult.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    displayName: firstResult.display_name ?? "",
  };
}

export async function geocodeAddress(
  input: GeocodeAddressInput,
): Promise<GeocodedPosition | null> {
  const normalizedInput = {
    streetAddress: input.streetAddress.trim(),
    postalCode: input.postalCode?.trim() ?? "",
    city: input.city.trim(),
    country: input.country?.trim() || "Sverige",
  };

  if (!normalizedInput.streetAddress || !normalizedInput.city) {
    return null;
  }

  const cacheKey = createCacheKey(normalizedInput);

  const cachedPosition = readCachedPosition(cacheKey);

  if (cachedPosition) {
    return cachedPosition;
  }

  const structuredParameters = new URLSearchParams({
    street: normalizedInput.streetAddress,
    city: normalizedInput.city,
    country: normalizedInput.country,
  });

  if (normalizedInput.postalCode) {
    structuredParameters.set("postalcode", normalizedInput.postalCode);
  }

  let position = await searchNominatim(structuredParameters);

  if (!position) {
    const freeFormAddress = [
      normalizedInput.streetAddress,
      normalizedInput.postalCode,
      normalizedInput.city,
      normalizedInput.country,
    ]
      .filter(Boolean)
      .join(", ");

    position = await searchNominatim(
      new URLSearchParams({
        q: freeFormAddress,
      }),
    );
  }

  if (position) {
    saveCachedPosition(cacheKey, position);
  }

  return position;
}