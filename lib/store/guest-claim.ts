import { createHash, randomBytes } from "crypto";

export const GUEST_CLAIM_COOKIE = "tapixxo_store_claim";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createGuestClaimToken() {
  return randomBytes(32).toString("base64url");
}

export function hashGuestClaimToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function guestClaimCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/store",
    maxAge: 60 * 60 * 24 * 7,
  };
}
