"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/app/components/sign-out-button";

type Company = {
  id: string;
  name: string;
  created_at: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Code = {
  id: string;
  code: string;
  group_id: string;
  destination_url: string | null;
  active: boolean;
  created_at: string;
};

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const companyId = String(params.id ?? "");

  const [company, setCompany] =
    useState<Company | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);

  const [scanCounts, setScanCounts] =
    useState<Record<string, number>>({});

  const [role, setRole] = useState<
    "admin" | "company" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showGroupForm, setShowGroupForm] =
    useState(false);

  const [groupName, setGroupName] =
    useState("");

  const [groupDescription, setGroupDescription] =
    useState("");

  const [savingGroup, setSavingGroup] =
    useState(false);

  const [showCodeForm, setShowCodeForm] =
    useState(false);

  const [codePrefix, setCodePrefix] =
    useState("M");

  const [codeStart, setCodeStart] =
    useState(1002);

  const [codeQuantity, setCodeQuantity] =
    useState(10);

  const [codeDestination, setCodeDestination] =
    useState("");

  const [selectedGroupId, setSelectedGroupId] =
    useState("");

  const [savingCodes, setSavingCodes] =
    useState(false);

  const [editingCodeId, setEditingCodeId] =
    useState<string | null>(null);

  const [editingDestination, setEditingDestination] =
    useState("");

  const [editingActive, setEditingActive] =
    useState(true);

  const [editingGroupId, setEditingGroupId] =
    useState("");

  const [savingEdit, setSavingEdit] =
    useState(false);

  /*
   * ----------------------------------------------------
   * COMPROBAR USUARIO Y EMPRESA
   * ----------------------------------------------------
   */

  async function checkAccess() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return false;
    }

    /*
     * Obtener perfil del usuario
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError(
        "No se encontró el perfil de este usuario."
      );

      setLoading(false);

      return false;
    }

    /*
     * ADMIN
     *
     * Puede acceder a cualquier empresa.
     */
    if (profile.role === "admin") {
      setRole("admin");
      return true;
    }

    /*
     * COMPANY
     *
     * Solo puede acceder a su propia empresa.
     */
    if (profile.role === "company") {
      setRole("company");

      if (
        !profile.company_id ||
        profile.company_id !== companyId
      ) {
        router.replace("/dashboard");
        return false;
      }

      return true;
    }

    /*
     * Cualquier otro rol
     */
    router.replace("/dashboard");

    return false;
  }

  /*
   * ----------------------------------------------------
   * CARGAR EMPRESA
   * ----------------------------------------------------
   */

  async function loadCompany() {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, created_at")
      .eq("id", companyId)
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setCompany(data);
  }

  /*
   * ----------------------------------------------------
   * CARGAR GRUPOS
   * ----------------------------------------------------
   */

  async function loadGroups() {
    const { data, error } = await supabase
      .from("code_groups")
      .select(
        "id, name, description, created_at"
      )
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      return;
    }

    setGroups(data ?? []);
  }

  /*
   * ----------------------------------------------------
   * CARGAR CÓDIGOS
   * ----------------------------------------------------
   *
   * Los códigos se obtienen a través de los grupos
   * pertenecientes a esta empresa.
   */

  async function loadCodes() {
    const {
      data: groupData,
      error: groupError,
    } = await supabase
      .from("code_groups")
      .select("id")
      .eq("company_id", companyId);

    if (groupError) {
      setError(groupError.message);
      return;
    }

    const groupIds =
      (groupData ?? []).map(
        (group) => group.id
      );

    if (groupIds.length === 0) {
      setCodes([]);
      return;
    }

    const { data, error } = await supabase
      .from("codes")
      .select(
        "id, code, group_id, destination_url, active, created_at"
      )
      .in("group_id", groupIds)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
      return;
    }

    setCodes(data ?? []);
  }

  /*
   * ----------------------------------------------------
   * CARGAR ESTADÍSTICAS DE ESCANEOS
   * ----------------------------------------------------
   *
   * Primero obtenemos únicamente los códigos
   * pertenecientes a esta empresa.
   */

  async function loadScanCounts() {
    const {
      data: groupData,
      error: groupError,
    } = await supabase
      .from("code_groups")
      .select("id")
      .eq("company_id", companyId);

    if (groupError) {
      setError(groupError.message);
      return;
    }

    const groupIds =
      (groupData ?? []).map(
        (group) => group.id
      );

    if (groupIds.length === 0) {
      setScanCounts({});
      return;
    }

    const {
      data: codesData,
      error: codesError,
    } = await supabase
      .from("codes")
      .select("id")
      .in("group_id", groupIds);

    if (codesError) {
      setError(codesError.message);
      return;
    }

    const codeIds =
      (codesData ?? []).map(
        (code) => code.id
      );

    if (codeIds.length === 0) {
      setScanCounts({});
      return;
    }

    const {
      data: scansData,
      error: scansError,
    } = await supabase
      .from("code_scans")
      .select("code_id")
      .in("code_id", codeIds);

    if (scansError) {
      setError(scansError.message);
      return;
    }

    const counts: Record<string, number> = {};

    for (const scan of scansData ?? []) {
      counts[scan.code_id] =
        (counts[scan.code_id] ?? 0) + 1;
    }

    setScanCounts(counts);
  }

  /*
   * ----------------------------------------------------
   * CARGAR TODO
   * ----------------------------------------------------
   */

  async function loadData() {
    if (!companyId) {
      setError(
        "No se encontró el ID de la empresa."
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const hasAccess = await checkAccess();

    if (!hasAccess) {
      return;
    }

    await Promise.all([
      loadCompany(),
      loadGroups(),
      loadCodes(),
      loadScanCounts(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    if (!companyId) return;

    const loadTimer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(loadTimer);
    // The company ID is the query identity; helpers intentionally use current state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  /*
   * ----------------------------------------------------
   * CREAR GRUPO
   * ----------------------------------------------------
   *
   * Tanto admin como company pueden crear grupos.
   */

  async function createGroup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!groupName.trim()) {
      return;
    }

    setSavingGroup(true);
    setError("");

    const { error } = await supabase
      .from("code_groups")
      .insert({
        company_id: companyId,
        name: groupName.trim(),
        description:
          groupDescription.trim() || null,
      });

    if (error) {
      setError(error.message);
    } else {
      setGroupName("");
      setGroupDescription("");
      setShowGroupForm(false);

      await loadGroups();
    }

    setSavingGroup(false);
  }

  /*
   * ----------------------------------------------------
   * CREAR CÓDIGOS
   * ----------------------------------------------------
   *
   * Solo ADMIN.
   */

  async function createCodes(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (role !== "admin") {
      setError(
        "No tienes permisos para crear códigos."
      );
      return;
    }

    if (!selectedGroupId) {
      setError("Selecciona un grupo.");
      return;
    }

    if (
      codeQuantity < 1 ||
      codeQuantity > 1000
    ) {
      setError(
        "La cantidad debe estar entre 1 y 1000."
      );
      return;
    }

    if (!/^[A-Za-z]+$/.test(codePrefix)) {
      setError(
        "El prefijo solo puede contener letras."
      );
      return;
    }

    setSavingCodes(true);
    setError("");

    const newCodes = Array.from(
      { length: codeQuantity },
      (_, index) => ({
        code:
          `${codePrefix.toUpperCase()}${
            codeStart + index
          }`,

        group_id: selectedGroupId,

        destination_url:
          codeDestination.trim() || null,

        active: true,
      })
    );

    const { error } = await supabase
      .from("codes")
      .insert(newCodes);

    if (error) {
      if (error.code === "23505") {
        setError(
          "Uno o más códigos ya existen. Cambia el número inicial."
        );
      } else {
        setError(error.message);
      }
    } else {
      setShowCodeForm(false);
      setCodeDestination("");
      setCodeQuantity(10);
      setError("");

      await loadCodes();
      await loadScanCounts();
    }

    setSavingCodes(false);
  }

  /*
   * ----------------------------------------------------
   * EDITAR CÓDIGO
   * ----------------------------------------------------
   *
   * Admin y company pueden hacerlo.
   */

  async function updateCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingCodeId) {
      return;
    }

    setSavingEdit(true);
    setError("");

    /*
     * Nunca permitimos cambiar el código.
     * Solo destino, estado y grupo.
     */

    const { error } = await supabase
      .from("codes")
      .update({
        destination_url:
          editingDestination.trim() || null,

        active: editingActive,

        group_id:
          editingGroupId || null,
      })
      .eq("id", editingCodeId);

    if (error) {
      setError(error.message);
    } else {
      setEditingCodeId(null);
      setEditingDestination("");
      setEditingActive(true);
      setEditingGroupId("");

      await loadCodes();
    }

    setSavingEdit(false);
  }

  /*
   * ----------------------------------------------------
   * LOADING
   * ----------------------------------------------------
   */

  if (loading) {
    return (
      <main className="tapixxo-shell flex min-h-screen items-center justify-center text-white">
        <p className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-400">
          Verificando acceso...
        </p>
      </main>
    );
  }

  /*
   * ----------------------------------------------------
   * EMPRESA NO ENCONTRADA
   * ----------------------------------------------------
   */

  if (!company) {
    return (
      <main className="tapixxo-shell min-h-screen p-8 text-white">
        <h1 className="text-2xl font-semibold tracking-tight">
          Empresa no encontrada
        </h1>

        <p className="mt-2 text-red-400">
          {error}
        </p>

        <Link
          href="/companies"
          className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm transition hover:border-orange-400/40 hover:bg-orange-400/10"
        >
          Volver a empresas
        </Link>
      </main>
    );
  }

  return (
    <main className="tapixxo-shell tapixxo-grid min-h-screen text-white">

      {/* HEADER */}

      <header className="border-b border-white/[0.08] bg-black/20 px-5 py-5 backdrop-blur-sm md:px-8">

        <Link
          href="/companies"
          className="text-sm text-gray-400 transition hover:text-orange-300"
        >
          ← Empresas
        </Link>

        <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">Centro de gestión</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              {company.name}
            </h1>

            {/* SOLO ADMIN VE EL ID */}

            {role === "admin" && (
              <p className="mt-1 text-sm text-gray-500">
                ID: {company.id}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/companies/${companyId}/stats`}
              className="inline-flex w-fit items-center rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_24px_rgba(255,122,26,0.28)]"
            >
              Ver estadísticas
            </Link>
            <SignOutButton />
          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl p-5 md:p-8">

        {/* ESTADÍSTICAS */}

        <div className="grid gap-3 md:grid-cols-3">

          <div className="tapixxo-panel tapixxo-enter rounded-2xl p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              Grupos
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {groups.length}
            </p>
          </div>

          <div className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-1 rounded-2xl p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              Códigos
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {codes.length}
            </p>
          </div>

          <div className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-2 rounded-2xl p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              Visitas
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {Object.values(scanCounts).reduce(
                (total, count) =>
                  total + count,
                0
              )}
            </p>
          </div>

        </div>

        {/* GRUPOS */}

        <section className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-3 mt-8 rounded-2xl p-5 sm:p-6">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>
              <h2 className="text-xl font-semibold">
                Grupos y códigos
              </h2>

              <p className="mt-1 text-gray-400">
                Organiza los códigos físicos de esta empresa.
              </p>
            </div>

            <div className="flex gap-3">

              {/* ADMIN Y COMPANY */}

              <button
                onClick={() =>
                  setShowGroupForm(
                    !showGroupForm
                  )
                }
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold transition hover:border-orange-400/40 hover:bg-orange-400/10"
              >
                {showGroupForm
                  ? "Cancelar"
                  : "Nuevo grupo"}
              </button>

              {/* SOLO ADMIN */}

              {role === "admin" && (
                <button
                  onClick={() =>
                    setShowCodeForm(
                      !showCodeForm
                    )
                  }
                  className="rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-300"
                >
                  {showCodeForm
                    ? "Cancelar"
                    : "Generar códigos"}
                </button>
              )}

            </div>

          </div>

          {/* FORMULARIO GRUPO */}

          {showGroupForm && (

            <form
              onSubmit={createGroup}
              className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5"
            >

              <h3 className="text-lg font-semibold">
                Crear grupo
              </h3>

              <div className="mt-4 space-y-4">

                <input
                  type="text"
                  value={groupName}
                  onChange={(event) =>
                    setGroupName(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Mesas"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none transition focus:border-orange-400/60"
                />

                <input
                  type="text"
                  value={groupDescription}
                  onChange={(event) =>
                    setGroupDescription(
                      event.target.value
                    )
                  }
                  placeholder="Descripción"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none transition focus:border-orange-400/60"
                />

                <button
                  type="submit"
                  disabled={savingGroup}
                  className="rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:opacity-50"
                >
                  {savingGroup
                    ? "Creando..."
                    : "Crear grupo"}
                </button>

              </div>

            </form>
          )}

          {/* GENERADOR DE CÓDIGOS - SOLO ADMIN */}

          {role === "admin" &&
            showCodeForm && (

            <form
              onSubmit={createCodes}
              className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-400/[0.03] p-5 sm:p-6"
            >

              <h3 className="text-lg font-semibold">
                Generar lote de códigos
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Genera códigos permanentes para los QR.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm text-gray-400">
                    Grupo
                  </label>

                  <select
                    value={selectedGroupId}
                    onChange={(event) =>
                      setSelectedGroupId(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400/60"
                  >

                    <option value="">
                      Seleccionar grupo
                    </option>

                    {groups.map((group) => (
                      <option
                        key={group.id}
                        value={group.id}
                      >
                        {group.name}
                      </option>
                    ))}

                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-400">
                    Prefijo
                  </label>

                  <input
                    value={codePrefix}
                    onChange={(event) =>
                      setCodePrefix(
                        event.target.value
                      )
                    }
                    maxLength={10}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-400">
                    Número inicial
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={codeStart}
                    onChange={(event) =>
                      setCodeStart(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-400">
                    Cantidad
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={codeQuantity}
                    onChange={(event) =>
                      setCodeQuantity(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400/60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-gray-400">
                    Destino
                  </label>

                  <input
                    type="url"
                    value={codeDestination}
                    onChange={(event) =>
                      setCodeDestination(
                        event.target.value
                      )
                    }
                    placeholder="https://ejemplo.com/menu"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-orange-400/60"
                  />
                </div>

              </div>

              <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/30 p-4 text-sm text-gray-400">

                Se generarán:

                <span className="ml-2 font-semibold text-white">

                  {codePrefix.toUpperCase()}
                  {codeStart}

                  {" → "}

                  {codePrefix.toUpperCase()}
                  {codeStart +
                    Math.max(
                      codeQuantity - 1,
                      0
                    )}

                </span>

              </div>

              <button
                type="submit"
                disabled={savingCodes}
                className="mt-5 rounded-xl bg-orange-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:opacity-50"
              >
                {savingCodes
                  ? "Generando..."
                  : "Generar códigos"}
              </button>

            </form>
          )}

          {/* ERROR */}

          {error && (
            <p className="mt-5 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {/* LISTA DE GRUPOS */}

          <div className="mt-8">

            {groups.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-10 text-center">
                <p className="text-gray-400">
                  Esta empresa todavía no tiene grupos.
                </p>
              </div>

            ) : (

              <div className="space-y-3">

                {groups.map((group) => (

                  <div
                    key={group.id}
                    className="rounded-2xl border border-white/[0.08] bg-black/25 p-5 transition hover:border-orange-400/25"
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <h3 className="font-semibold">
                          {group.name}
                        </h3>

                        {group.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {group.description}
                          </p>
                        )}

                      </div>

                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                        {
                          codes.filter(
                            (code) =>
                              code.group_id ===
                              group.id
                          ).length
                        }{" "}
                        códigos
                      </span>

                    </div>

                    <div className="mt-4 space-y-2">

                      {codes
                        .filter(
                          (code) =>
                            code.group_id ===
                            group.id
                        )
                        .map((code) => (

                          <div
                            key={code.id}
                            className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/35 p-4 transition hover:border-orange-400/20 md:flex-row md:items-center md:justify-between"
                          >

                            <div>

                              <div className="flex items-center gap-3">

                                <span className="font-mono font-semibold">
                                  {code.code}
                                </span>

                                <span
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    code.active
                                      ? "border border-orange-400/20 bg-orange-400/10 text-orange-300"
                                      : "bg-white/[0.06] text-gray-500"
                                  }`}
                                >
                                  {code.active
                                    ? "Activo"
                                    : "Inactivo"}
                                </span>

                              </div>

                              <p className="mt-1 text-xs text-gray-500">
                                /t/{code.code}
                              </p>

                              <p className="mt-2 text-sm text-gray-400">
                                {scanCounts[
                                  code.id
                                ] ?? 0}{" "}
                                {
                                  scanCounts[
                                    code.id
                                  ] === 1
                                    ? "escaneo"
                                    : "escaneos"
                                }
                              </p>

                              {code.destination_url && (
                                <p className="mt-1 max-w-xl truncate text-sm text-gray-400">
                                  {
                                    code.destination_url
                                  }
                                </p>
                              )}

                            </div>

                            {/* EDITOR */}

                            <div className="flex gap-2">

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCodeId(
                                    code.id
                                  );

                                  setEditingDestination(
                                    code.destination_url ??
                                      ""
                                  );

                                  setEditingGroupId(
                                    code.group_id ??
                                      ""
                                  );

                                  setEditingActive(
                                    code.active
                                  );
                                }}
                                className="rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:border-orange-400/40 hover:bg-orange-400/10"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/t/${code.code}`
                                  )
                                }
                                className="rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:border-orange-400/40 hover:bg-orange-400/10"
                              >
                                Copiar URL
                              </button>

                            </div>

                            {/* FORMULARIO EDICIÓN */}

                            {editingCodeId ===
                              code.id && (

                              <form
                                onSubmit={
                                  updateCode
                                }
                                className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] p-4"
                              >

                                <div className="grid gap-4">

                                  <div>

                                    <label className="mb-2 block text-sm text-gray-400">
                                      Grupo
                                    </label>

                                    <select
                                      value={
                                        editingGroupId
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setEditingGroupId(
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-orange-400/60"
                                    >

                                      <option value="">
                                        Sin grupo
                                      </option>

                                      {groups.map(
                                        (
                                          group
                                        ) => (
                                          <option
                                            key={
                                              group.id
                                            }
                                            value={
                                              group.id
                                            }
                                          >
                                            {
                                              group.name
                                            }
                                          </option>
                                        )
                                      )}

                                    </select>

                                  </div>

                                  <div>

                                    <label className="mb-2 block text-sm text-gray-400">
                                      Destino
                                    </label>

                                    <input
                                      type="url"
                                      value={
                                        editingDestination
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setEditingDestination(
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      placeholder="https://ejemplo.com"
                                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-orange-400/60"
                                    />

                                  </div>

                                  <label className="flex items-center gap-2 text-sm text-gray-300">

                                    <input
                                      type="checkbox"
                                      checked={
                                        editingActive
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setEditingActive(
                                          event
                                            .target
                                            .checked
                                        )
                                      }
                                    />

                                    Activo

                                  </label>

                                  <div className="flex gap-2">

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCodeId(
                                          null
                                        );

                                        setEditingDestination(
                                          ""
                                        );

                                        setEditingActive(
                                          true
                                        );

                                        setEditingGroupId(
                                          ""
                                        );
                                      }}
                                      className="rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-orange-400/40 hover:bg-orange-400/10"
                                    >
                                      Cancelar
                                    </button>

                                    <button
                                      type="submit"
                                      disabled={
                                        savingEdit
                                      }
                                      className="rounded-xl bg-orange-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-300"
                                    >
                                      {savingEdit
                                        ? "Guardando..."
                                        : "Guardar"}
                                    </button>

                                  </div>

                                </div>

                              </form>

                            )}

                          </div>

                        ))}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}
