"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/app/components/sign-out-button";
import { CompanyAvatar } from "@/app/components/company-avatar";
import { CompanyAvatarUpload } from "@/app/components/company-avatar-upload";
import { LiquidLoader } from "@/app/components/liquid-loader";

type Company = {
  id: string;
  name: string;
  created_at: string;
  profile_image_path: string | null;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type ReassignmentGroup = {
  id: string;
  name: string;
  company_id: string;
};

type Code = {
  id: string;
  code: string;
  group_id: string;
  destination_url: string | null;
  active: boolean;
  created_at: string;
  qr_png_path: string | null;
};

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const companyId = String(params.id ?? "");

  const [company, setCompany] =
    useState<Company | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [newStoreCodeIds, setNewStoreCodeIds] = useState<string[]>([]);

  const [scanCounts, setScanCounts] =
    useState<Record<string, number>>({});

  const [scanCountsAvailable, setScanCountsAvailable] =
    useState(false);

  const [role, setRole] = useState<
    "admin" | "company" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const [avatarMenuPosition, setAvatarMenuPosition] =
    useState({ top: 0, left: 0 });

  const [showGroupForm, setShowGroupForm] =
    useState(false);

  const [groupName, setGroupName] =
    useState("");

  const [groupDescription, setGroupDescription] =
    useState("");

  const [savingGroup, setSavingGroup] =
    useState(false);

  const [codeSearch, setCodeSearch] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [replacementGroupId, setReplacementGroupId] = useState("");
  const [savingGroupDeletion, setSavingGroupDeletion] = useState(false);

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

  const handledEditCodeIdRef = useRef<string | null>(null);

  const [editingDestination, setEditingDestination] =
    useState("");

  const [editingActive, setEditingActive] =
    useState(true);

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [reassignmentCompanies, setReassignmentCompanies] =
    useState<Array<Pick<Company, "id" | "name">>>([]);

  const [reassignmentGroups, setReassignmentGroups] =
    useState<ReassignmentGroup[]>([]);

  const [reassignmentCompanyId, setReassignmentCompanyId] =
    useState("");

  const [reassignmentGroupId, setReassignmentGroupId] =
    useState("");

  const [savingCodeAction, setSavingCodeAction] =
    useState<string | null>(null);

  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [updatingEditMode, setUpdatingEditMode] = useState(false);

  const [codeToDelete, setCodeToDelete] = useState<Code | null>(null);
  const [deleteCodePassword, setDeleteCodePassword] = useState("");

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
      return "admin";
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

      return "company";
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
      .select("id, name, created_at, profile_image_path")
      .eq("id", companyId)
      .single();

    if (error) {
      if (error.code === "42703") {
        const { data: fallbackCompany, error: fallbackError } =
          await supabase
            .from("companies")
            .select("id, name, created_at")
            .eq("id", companyId)
            .single();

        if (!fallbackError && fallbackCompany) {
          setCompany({
            ...fallbackCompany,
            profile_image_path: null,
          });
          return;
        }
      }

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
        "id, code, group_id, destination_url, active, created_at, qr_png_path"
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

    try {
      const response = await fetch(`/api/companies/${companyId}/store-code-freshness`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result.code_ids)) {
        setNewStoreCodeIds(result.code_ids.filter((id: unknown): id is string => typeof id === "string"));
      }
    } catch {
      // El tag es complementario: no bloquea el panel si su consulta falla.
      setNewStoreCodeIds([]);
    }
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
    const response = await fetch(
      `/api/companies/${companyId}/scan-counts`
    );
    const result = await response.json();

    if (!response.ok) {
      setScanCounts({});
      setScanCountsAvailable(false);
      return;
    }

    setScanCounts(result.counts ?? {});
    setScanCountsAvailable(true);
  }

  async function loadEditMode() {
    try {
      const response = await fetch(
        `/api/code-edit-mode?companyId=${encodeURIComponent(companyId)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      setEditModeEnabled(response.ok && result.enabled === true);
    } catch {
      setEditModeEnabled(false);
    }
  }

  async function toggleEditMode() {
    const nextEnabled = !editModeEnabled;
    setUpdatingEditMode(true);
    setError("");

    try {
      const response = await fetch("/api/code-edit-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, enabled: nextEnabled }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo cambiar el modo edición.");
        return;
      }

      setEditModeEnabled(result.enabled === true);
    } catch {
      setError("No se pudo cambiar el modo edición.");
    } finally {
      setUpdatingEditMode(false);
    }
  }

  async function loadReassignmentOptions() {
    const response = await fetch("/api/admin/code-options");
    const result = await response.json();

    if (response.ok && (result.companies ?? []).length > 0) {
      setReassignmentCompanies(result.companies ?? []);
      setReassignmentGroups(result.groups ?? []);
      return;
    }

    const [companiesResult, groupsResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("code_groups")
        .select("id, name, company_id")
        .order("name", { ascending: true }),
    ]);

    if (companiesResult.error || groupsResult.error) {
      setError(
        result.error ??
          companiesResult.error?.message ??
          groupsResult.error?.message ??
          "No se pudieron cargar las opciones de reasignación."
      );
      return;
    }

    setReassignmentCompanies(companiesResult.data ?? []);
    setReassignmentGroups(groupsResult.data ?? []);
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

    const accessRole = await checkAccess();

    if (!accessRole) {
      return;
    }

    const loadRequests = [
      loadCompany(),
      loadGroups(),
      loadCodes(),
      loadScanCounts(),
      loadEditMode(),
    ];

    if (accessRole === "admin") {
      loadRequests.push(loadReassignmentOptions());
    }

    await Promise.all(loadRequests);

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

  const requestedEditCodeId = searchParams.get("editCode");

  useEffect(() => {
    if (!requestedEditCodeId) {
      handledEditCodeIdRef.current = null;
      return;
    }

    if (handledEditCodeIdRef.current === requestedEditCodeId) return;

    const requestedCode = codes.find((code) => code.id === requestedEditCodeId);
    if (!requestedCode) return;

    const frame = window.requestAnimationFrame(() => {
      if (handledEditCodeIdRef.current === requestedEditCodeId) return;

      handledEditCodeIdRef.current = requestedEditCodeId;
      setEditingCodeId(requestedCode.id);
      setEditingDestination(requestedCode.destination_url ?? "");
      setEditingActive(requestedCode.active);
      setReassignmentCompanyId("");
      setReassignmentGroupId("");
      document.getElementById(`code-${requestedCode.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [codes, requestedEditCodeId]);

  useEffect(() => {
    if (!avatarMenuOpen) return;

    const closeAvatarMenu = () => setAvatarMenuOpen(false);

    window.addEventListener("scroll", closeAvatarMenu, true);
    window.addEventListener("resize", closeAvatarMenu);

    return () => {
      window.removeEventListener("scroll", closeAvatarMenu, true);
      window.removeEventListener("resize", closeAvatarMenu);
    };
  }, [avatarMenuOpen]);

  function toggleAvatarMenu() {
    if (avatarMenuOpen) {
      setAvatarMenuOpen(false);
      return;
    }

    const bounds = avatarButtonRef.current?.getBoundingClientRect();

    if (bounds) {
      setAvatarMenuPosition({
        top: bounds.bottom + 12,
        left: Math.max(16, bounds.left),
      });
    }

    setAvatarMenuOpen(true);
  }

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

    if (groups.length >= 5) {
      setError("Cada empresa puede tener un máximo de 5 grupos.");
      return;
    }

    setSavingGroup(true);
    setError("");

    try {
      const response = await fetch(`/api/companies/${companyId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo crear el grupo.");
        return;
      }

      setGroupName("");
      setGroupDescription("");
      setShowGroupForm(false);
      await loadGroups();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSavingGroup(false);
    }
  }

  function toggleGroupCodes(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  async function deleteGroup(group: Group) {
    if (!replacementGroupId) {
      setError("Selecciona el grupo al que migrar los códigos.");
      return;
    }

    setSavingGroupDeletion(true);
    setError("");

    try {
      const response = await fetch(
        `/api/companies/${companyId}/groups/${group.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replacementGroupId }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo eliminar el grupo.");
        return;
      }

      setDeletingGroupId(null);
      setReplacementGroupId("");
      setExpandedGroupIds((current) => {
        const next = new Set(current);
        next.delete(group.id);
        return next;
      });
      await Promise.all([loadGroups(), loadCodes(), loadScanCounts()]);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSavingGroupDeletion(false);
    }
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

    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: newCodes }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.code === "23505") {
          setError(
            "Uno o más códigos ya existen. Cambia el número inicial."
          );
        } else {
          setError(result.error ?? "No se pudieron generar los códigos.");
        }
      } else {
        setShowCodeForm(false);
        setCodeDestination("");
        setCodeQuantity(10);
        setError("");

        await loadCodes();
        await loadScanCounts();
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSavingCodes(false);
    }
  }

  /*
   * ----------------------------------------------------
   * EDITAR CÓDIGO
   * ----------------------------------------------------
   *
   * Admin y company pueden actualizar destino y estado.
   * La reasignación de grupo/empresa se procesa en la API exclusiva de admin.
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
     * Solo destino y estado.
     */

    const { error } = await supabase
      .from("codes")
      .update({
        destination_url:
          editingDestination.trim() || null,

        active: editingActive,
      })
      .eq("id", editingCodeId);

    if (error) {
      setError(error.message);
    } else {
      setEditingCodeId(null);
      setEditingDestination("");
      setEditingActive(true);
      setReassignmentCompanyId("");
      setReassignmentGroupId("");

      await loadCodes();
    }

    setSavingEdit(false);
  }

  async function reassignCode() {
    if (role !== "admin" || !editingCodeId) {
      setError("No tienes permisos para reasignar códigos.");
      return;
    }

    if (!reassignmentCompanyId || !reassignmentGroupId) {
      setError("Selecciona la empresa y el grupo de destino.");
      return;
    }

    setSavingCodeAction(editingCodeId);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/codes/${editingCodeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetGroupId: reassignmentGroupId }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo reasignar el código.");
        return;
      }

      setEditingCodeId(null);
      setReassignmentCompanyId("");
      setReassignmentGroupId("");
      await Promise.all([loadCodes(), loadScanCounts()]);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSavingCodeAction(null);
    }
  }

  function requestCodeDeletion(code: Code) {
    if (role !== "admin") {
      setError("No tienes permisos para eliminar códigos.");
      return;
    }

    setCodeToDelete(code);
    setDeleteCodePassword("");
    setError("");
  }

  async function deleteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!codeToDelete || !deleteCodePassword) {
      setError("Introduce tu contraseña de administrador.");
      return;
    }

    const code = codeToDelete;

    setSavingCodeAction(code.id);
    setError("");

    try {
      const response = await fetch(`/api/admin/codes/${code.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deleteCodePassword }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo eliminar el código.");
        return;
      }

      if (editingCodeId === code.id) {
        setEditingCodeId(null);
      }

      setCodeToDelete(null);
      setDeleteCodePassword("");

      await Promise.all([loadCodes(), loadScanCounts()]);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSavingCodeAction(null);
    }
  }

  const normalizedCodeSearch = codeSearch.trim().toUpperCase();
  const codesByGroupId = new Map<string, Code[]>();
  for (const code of codes) {
    const groupCodes = codesByGroupId.get(code.group_id) ?? [];
    groupCodes.push(code);
    codesByGroupId.set(code.group_id, groupCodes);
  }
  const visibleGroups = normalizedCodeSearch
    ? groups.filter((group) =>
        (codesByGroupId.get(group.id) ?? []).some((code) =>
          code.code.toUpperCase().includes(normalizedCodeSearch)
        )
      )
    : groups;

  /*
   * ----------------------------------------------------
   * LOADING
   * ----------------------------------------------------
   */

  if (loading) {
    return (
      <main className="tapixxo-shell flex min-h-screen items-center justify-center text-white">
        <LiquidLoader />
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

        {role === "admin" && (
          <Link
            href="/companies"
            className="text-sm text-gray-400 transition hover:text-orange-300"
          >
            ← Empresas
          </Link>
        )}

        <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div className="flex items-center gap-4">
            <div>
              <button
                ref={avatarButtonRef}
                type="button"
                onClick={toggleAvatarMenu}
                aria-label="Editar logo de empresa"
                aria-expanded={avatarMenuOpen}
                className="rounded-2xl outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <CompanyAvatar
                  name={company.name}
                  imagePath={company.profile_image_path}
                  size="lg"
                  version={avatarVersion}
                />
              </button>

            </div>
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
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void toggleEditMode()}
              disabled={updatingEditMode}
              aria-pressed={editModeEnabled}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                editModeEnabled
                  ? "border-orange-300/60 bg-orange-400 text-black hover:bg-orange-300"
                  : "border-white/15 bg-white/[0.04] text-gray-200 hover:border-orange-400/45 hover:bg-orange-400/10"
              }`}
            >
              <span aria-hidden="true">⚙</span>
              {updatingEditMode
                ? "Actualizando..."
                : editModeEnabled
                  ? "Modo edición activo"
                  : "Activar modo edición"}
            </button>
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

      {avatarMenuOpen && (
        <div
          className="fixed inset-0 z-50"
          onMouseDown={() => setAvatarMenuOpen(false)}
          onWheel={() => setAvatarMenuOpen(false)}
        >
          <div
            className="absolute w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-[#141514] shadow-2xl"
            style={avatarMenuPosition}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <CompanyAvatarUpload
              companyId={companyId}
              companyName={company.name}
              imagePath={company.profile_image_path}
              canManage={role === "admin" || role === "company"}
              version={avatarVersion}
              onClose={() => setAvatarMenuOpen(false)}
              onImageChange={(imagePath) => {
                setCompany((currentCompany) =>
                  currentCompany
                    ? {
                        ...currentCompany,
                        profile_image_path: imagePath,
                      }
                    : currentCompany
                );
                setAvatarVersion(Date.now());
              }}
            />
          </div>
        </div>
      )}

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
              {scanCountsAvailable
                ? Object.values(scanCounts).reduce(
                    (total, count) => total + count,
                    0
                  )
                : "—"}
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

            <div className="flex flex-wrap gap-3">

              {/* ADMIN Y COMPANY */}

              <button
                onClick={() =>
                  setShowGroupForm(
                    !showGroupForm
                  )
                }
                disabled={groups.length >= 5 && !showGroupForm}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold transition hover:border-orange-400/40 hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showGroupForm
                  ? "Cancelar"
                  : groups.length >= 5
                    ? "Límite de grupos"
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

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-sm">
              <span className="sr-only">Buscar código</span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500"
              >
                ⌕
              </span>
              <input
                type="search"
                value={codeSearch}
                onChange={(event) => setCodeSearch(event.target.value)}
                placeholder="Buscar código"
                className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-orange-400/60"
              />
              {codeSearch && (
                <button
                  type="button"
                  onClick={() => setCodeSearch("")}
                  className="absolute inset-y-0 right-2 flex min-h-10 min-w-10 items-center justify-center rounded-lg text-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </label>

            <p className="text-xs text-gray-500">
              {groups.length} de 5 grupos
            </p>
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

            ) : visibleGroups.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-10 text-center">
                <p className="text-gray-400">
                  No encontramos códigos con “{codeSearch.trim()}”.
                </p>
              </div>

            ) : (

              <div className="space-y-3">

                {visibleGroups.map((group) => {
                  const groupCodes = codesByGroupId.get(group.id) ?? [];
                  const matchingCodes = normalizedCodeSearch
                    ? groupCodes.filter((code) =>
                        code.code.toUpperCase().includes(normalizedCodeSearch)
                      )
                    : groupCodes;
                  const canCollapse = groupCodes.length > 3;
                  const isExpanded = expandedGroupIds.has(group.id);
                  const displayedCodes =
                    canCollapse && !isExpanded && !normalizedCodeSearch
                      ? matchingCodes.slice(0, 3)
                      : matchingCodes;

                  return (

                  <div
                    key={group.id}
                    className="rounded-2xl border border-white/[0.08] bg-black/25 p-5 transition hover:border-orange-400/25"
                  >

                    <div className="flex flex-wrap items-center justify-between gap-3">

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

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          {groupCodes.length}{" "}
                          códigos
                        </span>

                        {canCollapse && (
                          <button
                            type="button"
                            onClick={() => toggleGroupCodes(group.id)}
                            aria-expanded={isExpanded}
                            className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.16] bg-gradient-to-br from-white/[0.18] via-white/[0.08] to-white/[0.02] text-gray-200 shadow-[0_10px_26px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/60 hover:from-orange-300/25 hover:via-orange-400/15 hover:to-white/[0.06] hover:text-white hover:shadow-[0_14px_30px_rgba(249,115,22,0.18),inset_0_1px_0_rgba(255,255,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70"
                            title={isExpanded ? "Recoger códigos" : "Desplegar códigos"}
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className={`h-5 w-5 transition-transform duration-300 ease-out ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                            <span className="sr-only">
                              {isExpanded ? "Recoger códigos" : "Desplegar códigos"}
                            </span>
                          </button>
                        )}

                        {role === "admin" && (
                          <a
                            href={`/api/admin/code-groups/${group.id}/qr-package`}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-300/30 bg-orange-400/10 px-3 py-2 text-xs font-semibold text-orange-100 transition hover:border-orange-300/60 hover:bg-orange-400/20"
                            title={`Descargar todos los QR de ${group.name}`}
                          >
                            <span aria-hidden="true" className="text-base leading-none">⇩</span>
                            <span className="hidden sm:inline">Descargar QR</span>
                            <span className="sr-only">Descargar paquete QR de {group.name}</span>
                          </a>
                        )}

                        {groups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingGroupId(group.id);
                              setReplacementGroupId("");
                              setError("");
                            }}
                            className="inline-flex min-h-10 items-center rounded-xl border border-red-400/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-400/10"
                          >
                            Eliminar grupo
                          </button>
                        )}
                      </div>

                    </div>

                    {deletingGroupId === group.id && (
                      <div className="mt-4 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-4">
                        <p className="text-sm font-medium text-red-100">
                          Eliminar “{group.name}”
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-400">
                          Sus {groupCodes.length} códigos se migrarán al grupo que selecciones.
                        </p>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <select
                            value={replacementGroupId}
                            onChange={(event) => setReplacementGroupId(event.target.value)}
                            disabled={savingGroupDeletion}
                            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none focus:border-orange-400/60 disabled:opacity-50"
                          >
                            <option value="">Migrar códigos a…</option>
                            {groups
                              .filter((targetGroup) => targetGroup.id !== group.id)
                              .map((targetGroup) => (
                                <option key={targetGroup.id} value={targetGroup.id}>
                                  {targetGroup.name}
                                </option>
                              ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingGroupId(null);
                                setReplacementGroupId("");
                              }}
                              disabled={savingGroupDeletion}
                              className="min-h-11 rounded-xl border border-white/10 px-4 text-sm transition hover:bg-white/[0.06] disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteGroup(group)}
                              disabled={savingGroupDeletion || !replacementGroupId}
                              className="min-h-11 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingGroupDeletion ? "Migrando..." : "Migrar y eliminar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 space-y-2">

                      {displayedCodes.map((code) => (

                          <div
                            id={`code-${code.id}`}
                            key={code.id}
                            className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-black/35 p-4 transition hover:border-orange-400/20 md:flex-row md:items-center md:justify-between"
                          >

                            <div>

                              <div className="flex items-center gap-3">

                                <span className="font-mono font-semibold">
                                  {code.code}
                                </span>

                                {newStoreCodeIds.includes(code.id) && (
                                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-100">
                                    Nuevo
                                  </span>
                                )}

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
                                {scanCountsAvailable
                                  ? `${scanCounts[code.id] ?? 0} ${
                                      scanCounts[code.id] === 1
                                        ? "escaneo"
                                        : "escaneos"
                                    }`
                                  : "Escaneos no disponibles"}
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

                            <div
                              className={`grid w-full gap-2 ${
                                role === "admin" ? "grid-cols-2" : "grid-cols-3"
                              } md:flex md:w-auto md:flex-wrap md:justify-end`}
                            >

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

                                  setReassignmentCompanyId("");
                                  setReassignmentGroupId("");

                                  setEditingActive(
                                    code.active
                                  );
                                }}
                                className="flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-white/10 px-2 py-2 text-center text-sm transition hover:border-orange-400/40 hover:bg-orange-400/10"
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
                                className="flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-white/10 px-2 py-2 text-center text-sm transition hover:border-orange-400/40 hover:bg-orange-400/10"
                              >
                                Copiar URL
                              </button>

                              {code.qr_png_path && (
                                <a
                                  href={`/api/admin/codes/${code.id}/qr`}
                                  download={`${code.code}.png`}
                                  className="flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-white/10 px-2 py-2 text-center text-sm transition hover:border-orange-400/40 hover:bg-orange-400/10"
                                >
                                  Descargar QR
                                </a>
                              )}

                              {role === "admin" && (
                                <button
                                  type="button"
                                  onClick={() => requestCodeDeletion(code)}
                                  disabled={savingCodeAction === code.id}
                                  className="flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-red-400/30 px-2 py-2 text-center text-sm text-red-300 transition hover:border-red-400/60 hover:bg-red-400/10 disabled:opacity-50"
                                >
                                  {savingCodeAction === code.id
                                    ? "Eliminando..."
                                    : "Eliminar"}
                                </button>
                              )}

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
                                      Destino
                                    </label>

                                    <div className="relative">
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
                                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-white outline-none focus:border-orange-400/60"
                                      />
                                      {editingDestination && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingDestination("")}
                                          className="absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xl text-gray-400 transition hover:bg-white/10 hover:text-white"
                                          aria-label="Eliminar enlace"
                                          title="Eliminar enlace"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>

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

                                  {role === "admin" && (
                                    <div className="rounded-xl border border-orange-400/20 bg-orange-400/[0.03] p-4">
                                      <p className="text-sm font-medium text-orange-200">
                                        Reasignar a otra empresa
                                      </p>

                                      <p className="mt-1 text-xs text-gray-400">
                                        Esta acción solo está disponible para administradores.
                                      </p>

                                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <div>
                                          <label className="mb-2 block text-sm text-gray-400">
                                            Empresa destino
                                          </label>

                                          <select
                                            value={reassignmentCompanyId}
                                            onChange={(event) => {
                                              setReassignmentCompanyId(event.target.value);
                                              setReassignmentGroupId("");
                                            }}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-orange-400/60"
                                          >
                                            <option value="">
                                              Seleccionar empresa
                                            </option>

                                            {reassignmentCompanies.map(
                                              (targetCompany) => (
                                                <option key={targetCompany.id} value={targetCompany.id}>
                                                  {targetCompany.id === companyId
                                                    ? `${targetCompany.name} (empresa actual)`
                                                    : targetCompany.name}
                                                </option>
                                              )
                                            )}
                                          </select>

                                          {reassignmentCompanies.length <= 1 && (
                                            <p className="mt-2 text-xs text-gray-500">
                                              Aún no hay otra empresa registrada para reasignar este código.
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <label className="mb-2 block text-sm text-gray-400">
                                            Grupo destino
                                          </label>

                                          <select
                                            value={reassignmentGroupId}
                                            onChange={(event) =>
                                              setReassignmentGroupId(event.target.value)
                                            }
                                            disabled={!reassignmentCompanyId}
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-orange-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            <option value="">
                                              Seleccionar grupo
                                            </option>

                                            {reassignmentGroups
                                              .filter(
                                                (targetGroup) =>
                                                  targetGroup.company_id === reassignmentCompanyId
                                              )
                                              .map((targetGroup) => (
                                                <option key={targetGroup.id} value={targetGroup.id}>
                                                  {targetGroup.name}
                                                </option>
                                              ))}
                                          </select>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => void reassignCode()}
                                        disabled={savingCodeAction === code.id}
                                        className="mt-4 rounded-xl border border-orange-400/40 px-4 py-3 text-sm font-semibold text-orange-200 transition hover:bg-orange-400/10 disabled:opacity-50"
                                      >
                                        {savingCodeAction === code.id
                                          ? "Reasignando..."
                                          : "Reasignar código"}
                                      </button>
                                    </div>
                                  )}

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

                                        setReassignmentCompanyId("");
                                        setReassignmentGroupId("");
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

                    {canCollapse && !normalizedCodeSearch && (
                      <button
                        type="button"
                        onClick={() => toggleGroupCodes(group.id)}
                        aria-expanded={isExpanded}
                        className="group mt-4 flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/[0.14] bg-gradient-to-r from-white/[0.1] via-white/[0.045] to-orange-300/[0.055] px-4 text-left text-sm font-medium text-gray-200 shadow-[0_10px_28px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/55 hover:from-white/[0.16] hover:via-orange-300/[0.1] hover:to-orange-400/[0.14] hover:shadow-[0_16px_34px_rgba(249,115,22,0.14),inset_0_1px_0_rgba(255,255,255,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70"
                      >
                        <span>
                          {isExpanded
                            ? "Recoger códigos"
                            : `Ver ${groupCodes.length - displayedCodes.length} código${groupCodes.length - displayedCodes.length === 1 ? "" : "s"} más`}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.08] text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition duration-300 group-hover:bg-orange-300/20">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className={`h-4 w-4 transition-transform duration-300 ease-out ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </button>
                    )}

                  </div>

                );
                })}

              </div>

            )}

          </div>

        </section>

      </div>

      {codeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <form
            onSubmit={deleteCode}
            className="w-full max-w-md rounded-2xl border border-red-400/30 bg-[#15120f] p-6 shadow-2xl"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-red-300">Acción irreversible</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Eliminar {codeToDelete.code}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Esta acción elimina el código y sus escaneos asociados. Confirma con tu contraseña de administrador.
            </p>

            <label className="mt-5 block text-sm text-gray-300">
              Contraseña de administrador
              <input
                type="password"
                value={deleteCodePassword}
                onChange={(event) => setDeleteCodePassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={savingCodeAction === codeToDelete.id}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-red-400/60 disabled:opacity-50"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={savingCodeAction === codeToDelete.id}
                onClick={() => {
                  setCodeToDelete(null);
                  setDeleteCodePassword("");
                }}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCodeAction === codeToDelete.id || !deleteCodePassword}
                className="rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingCodeAction === codeToDelete.id ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </form>
        </div>
      )}

    </main>
  );
}
