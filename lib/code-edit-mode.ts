import "server-only";

export const CODE_EDIT_MODE_COOKIE = "tapixxo_code_edit_mode";

export const CODE_EDIT_MODE_DURATION_SECONDS = 30 * 60;

export function codeEditModeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CODE_EDIT_MODE_DURATION_SECONDS,
  };
}
