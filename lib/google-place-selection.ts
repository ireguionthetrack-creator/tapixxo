import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type GooglePlaceSelection = {
  companyId: string;
  userId: string;
  placeId: string;
  businessName: string;
  formattedAddress: string | null;
  expiresAt: number;
};

const MAX_AGE_MS = 10 * 60 * 1000;

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("No se puede proteger la selección de Google.");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createGooglePlaceSelectionToken(
  input: Omit<GooglePlaceSelection, "expiresAt">
) {
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + MAX_AGE_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyGooglePlaceSelectionToken(
  token: unknown,
  companyId: string,
  userId: string
): GooglePlaceSelection | null {
  if (typeof token !== "string") return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = sign(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const selection = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as GooglePlaceSelection;
    const valid =
      selection.companyId === companyId &&
      selection.userId === userId &&
      typeof selection.placeId === "string" &&
      typeof selection.businessName === "string" &&
      (selection.formattedAddress === null ||
        typeof selection.formattedAddress === "string") &&
      typeof selection.expiresAt === "number" &&
      selection.expiresAt > Date.now();
    return valid ? selection : null;
  } catch {
    return null;
  }
}
