import { NextResponse } from "next/server";
import {
  getGoogleReviewPlace,
  GooglePlacesError,
} from "@/lib/google-places";
import { getCompanyGroupManagementAccess } from "@/lib/company-group-management";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SaveGoogleReviewBody = {
  placeId?: unknown;
  codeIds?: unknown;
};

type StoredGoogleReviewDestination = {
  google_place_id: string;
  business_name: string;
  formatted_address: string | null;
  write_a_review_uri: string;
  google_maps_write_a_review_uri: string | null;
};

function isMissingGoogleReviewTable(error: { code?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST202"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await access.admin
    .from("company_google_review_destinations")
    .select(
      "google_place_id, business_name, formatted_address, write_a_review_uri, google_maps_write_a_review_uri, updated_at"
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    if (isMissingGoogleReviewTable(error)) {
      return NextResponse.json(
        { error: "Falta aplicar la migración de Google Reviews." },
        { status: 503 }
      );
    }
    console.error("Google review destination load failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "No se pudo cargar la configuración de Google Reviews." },
      { status: 500 }
    );
  }

  return NextResponse.json({ destination: data });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const access = await getCompanyGroupManagementAccess(companyId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: SaveGoogleReviewBody;
  try {
    body = (await request.json()) as SaveGoogleReviewBody;
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
  const rawCodeIds = Array.isArray(body.codeIds) ? body.codeIds : [];
  const codeIds = [...new Set(rawCodeIds)].filter(
    (codeId): codeId is string =>
      typeof codeId === "string" && UUID_PATTERN.test(codeId)
  );

  if (!placeId || placeId.length > 255 || codeIds.length !== rawCodeIds.length) {
    return NextResponse.json(
      { error: "El negocio o las placas seleccionadas no son válidos." },
      { status: 400 }
    );
  }

  if (codeIds.length > 1000) {
    return NextResponse.json(
      { error: "Puedes vincular hasta 1000 placas a la vez." },
      { status: 400 }
    );
  }

  try {
    // Una vez confirmado, el destino se reutiliza desde Supabase al vincular
    // más placas al mismo Place ID; no se consulta Google por segunda vez.
    const { data: storedDestination, error: storedDestinationError } = await access.admin
      .from("company_google_review_destinations")
      .select(
        "google_place_id, business_name, formatted_address, write_a_review_uri, google_maps_write_a_review_uri"
      )
      .eq("company_id", companyId)
      .maybeSingle();

    if (storedDestinationError) {
      if (isMissingGoogleReviewTable(storedDestinationError)) {
        return NextResponse.json(
          { error: "Falta aplicar la migración de Google Reviews." },
          { status: 503 }
        );
      }
      console.error("Google review destination lookup failed", {
        code: storedDestinationError.code,
        message: storedDestinationError.message,
      });
      return NextResponse.json(
        { error: "No se pudo cargar la configuración de Google Reviews." },
        { status: 500 }
      );
    }

    const saved = storedDestination as StoredGoogleReviewDestination | null;
    const place =
      saved?.google_place_id === placeId
        ? {
            placeId: saved.google_place_id,
            businessName: saved.business_name,
            formattedAddress: saved.formatted_address,
            reviewUrl: saved.write_a_review_uri,
            googleMapsWriteAReviewUri: saved.google_maps_write_a_review_uri,
          }
        : await getGoogleReviewPlace(placeId);

    console.info("Google review destination resolved", {
      source: saved?.google_place_id === placeId ? "database" : "google_places",
      companyId,
    });
    const { data, error } = await access.admin
      .rpc("apply_company_google_review_destination", {
        p_company_id: companyId,
        p_google_place_id: place.placeId,
        p_business_name: place.businessName,
        p_formatted_address: place.formattedAddress,
        p_write_a_review_uri: place.googleMapsWriteAReviewUri,
        p_code_ids: codeIds,
      })
      .maybeSingle();

    if (error) {
      if (isMissingGoogleReviewTable(error)) {
        return NextResponse.json(
          { error: "Falta aplicar la migración de Google Reviews." },
          { status: 503 }
        );
      }

      if (error.message.includes("codes do not belong")) {
        return NextResponse.json(
          { error: "Solo puedes vincular placas de tu propia empresa." },
          { status: 403 }
        );
      }

      console.error("Google review destination save failed", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: "No se pudo vincular Google Reviews a las placas." },
        { status: 500 }
      );
    }

    const result = data as { updated_codes?: number } | null;
    return NextResponse.json({
      destination: {
        placeId: place.placeId,
        businessName: place.businessName,
        formattedAddress: place.formattedAddress,
      },
      updatedCodes: result?.updated_codes ?? 0,
    });
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.kind === "configuration" ? 503 : 502 }
      );
    }

    console.error("Google review destination unexpected error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "No se pudo vincular Google Reviews en este momento." },
      { status: 500 }
    );
  }
}
