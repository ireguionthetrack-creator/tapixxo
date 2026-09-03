import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

type InventoryStatus =
  | "not_for_sale"
  | "available"
  | "reserved"
  | "processing"
  | "assigned"
  | "retired";

type CodeRecord = {
  id: string;
  code: string;
  company_id: string | null;
  group_id: string | null;
};

type InventoryUnitRecord = {
  id: string;
  code_id: string;
  status: InventoryStatus;
  created_at: string;
  processing_at: string | null;
  assigned_at: string | null;
};

export async function getAdminClientForRequest() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Las cookies no se pueden modificar en todos los contextos.
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: "No estás autenticado." },
        { status: 401 }
      ),
    };
  }

  const supabaseAdmin = createAdminClient();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      response: NextResponse.json(
        { error: "No tienes permisos para gestionar el inventario." },
        { status: 403 }
      ),
    };
  }

  return { supabaseAdmin };
}

export async function GET() {
  try {
    const authorization = await getAdminClientForRequest();
    if ("response" in authorization) return authorization.response;

    const { supabaseAdmin } = authorization;
    const [codesResult, inventoryResult] = await Promise.all([
      supabaseAdmin
        .from("codes")
        .select("id, code, company_id, group_id")
        .order("code"),
      supabaseAdmin
        .from("inventory_units")
        .select("id, code_id, status, created_at, processing_at, assigned_at"),
    ]);

    if (codesResult.error) {
      return NextResponse.json({ error: codesResult.error.message }, { status: 500 });
    }
    if (inventoryResult.error) {
      return NextResponse.json(
        { error: inventoryResult.error.message },
        { status: 500 }
      );
    }

    const codes = (codesResult.data ?? []) as CodeRecord[];
    const units = (inventoryResult.data ?? []) as InventoryUnitRecord[];
    const inventoryByCodeId = new Map(units.map((unit) => [unit.code_id, unit]));
    const groupIds = [
      ...new Set(
        codes.flatMap((code) => (code.group_id ? [code.group_id] : []))
      ),
    ];

    const groupsById = new Map<string, { name: string; company_id: string }>();
    if (groupIds.length > 0) {
      const { data: groups, error: groupsError } = await supabaseAdmin
        .from("code_groups")
        .select("id, name, company_id")
        .in("id", groupIds);

      if (groupsError) {
        return NextResponse.json({ error: groupsError.message }, { status: 500 });
      }

      (groups ?? []).forEach((group) => {
        groupsById.set(group.id, {
          name: group.name,
          company_id: group.company_id,
        });
      });
    }

    const companyIds = [
      ...new Set(
        codes.flatMap((code) => (code.company_id ? [code.company_id] : []))
      ),
    ];
    const companiesById = new Map<string, string>();
    if (companyIds.length > 0) {
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id, name")
        .in("id", companyIds);

      if (companiesError) {
        return NextResponse.json(
          { error: companiesError.message },
          { status: 500 }
        );
      }

      (companies ?? []).forEach((company) => {
        companiesById.set(company.id, company.name);
      });
    }

    const available: Array<{ id: string; code: string }> = [];
    const on_sale: Array<{ id: string; code: string; unit_id: string }> = [];
    const processing: Array<{ id: string; code: string; processing_at: string | null }> = [];
    const sold: Array<{
      id: string;
      code: string;
      company: string;
      group: string;
      assigned_at: string | null;
    }> = [];
    const review: Array<{ id: string; code: string; reason: string }> = [];

    for (const code of codes) {
      const unit = inventoryByCodeId.get(code.id);
      const group = code.group_id ? groupsById.get(code.group_id) : undefined;

      if (code.company_id && code.group_id) {
        if (group && group.company_id === code.company_id) {
          sold.push({
            id: code.id,
            code: code.code,
            company: companiesById.get(code.company_id) ?? "Empresa no encontrada",
            group: group.name,
            assigned_at: unit?.assigned_at ?? null,
          });
        } else {
          review.push({
            id: code.id,
            code: code.code,
            reason: "La empresa y el grupo no coinciden o el grupo no existe.",
          });
        }
        continue;
      }

      if (code.company_id || code.group_id) {
        review.push({
          id: code.id,
          code: code.code,
          reason: "La asignación a empresa/grupo está incompleta.",
        });
        continue;
      }

      if (!unit || unit.status === "not_for_sale") {
        available.push({ id: code.id, code: code.code });
      } else if (unit.status === "available") {
        on_sale.push({ id: code.id, code: code.code, unit_id: unit.id });
      } else if (unit.status === "processing") {
        processing.push({
          id: code.id,
          code: code.code,
          processing_at: unit.processing_at,
        });
      } else {
        review.push({
          id: code.id,
          code: code.code,
          reason: `La unidad tiene el estado heredado “${unit.status}” sin una asignación completa.`,
        });
      }
    }

    return NextResponse.json({
      summary: {
        available: available.length,
        on_sale: on_sale.length,
        processing: processing.length,
        sold: sold.length,
        review: review.length,
      },
      available,
      on_sale,
      processing,
      sold,
      review,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
