const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const attempts = new Map<string, number[]>();

export function isOrderCreationRateLimited(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    return true;
  }

  recent.push(now);
  attempts.set(key, recent);
  return false;
}
