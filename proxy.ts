import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DISABLED_API_PATHS = new Set([
  "/api/payments/wompi/checkout",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/api/store" ||
    pathname.startsWith("/api/store/") ||
    DISABLED_API_PATHS.has(pathname)
  ) {
    return NextResponse.json(
      { error: "La tienda está temporalmente no disponible." },
      { status: 503 },
    );
  }

  if (pathname === "/api/admin/stock" || pathname.startsWith("/api/admin/stock/")) {
    return NextResponse.json(
      { error: "La administración de stock está temporalmente no disponible." },
      { status: 503 },
    );
  }

  if (pathname.startsWith("/store")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin/stock")) {
    return NextResponse.redirect(new URL("/companies", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/store/:path*",
    "/api/store/:path*",
    "/api/payments/wompi/checkout",
    "/admin/stock/:path*",
    "/api/admin/stock/:path*",
  ],
};
