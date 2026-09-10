import { NextResponse } from "next/server";
import { buildGoogleWriteReviewUrl } from "@/lib/google-places";
import { getCompanyGroupManagementAccess } from "@/lib/company-group-management";
import { verifyGooglePlaceSelectionToken } from "@/lib/google-place-selection";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SaveGoogleReviewBody = {
  selectionToken?: unknown;
  codeIds?: unknown;
};

type StoredGoogleReviewDestination = {
  google_place_id: string;
  business_name: string;
  formatted_address: string | null;
  review_url: string;
};

function isMissingGoogleReviewTable(error: { code?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST202"
  );
}

const DESTINATION_FIELDS =
  "google_place_id, business_name, formatted_address, review_url, updated_at";

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
    .select(DESTINATION_FIELDS)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    if (isMissingGoogleReviewTable(error)) {
      console.error("Google Reviews schema or RPC is unavailable", {
        code: error.code,
        message: error.message,
      });
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

  return NextResponse.json({
    destination: data as StoredGoogleReviewDestination | null,
  });
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

  const rawCodeIds = Array.isArray(body.codeIds) ? body.codeIds : [];
  const codeIds = [...new Set(rawCodeIds)].filter(
    (codeId): codeId is string =>
      typeof codeId === "string" && UUID_PATTERN.test(codeId)
  );

  if (codeIds.length !== rawCodeIds.length) {
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

  const selection = verifyGooglePlaceSelectionToken(
    body.selectionToken,
    companyId,
    access.userId
  );
  if (!selection) {
    return NextResponse.json(
      { error: "La selección del negocio venció. Vuelve a buscarlo." },
      { status: 400 }
    );
  }

  const reviewUrl = buildGoogleWriteReviewUrl(selection.placeId);
  if (!reviewUrl) {
    return NextResponse.json(
      { error: "El identificador de Google no es válido." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await access.admin
      .rpc("apply_company_google_review_destination", {
        p_company_id: companyId,
        p_google_place_id: selection.placeId,
        p_business_name: selection.businessName,
        p_formatted_address: selection.formattedAddress,
        p_write_a_review_uri: reviewUrl,
        p_code_ids: codeIds,
      })
      .maybeSingle();

    if (error) {
      if (isMissingGoogleReviewTable(error)) {
        console.error("Google Reviews schema or RPC is unavailable", {
          code: error.code,
          message: error.message,
        });
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
        placeId: selection.placeId,
        businessName: selection.businessName,
        formattedAddress: selection.formattedAddress,
      },
      updatedCodes: result?.updated_codes ?? 0,
    });
  } catch (error) {
    console.error("Google review destination unexpected error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "No se pudo vincular Google Reviews en este momento." },
      { status: 500 }
    );
  }
}
