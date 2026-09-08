import { NextResponse } from "next/server";
import {
  GooglePlacesError,
  searchGooglePlaces,
} from "@/lib/google-places";
import { getCompanyGroupManagementAccess } from "@/lib/company-group-management";
import { getGooglePlacesSearchRateLimit } from "@/lib/google-places-rate-limit";

type SearchBody = { query?: unknown };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 160) {
    return NextResponse.json(
      { error: "Escribe entre 2 y 160 caracteres para buscar tu negocio." },
      { status: 400 }
    );
  }

  const rateLimit = getGooglePlacesSearchRateLimit(access.userId);
  if (rateLimit.limited) {
    console.warn("Google Places search rate limited", { userId: access.userId });
    return NextResponse.json(
      { error: "Has realizado muchas búsquedas. Inténtalo de nuevo más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  try {
    console.info("Google Places search requested", {
      userId: access.userId,
      queryLength: query.length,
    });
    const places = await searchGooglePlaces(query);
    return NextResponse.json({ places });
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.kind === "configuration" ? 503 : 502 }
      );
    }

    console.error("Google review search unexpected error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "No se pudo buscar el negocio en este momento." },
      { status: 500 }
    );
  }
}
