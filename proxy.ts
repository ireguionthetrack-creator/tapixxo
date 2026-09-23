import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DISABLED_API_PATHS = new Set([
  "/api/payments/wompi/checkout",
]);
const TEXAS_MENU_HOST = "texasrestobar.tapixxo.com";

function isTexasMenuHost(request: NextRequest) {
  return (request.headers.get("host") ?? "").toLowerCase().split(":")[0] === TEXAS_MENU_HOST;
}

function isTexasMenuPath(pathname: string) {
  return pathname === "/" ||
    pathname === "/texasrestobar" ||
    pathname === "/menu/texasrestobar" ||
    pathname === "/waiter/texasrestobar" ||
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/t/") ||
    pathname === "/api/menu/waiter-call" ||
    pathname.startsWith("/api/waiter/texasrestobar/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El subdominio público de Texas comparte la aplicación por eficiencia,
  // pero solo expone el multilink, menú, placas y panel de meseros. La edición
  // continúa viviendo exclusivamente en el dominio principal de Tapixxo.
  if (isTexasMenuHost(request)) {
    if (pathname === "/") return NextResponse.rewrite(new URL("/texasrestobar", request.url));
    if (!isTexasMenuPath(pathname)) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Ruta no disponible en este subdominio." }, { status: 404 });
      return NextResponse.redirect(new URL("/texasrestobar", request.url));
    }
  }

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
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|menu-assets/).*)",
  ],
};
