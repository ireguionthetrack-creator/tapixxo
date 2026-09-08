import "server-only";

const MINUTE_WINDOW_MS = 60 * 1000;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SEARCHES_PER_MINUTE = 10;
const MAX_SEARCHES_PER_DAY = 60;

const attempts = new Map<string, number[]>();

type GooglePlacesSearchRateLimit = {
  limited: boolean;
  retryAfterSeconds: number;
};

/** El límite local reutiliza el patrón existente de pedidos. Google Cloud
 * conserva las cuotas globales obligatorias entre todas las instancias. */
export function getGooglePlacesSearchRateLimit(
  userId: string
): GooglePlacesSearchRateLimit {
  const now = Date.now();
  const dayAttempts = (attempts.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < DAY_WINDOW_MS
  );
  const minuteAttempts = dayAttempts.filter(
    (timestamp) => now - timestamp < MINUTE_WINDOW_MS
  );

  if (minuteAttempts.length >= MAX_SEARCHES_PER_MINUTE) {
    const oldest = minuteAttempts[0] ?? now;
    attempts.set(userId, dayAttempts);
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((MINUTE_WINDOW_MS - (now - oldest)) / 1000)),
    };
  }

  if (dayAttempts.length >= MAX_SEARCHES_PER_DAY) {
    const oldest = dayAttempts[0] ?? now;
    attempts.set(userId, dayAttempts);
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((DAY_WINDOW_MS - (now - oldest)) / 1000)),
    };
  }

  dayAttempts.push(now);
  attempts.set(userId, dayAttempts);
  return { limited: false, retryAfterSeconds: 0 };
}
