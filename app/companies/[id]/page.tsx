"use client";

import {
  FormEvent,
  useCallback,
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
import { GoogleReviewsDestinationTool } from "@/app/components/google-reviews-destination-tool";
import { CodeScheduleDestinationTool } from "@/app/components/code-schedule-destination-tool";
import { ChangePasswordControl } from "@/app/components/change-password-control";

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

// Mantiene la jerarquía humana de los códigos: M2 aparece antes de M10.
const codeNumberOrder = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

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
  const [scheduledCodeIds, setScheduledCodeIds] = useState<Set<string>>(new Set());
  const [scheduleEditorCodeId, setScheduleEditorCodeId] = useState<string | null>(null);
  const [activeDestinationTool, setActiveDestinationTool] = useState<"google" | "schedule" | null>(null);
  const handleGoogleDestinationOpen = useCallback(
    (open: boolean) => setActiveDestinationTool(open ? "google" : null),
    []
  );
  const handleScheduleDestinationOpen = useCallback(
    (open: boolean) => setActiveDestinationTool(open ? "schedule" : null),
    []
  );
  const [scanCounts, setScanCounts] =
    useState<Record<string, number>>({});

  const [scanCountsAvailable, setScanCountsAvailable] =
    useState(false);
  const [todayVisits, setTodayVisits] = useState<number | null>(null);

  const [role, setRole] = useState<
    "admin" | "company" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
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
  const [codeView, setCodeView] = useState<"grid" | "list">("grid");
  const [activeGroupId, setActiveGroupId] = useState<string | "all">("all");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set()
  );
  const [groupMenuOpenId, setGroupMenuOpenId] = useState<string | null>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [replacementGroupId, setReplacementGroupId] = useState("");
  const [savingGroupDeletion, setSavingGroupDeletion] = useState(false);

  useEffect(() => {
    function closeGroupMenuOnOutsidePress(event: PointerEvent) {
      if (!groupMenuRef.current?.contains(event.target as Node)) {
        setGroupMenuOpenId(null);
      }
    }

    document.addEventListener("pointerdown", closeGroupMenuOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeGroupMenuOnOutsidePress);
  }, []);

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
  const [closingCodeId, setClosingCodeId] = useState<string | null>(null);
  const codeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [showCompanyDeletion, setShowCompanyDeletion] = useState(false);
  const [companyDeletePassword, setCompanyDeletePassword] = useState("");
  const [companyDeleteError, setCompanyDeleteError] = useState("");
  const [deletingCompany, setDeletingCompany] = useState(false);

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
      setTodayVisits(null);
      return;
    }

    setScanCounts(result.counts ?? {});
    setScanCountsAvailable(true);
    setTodayVisits(typeof result.today_count === "number" ? result.today_count : null);
  }

  async function loadScheduleAssignments() {
    try {
      const response = await fetch(`/api/companies/${companyId}/schedules`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.schedules)) {
        setScheduledCodeIds(new Set());
        return;
      }
      const ids = result.schedules.flatMap((schedule: { code_schedule_assignments?: Array<{ code_id?: string }> }) =>
        (schedule.code_schedule_assignments ?? []).map((assignment) => assignment.code_id).filter((id): id is string => typeof id === "string")
      );
      setScheduledCodeIds(new Set(ids));
    } catch {
      setScheduledCodeIds(new Set());
    }
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
      loadScheduleAssignments(),
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
    const isOpening = !expandedGroupIds.has(groupId);

    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });

    if (isOpening) {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          const isMobile = window.matchMedia("(max-width: 767px)").matches;
          document.getElementById(`group-${groupId}`)?.scrollIntoView({
            behavior: "smooth",
            block: isMobile ? "start" : "center",
            inline: "nearest",
          });
        }, 80);
      });
    }
  }

  function openCodeEditor(code: Code) {
    if (codeCloseTimerRef.current) {
      clearTimeout(codeCloseTimerRef.current);
      codeCloseTimerRef.current = null;
    }
    setClosingCodeId(null);
    setEditingCodeId(code.id);
    setEditingDestination(code.destination_url ?? "");
    setReassignmentCompanyId("");
    setReassignmentGroupId("");
    setEditingActive(code.active);

    window.requestAnimationFrame(() => {
      document.getElementById(`code-${code.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    });
  }

  function closeCodeEditor(codeId: string) {
    if (closingCodeId === codeId) return;

    setClosingCodeId(codeId);
    if (codeCloseTimerRef.current) clearTimeout(codeCloseTimerRef.current);

    codeCloseTimerRef.current = setTimeout(() => {
      setEditingCodeId((current) => (current === codeId ? null : current));
      setClosingCodeId(null);
      codeCloseTimerRef.current = null;
    }, 620);
  }

  async function deleteCurrentCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyDeletePassword) {
      setCompanyDeleteError("Introduce tu contraseña de administrador.");
      return;
    }

    setDeletingCompany(true);
    setCompanyDeleteError("");

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: companyDeletePassword }),
      });
      const result = await response.json();

      if (!response.ok) {
        setCompanyDeleteError(result.error ?? "No se pudo eliminar la empresa.");
        return;
      }

      router.replace("/companies");
    } catch {
      setCompanyDeleteError("No se pudo conectar con el servidor.");
    } finally {
      setDeletingCompany(false);
    }
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
  const visibleGroups = groups.filter((group) => {
    const matchesGroup = activeGroupId === "all" || group.id === activeGroupId;
    const matchesSearch = !normalizedCodeSearch || (codesByGroupId.get(group.id) ?? []).some((code) =>
      code.code.toUpperCase().includes(normalizedCodeSearch)
    );
    return matchesGroup && matchesSearch;
  });

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

        <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-0 sm:gap-4 md:flex-row md:items-end md:justify-between">

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
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">Centro de gestión</p>
              <div className="mt-2 flex w-full items-center gap-3">
                <h1 className="min-w-0 truncate text-3xl font-semibold tracking-tight md:text-4xl">
                  {company.name}
                </h1>
                <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">
                  <div
                    className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border border-white/[0.15] bg-white/[0.07] px-2.5 text-sm font-semibold text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                    title="Visitas de hoy"
                    aria-label={todayVisits === null ? "Cargando visitas de hoy" : `${todayVisits} visitas de hoy`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-orange-200"><path d="M2.8 12s3.3-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.3 5.5-9.2 5.5S2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                    <span>{todayVisits ?? "—"}</span>
                    <span className="sr-only">visitas de hoy</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileActionsOpen((open) => !open)}
                    aria-expanded={mobileActionsOpen}
                    aria-label={mobileActionsOpen ? "Cerrar menú" : "Abrir menú"}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.15] bg-white/[0.07] text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl transition"
                  >
                    <span className="relative block h-4 w-4" aria-hidden="true">
                      <span className={`absolute left-0 h-px w-4 bg-current transition-all duration-300 ${mobileActionsOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`} />
                      <span className={`absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current transition-opacity duration-300 ${mobileActionsOpen ? "opacity-0" : ""}`} />
                      <span className={`absolute bottom-0 left-0 h-px w-4 bg-current transition-all duration-300 ${mobileActionsOpen ? "bottom-1/2 translate-y-1/2 -rotate-45" : ""}`} />
                    </span>
                  </button>
                </div>
              </div>

              {/* SOLO ADMIN VE EL ID */}

              {role === "admin" && (
                <p className="mt-1 text-sm text-gray-500">
                  ID: {company.id}
                </p>
              )}
            </div>
          </div>

          <div className={`grid w-full transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:hidden ${mobileActionsOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-white/[0.15] via-white/[0.07] to-orange-300/[0.08] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMobileActionsOpen(false);
                    void toggleEditMode();
                  }}
                  disabled={updatingEditMode}
                  aria-pressed={editModeEnabled}
                  className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    editModeEnabled
                      ? "border-orange-300/60 bg-orange-400 text-black"
                      : "border-white/15 bg-black/20 text-gray-100 hover:bg-white/[0.1]"
                  }`}
                >
                  <span aria-hidden="true">⚙</span>
                  {updatingEditMode ? "Actualizando..." : editModeEnabled ? "Modo edición activo" : "Activar modo edición"}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href={`/companies/${companyId}/stats`} className="flex min-h-12 items-center justify-center rounded-xl bg-orange-400 px-3 text-center text-sm font-semibold text-black shadow-[0_8px_20px_rgba(255,122,26,0.22)] transition hover:bg-orange-300">
                    Ver estadísticas
                  </Link>
                  <ChangePasswordControl className="min-h-12 w-full px-3" />
                </div>
                <div className="mt-2 [&>button]:min-h-12 [&>button]:w-full [&>button]:px-3">
                  <SignOutButton />
                </div>
                {role === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileActionsOpen(false);
                      setCompanyDeletePassword("");
                      setCompanyDeleteError("");
                      setShowCompanyDeletion(true);
                    }}
                    className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border border-red-400/35 bg-red-400/[0.06] px-3 text-sm font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-400/[0.14]"
                  >
                    Eliminar empresa
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-3 sm:flex">
            <div
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.13] bg-white/[0.06] px-3 text-sm font-semibold text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl"
              title="Visitas de hoy"
              aria-label={todayVisits === null ? "Cargando visitas de hoy" : `${todayVisits} visitas de hoy`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-orange-200"><path d="M2.8 12s3.3-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.3 5.5-9.2 5.5S2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
              <span>{todayVisits ?? "—"}</span>
              <span className="sr-only">visitas de hoy</span>
            </div>
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
            <ChangePasswordControl />
            {role === "admin" && (
              <button
                type="button"
                onClick={() => {
                  setCompanyDeletePassword("");
                  setCompanyDeleteError("");
                  setShowCompanyDeletion(true);
                }}
                className="inline-flex w-fit items-center rounded-xl border border-red-400/35 bg-red-400/[0.06] px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-400/[0.14]"
              >
                Eliminar empresa
              </button>
            )}
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

        <div className="grid min-w-0 grid-cols-2 items-start gap-3 sm:grid-cols-1 sm:gap-5 lg:grid-cols-2 lg:gap-6">
          <div className={`min-w-0 origin-top will-change-transform transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            activeDestinationTool === "schedule"
              ? "pointer-events-none col-span-2 max-h-0 -translate-y-3 scale-[0.985] overflow-hidden opacity-0"
            : activeDestinationTool === "google"
                ? "col-span-2 max-h-[10000px] opacity-100"
                : "max-h-[10000px] opacity-100 lg:col-span-1"
          }`}>
            <GoogleReviewsDestinationTool
              companyId={companyId}
              codes={codes}
              onCodesUpdated={() => void loadCodes()}
              onOpenChange={handleGoogleDestinationOpen}
            />
          </div>
          <div className={`min-w-0 origin-top will-change-transform transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            activeDestinationTool === "google"
              ? "pointer-events-none col-span-2 max-h-0 -translate-y-3 scale-[0.985] overflow-hidden opacity-0"
            : activeDestinationTool === "schedule"
                ? "col-span-2 max-h-[10000px] opacity-100"
                : "max-h-[10000px] opacity-100 lg:col-span-1"
          }`}>
            <CodeScheduleDestinationTool
              companyId={companyId}
              codes={codes}
              selectedCodeId={scheduleEditorCodeId}
              onScheduleChanged={() => void loadScheduleAssignments()}
              onOpenChange={handleScheduleDestinationOpen}
            />
          </div>
        </div>

        {/* GRUPOS */}

        <section className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-3 mt-8 min-w-0 rounded-2xl p-5 sm:p-6" style={{ overflow: "visible" }}>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>
              <h2 className="text-xl font-semibold">
                Grupos y códigos
              </h2>

              <p className="mt-1 text-gray-400">
                Organiza los códigos físicos de esta empresa.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 items-center gap-3 sm:w-auto sm:flex sm:flex-row sm:flex-wrap sm:justify-end">
              <label className="relative col-span-1 block w-full sm:col-auto sm:w-44 lg:w-52">
                <span className="sr-only">Buscar código</span>
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">⌕</span>
                <input
                  type="search"
                  value={codeSearch}
                  onChange={(event) => setCodeSearch(event.target.value)}
                  placeholder="Buscar código…"
                  className="min-h-11 w-full rounded-xl border border-white/[0.12] bg-black/30 py-2.5 pl-10 pr-10 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition placeholder:text-gray-500 focus:border-orange-300/70 focus:bg-white/[0.05]"
                />
                {codeSearch && (
                  <button type="button" onClick={() => setCodeSearch("")} className="absolute inset-y-0 right-2 flex min-h-10 min-w-10 items-center justify-center rounded-lg text-lg text-gray-400 transition hover:bg-white/10 hover:text-white" aria-label="Limpiar búsqueda">×</button>
                )}
              </label>

              <button
                onClick={() => setShowGroupForm(!showGroupForm)}
                disabled={groups.length >= 5 && !showGroupForm}
                className="min-h-11 w-full rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(255,255,255,0.12)] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <span aria-hidden="true" className="mr-2">+</span>
                {showGroupForm ? "Cancelar" : groups.length >= 5 ? "Límite de grupos" : "Nuevo grupo"}
              </button>

              {role === "admin" && (
                <button onClick={() => setShowCodeForm(!showCodeForm)} className="col-span-1 min-h-11 rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-300 sm:col-auto">
                  {showCodeForm ? "Cancelar" : "Generar códigos"}
                </button>
              )}
            </div>

          </div>

          <div className="mt-5 min-w-0">
            <div className="-my-6 flex min-w-0 gap-2 overflow-x-auto scroll-px-6 px-6 py-6 [scrollbar-width:none] sm:-m-8 sm:scroll-px-8 sm:px-8 sm:py-8">
            <button
              type="button"
              onClick={() => setActiveGroupId("all")}
              aria-pressed={activeGroupId === "all"}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${activeGroupId === "all" ? "border-orange-300/55 bg-orange-300/20 text-orange-100 shadow-[0_0_20px_rgba(251,146,60,0.15)]" : "border-white/[0.12] bg-white/[0.04] text-gray-300 hover:border-white/25 hover:bg-white/[0.08]"}`}
            >
              Todos <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold">{codes.length}</span>
            </button>
            {groups.map((group) => {
              const count = (codesByGroupId.get(group.id) ?? []).length;
              const isActive = activeGroupId === group.id;
              return <button key={group.id} type="button" onClick={() => setActiveGroupId(group.id)} aria-pressed={isActive} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${isActive ? "border-orange-300/55 bg-orange-300/20 text-orange-100 shadow-[0_0_20px_rgba(251,146,60,0.15)]" : "border-white/[0.12] bg-white/[0.04] text-gray-300 hover:border-white/25 hover:bg-white/[0.08]"}`}>
                {group.name} <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold">{count}</span>
              </button>;
            })}
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

            ) : visibleGroups.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-10 text-center">
                <p className="text-gray-400">
                  No encontramos códigos con “{codeSearch.trim()}”.
                </p>
              </div>

            ) : (

              <div className="min-w-0 space-y-3">

                {visibleGroups.map((group) => {
                  const groupCodes = [
                    ...(codesByGroupId.get(group.id) ?? []),
                  ].sort((firstCode, secondCode) =>
                    codeNumberOrder.compare(firstCode.code, secondCode.code)
                  );
                  const matchingCodes = normalizedCodeSearch
                    ? groupCodes.filter((code) =>
                        code.code.toUpperCase().includes(normalizedCodeSearch)
                      )
                    : groupCodes;
                  const hasCodes = groupCodes.length > 0;
                  const isExpanded = expandedGroupIds.has(group.id) || Boolean(normalizedCodeSearch);
                  // Se mantienen montados mientras el grupo se cierra para que la altura
                  // pueda interpolarse; desmontarlos cortaba la animación visualmente.
                  const displayedCodes = editingCodeId
                    ? [...matchingCodes].sort((firstCode, secondCode) => {
                        if (firstCode.id === editingCodeId) return -1;
                        if (secondCode.id === editingCodeId) return 1;
                        return 0;
                      })
                    : matchingCodes;

                  return (

                  <div
                    id={`group-${group.id}`}
                    key={group.id}
                    className={`relative min-w-0 overflow-visible rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-black/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition duration-500 hover:border-orange-300/30 sm:p-4 ${groupMenuOpenId === group.id ? "z-30" : "z-0"}`}
                  >

                    <div
                      className="relative flex min-h-16 cursor-pointer flex-col items-stretch gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-2 sm:py-2"
                      onClick={() => hasCodes && toggleGroupCodes(group.id)}
                      onKeyDown={(event) => {
                        if (hasCodes && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          toggleGroupCodes(group.id);
                        }
                      }}
                      role="button"
                      tabIndex={hasCodes ? 0 : -1}
                      aria-expanded={isExpanded}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="min-w-0">
                          <span className="block break-words font-semibold text-white">{group.name}</span>

                        {group.description && (
                          <span className="mt-0.5 block break-words text-sm text-gray-500">
                            {group.description}
                          </span>
                        )}
                        </span>
                      </div>

                      <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                        <div
                          className="mr-auto inline-flex rounded-xl border border-white/[0.12] bg-black/25 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:mr-0"
                          role="group"
                          aria-label="Vista de códigos"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setCodeView("grid")}
                            aria-pressed={codeView === "grid"}
                            title="Ver en cuadrados"
                            className={`flex h-9 w-9 items-center justify-center rounded-lg transition duration-300 ${codeView === "grid" ? "bg-orange-300 text-black shadow-[0_0_18px_rgba(251,146,60,0.35)]" : "text-gray-400 hover:bg-white/[0.08] hover:text-white"}`}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg><span className="sr-only">Ver en cuadrados</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCodeView("list")}
                            aria-pressed={codeView === "list"}
                            title="Ver en lista"
                            className={`flex h-9 w-9 items-center justify-center rounded-lg transition duration-300 ${codeView === "list" ? "bg-orange-300 text-black shadow-[0_0_18px_rgba(251,146,60,0.35)]" : "text-gray-400 hover:bg-white/[0.08] hover:text-white"}`}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" strokeLinecap="round" /></svg><span className="sr-only">Ver en lista</span>
                          </button>
                        </div>

                        {hasCodes && (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.16] bg-gradient-to-br from-white/[0.18] via-white/[0.08] to-white/[0.02] text-gray-200 shadow-[0_10px_26px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-xl transition duration-300">
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
                          </span>
                        )}

                        {(role === "admin" || groups.length > 1) && (
                          <div ref={groupMenuOpenId === group.id ? groupMenuRef : null} className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setGroupMenuOpenId((current) => current === group.id ? null : group.id);
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-lg leading-none text-gray-300 transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                            aria-label={`Acciones para ${group.name}`}
                            aria-expanded={groupMenuOpenId === group.id}
                          >
                            <span aria-hidden="true">•••</span>
                          </button>
                          {groupMenuOpenId === group.id && (
                            <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-44 overflow-hidden rounded-xl border border-white/[0.14] bg-[#211f1c]/95 p-1 shadow-2xl backdrop-blur-xl">
                              {role === "admin" && (
                                <a href={`/api/admin/code-groups/${group.id}/qr-package`} className="flex min-h-10 items-center rounded-lg px-3 text-sm text-gray-100 transition hover:bg-white/[0.1]" onClick={() => setGroupMenuOpenId(null)}>
                                  Descargar QR
                                </a>
                              )}
                              {groups.length > 1 && (
                                <button type="button" onClick={() => {
                                  setGroupMenuOpenId(null);
                                  setDeletingGroupId(group.id);
                                  setReplacementGroupId("");
                                  setError("");
                                }} className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-red-200 transition hover:bg-red-400/10">
                                  Eliminar grupo
                                </button>
                              )}
                            </div>
                          )}
                          </div>
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

                    <div className={`grid min-w-0 transition-[grid-template-rows,opacity,margin,clip-path] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      isExpanded ? "mt-3 grid-rows-[1fr] [clip-path:inset(-2rem)] opacity-100" : "grid-rows-[0fr] [clip-path:inset(0)] opacity-0"
                    }`}>
                      <div className="min-h-0 min-w-0">
                        <div className={`min-w-0 p-2 ${codeView === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] sm:gap-3" : "grid grid-cols-1 gap-3"}`}>

                      {displayedCodes.map((code) => (

                          <div
                            id={`code-${code.id}`}
                            key={code.id}
                            data-expanded={editingCodeId === code.id && closingCodeId !== code.id}
                            data-editor-mounted={editingCodeId === code.id}
                            data-closing={closingCodeId === code.id}
                            className={`tapixxo-code-tile group relative min-w-0 w-full rounded-xl border bg-gradient-to-br p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${
                              editingCodeId === code.id
                                ? "col-span-full cursor-default border-orange-300/50 from-orange-300/[0.14] via-white/[0.07] to-black/40 p-4 shadow-[0_16px_35px_rgba(249,115,22,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] sm:p-5"
                                : codeView === "grid"
                                  ? "min-h-[5.25rem] cursor-pointer border-white/[0.12] from-white/[0.12] to-black/30 hover:-translate-y-1 hover:border-orange-300/60 hover:from-orange-300/[0.18] hover:shadow-[0_14px_30px_rgba(249,115,22,0.14)] sm:min-h-24"
                                  : "cursor-pointer border-white/[0.1] from-white/[0.08] to-black/30 hover:border-orange-300/50 sm:flex sm:items-center sm:justify-between"
                            }`}
                            onClick={(event) => {
                              if (editingCodeId === code.id) {
                                if (closingCodeId === code.id) return;
                                if ((event.target as HTMLElement).closest("button, a, input, label, select, textarea")) return;
                                closeCodeEditor(code.id);
                                return;
                              }
                              openCodeEditor(code);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (editingCodeId !== code.id && (event.key === "Enter" || event.key === " ")) {
                                event.preventDefault();
                                openCodeEditor(code);
                              } else if (editingCodeId === code.id && event.target === event.currentTarget && (event.key === "Enter" || event.key === " " || event.key === "Escape")) {
                                event.preventDefault();
                                closeCodeEditor(code.id);
                              }
                            }}
                          >

                            <div className={editingCodeId === code.id ? "flex w-full flex-col items-center text-center" : "flex h-full w-full flex-col justify-center"}>

                              <div className="relative flex w-full items-center justify-center gap-3">

                                <span className="font-mono text-sm font-semibold tracking-tight">
                                  {code.code}
                                </span>

                                <span
                                  className={`absolute right-0 flex h-2.5 w-2.5 shrink-0 rounded-full ${
                                    code.active
                                      ? "bg-orange-300 shadow-[0_0_10px_rgba(253,186,116,0.9),0_0_20px_rgba(249,115,22,0.45)]"
                                      : "bg-gray-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                                  }`}
                                  title={code.active ? "Activo" : "Inactivo"}
                                >
                                  <span className="sr-only">{code.active ? "Activo" : "Inactivo"}</span>
                                </span>

                              </div>

                              {editingCodeId === code.id && <p className="mt-1 text-center text-xs text-gray-500">
                                /t/{code.code}
                              </p>}

                              {editingCodeId === code.id && scheduledCodeIds.has(code.id) && (
                                <button
                                  type="button"
                                  onClick={() => setScheduleEditorCodeId(code.id)}
                                  className="mx-auto mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-300/35 bg-gradient-to-r from-orange-400/[0.15] to-white/[0.05] px-3 text-xs font-semibold text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:border-orange-200/65 hover:from-orange-400/[0.24] hover:shadow-[0_10px_24px_rgba(249,115,22,0.16)]"
                                  title="Editar o quitar programación por horario"
                                >
                                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
                                    <circle cx="12" cy="12" r="7.5" />
                                    <path d="M12 8v4.5l3 1.8" />
                                  </svg>
                                  Horario activo
                                </button>
                              )}

                              {editingCodeId === code.id && <p className="mt-2 text-center text-sm text-gray-400">
                                {scanCountsAvailable
                                  ? `${scanCounts[code.id] ?? 0} ${
                                      scanCounts[code.id] === 1
                                        ? "escaneo"
                                        : "escaneos"
                                    }`
                                  : "Escaneos no disponibles"}
                              </p>}

                              {editingCodeId === code.id && code.destination_url && (
                                <p className="mx-auto mt-1 max-w-xl truncate text-center text-sm text-gray-400">
                                  {
                                    code.destination_url
                                  }
                                </p>
                              )}

                            </div>

                            {/* EDITOR */}

                            {editingCodeId === code.id && <div
                              className={`mx-auto mt-4 grid w-full max-w-md gap-2 ${
                                role === "admin" ? "grid-cols-2" : "grid-cols-3"
                              }`}
                            >

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

                            </div>}

                            {/* FORMULARIO EDICIÓN */}

                            {editingCodeId ===
                              code.id && (

                              <form
                                onSubmit={
                                  updateCode
                                }
                                className="mx-auto mt-4 w-full max-w-4xl rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"
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
                      </div>
                    </div>

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

      {showCompanyDeletion && role === "admin" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <form
            onSubmit={deleteCurrentCompany}
            className="w-full max-w-md rounded-2xl border border-red-400/30 bg-[#15120f] p-6 shadow-2xl"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-red-300">Acción irreversible</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Eliminar {company.name}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Se eliminarán la empresa, sus grupos, códigos, escaneos y cuentas de acceso. Las órdenes conservarán su registro general.
            </p>
            <label className="mt-5 block text-sm text-gray-300">
              Contraseña de administrador
              <input
                type="password"
                value={companyDeletePassword}
                onChange={(event) => setCompanyDeletePassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={deletingCompany}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-red-400/60 disabled:opacity-50"
              />
            </label>
            {companyDeleteError && (
              <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-sm text-red-200">
                {companyDeleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingCompany}
                onClick={() => {
                  setShowCompanyDeletion(false);
                  setCompanyDeletePassword("");
                  setCompanyDeleteError("");
                }}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deletingCompany || !companyDeletePassword}
                className="rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingCompany ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </form>
        </div>
      )}

    </main>
  );
}
