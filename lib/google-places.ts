import "server-only";

const GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1";
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_SEARCH_CACHE_ENTRIES = 100;

type GooglePlacesApiPlace = {
  id?: unknown;
  displayName?: { text?: unknown };
  formattedAddress?: unknown;
  googleMapsLinks?: {
    writeAReviewUri?: unknown;
    placeUri?: unknown;
    reviewsUri?: unknown;
  };
};

type GooglePlacesApiResponse = { places?: GooglePlacesApiPlace[] };

export type GooglePlaceSearchResult = {
  placeId: string;
  businessName: string;
  formattedAddress: string | null;
};

export type GoogleReviewLinks = {
  writeAReviewUri: string;
  placeUri: string | null;
  reviewsUri: string | null;
};

type CachedValue<T> = { expiresAt: number; value: T };

const searchCache = new Map<string, CachedValue<GooglePlaceSearchResult[]>>();
const pendingSearches = new Map<string, Promise<GooglePlaceSearchResult[]>>();
const pendingDetails = new Map<string, Promise<GoogleReviewLinks>>();

export class GooglePlacesError extends Error {
  constructor(
    message: string,
    readonly kind: "configuration" | "upstream"
  ) {
    super(message);
  }
}

function getGooglePlacesApiKey() {
  const key = process.env.GOOGLE_MAPS_PLACES_API_KEY?.trim();
  if (!key) {
    throw new GooglePlacesError(
      "Google Places no está configurado.",
      "configuration"
    );
  }

  return key;
}

function asText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength
    ? value
    : null;
}

export function isOfficialGoogleReviewUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (hostname === "google.com" || hostname.endsWith(".google.com"))
    );
  } catch {
    return false;
  }
}

const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{10,255}$/;

function toSearchResult(place: GooglePlacesApiPlace): GooglePlaceSearchResult | null {
  const placeId = asText(place.id, 255);
  const businessName = asText(place.displayName?.text, 200);
  if (!placeId || !businessName) return null;

  return {
    placeId,
    businessName,
    formattedAddress: asText(place.formattedAddress, 500),
  };
}

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-CO");
}

function cacheValue<T>(
  cache: Map<string, CachedValue<T>>,
  key: string,
  value: T,
  ttlMs: number,
  maxEntries: number
) {
  if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getCachedValue<T>(cache: Map<string, CachedValue<T>>, key: string) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

async function requestGooglePlaces(
  operation: "text_search" | "place_details",
  url: string,
  options: RequestInit,
  fieldMask: string
) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGooglePlacesApiKey(),
      "X-Goog-FieldMask": fieldMask,
      ...options.headers,
    },
  });

  if (!response.ok) {
    console.error("Google Places request failed", { operation, status: response.status });
    throw new GooglePlacesError(
      "No se pudo consultar Google Places.",
      "upstream"
    );
  }

  console.info("Google Places upstream request completed", { operation, status: response.status });
  return (await response.json()) as GooglePlacesApiResponse | GooglePlacesApiPlace;
}

// Es el mínimo para distinguir resultados. displayName y formattedAddress
// activan Text Search Pro; se omiten rating, reseñas, fotos, horarios, web y teléfono.
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName.text",
  "places.formattedAddress",
].join(",");

// Solo se solicitan los enlaces que se guardan. No se pide ningún dato de
// negocio adicional durante la confirmación.
const DETAILS_FIELD_MASK = [
  "googleMapsLinks.writeAReviewUri",
  "googleMapsLinks.reviewsUri",
  "googleMapsLinks.placeUri",
].join(",");

export async function searchGooglePlaces(query: string) {
  const cacheKey = normalizeSearchQuery(query);
  const cached = getCachedValue(searchCache, cacheKey);
  if (cached) {
    console.info("Google Places search cache hit");
    return cached;
  }

  const pending = pendingSearches.get(cacheKey);
  if (pending) {
    console.info("Google Places search request coalesced");
    return pending;
  }

  const search = (async () => {
    const response = (await requestGooglePlaces(
      "text_search",
      `${GOOGLE_PLACES_BASE_URL}/places:searchText`,
      {
        method: "POST",
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 5,
          languageCode: "es",
          regionCode: "CO",
        }),
      },
      SEARCH_FIELD_MASK
    )) as GooglePlacesApiResponse;

    const places = (response.places ?? [])
      .map(toSearchResult)
      .filter((place): place is GooglePlaceSearchResult => place !== null);
    cacheValue(searchCache, cacheKey, places, SEARCH_CACHE_TTL_MS, MAX_SEARCH_CACHE_ENTRIES);
    return places;
  })();

  pendingSearches.set(cacheKey, search);
  try {
    return await search;
  } finally {
    pendingSearches.delete(cacheKey);
  }
}

export async function getGoogleReviewLinks(placeId: string) {
  const normalizedPlaceId = placeId.trim();
  if (!GOOGLE_PLACE_ID_PATTERN.test(normalizedPlaceId)) {
    throw new GooglePlacesError("El identificador de Google no es válido.", "upstream");
  }

  const pending = pendingDetails.get(normalizedPlaceId);
  if (pending) {
    console.info("Google Places details request coalesced");
    return pending;
  }

  const details = (async () => {
    const response = (await requestGooglePlaces(
      "place_details",
      `${GOOGLE_PLACES_BASE_URL}/places/${encodeURIComponent(normalizedPlaceId)}`,
      { method: "GET" },
      DETAILS_FIELD_MASK
    )) as GooglePlacesApiPlace;
    const writeAReviewUri = asText(
      response.googleMapsLinks?.writeAReviewUri,
      2000
    );
    const placeUri = asText(response.googleMapsLinks?.placeUri, 2000);
    const reviewsUri = asText(response.googleMapsLinks?.reviewsUri, 2000);

    if (!writeAReviewUri || !isOfficialGoogleReviewUrl(writeAReviewUri)) {
      throw new GooglePlacesError(
        "Google no devolvió un enlace oficial para escribir una reseña.",
        "upstream"
      );
    }

    const result = {
      writeAReviewUri,
      placeUri:
        placeUri && isOfficialGoogleReviewUrl(placeUri) ? placeUri : null,
      reviewsUri:
        reviewsUri && isOfficialGoogleReviewUrl(reviewsUri) ? reviewsUri : null,
    } satisfies GoogleReviewLinks;

    if (process.env.NODE_ENV === "development") {
      console.info("Google Places review links received", {
        placeId,
        writeAReviewUri: result.writeAReviewUri,
        reviewsUri: result.reviewsUri,
        placeUri: result.placeUri,
      });
    }

    return result;
  })();

  pendingDetails.set(normalizedPlaceId, details);
  try {
    return await details;
  } finally {
    pendingDetails.delete(normalizedPlaceId);
  }
}
