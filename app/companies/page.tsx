"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/app/components/sign-out-button";
import { CompanyAvatar } from "@/app/components/company-avatar";
import { TapixxoMark } from "@/app/components/tapixxo-brand";

type Company = {
  id: string;
  name: string;
  created_at: string;
  profile_image_path: string | null;
};

export default function CompaniesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [companies, setCompanies] = useState<Company[]>(
    []
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [companyToDelete, setCompanyToDelete] =
    useState<Company | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return false;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      router.replace("/dashboard");
      return false;
    }

    return true;
  }

  async function loadCompanies() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("companies")
      .select("id, name, created_at, profile_image_path")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      if (error.code === "42703") {
        const { data: fallbackCompanies, error: fallbackError } =
          await supabase
            .from("companies")
            .select("id, name, created_at")
            .order("created_at", {
              ascending: false,
            });

        if (!fallbackError) {
          setCompanies(
            (fallbackCompanies ?? []).map((company) => ({
              ...company,
              profile_image_path: null,
            }))
          );
          setLoading(false);
          return;
        }
      }

      setError(error.message);
    } else {
      setCompanies(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const isAdmin = await checkAdmin();

      if (!mounted) return;

      if (!isAdmin) {
        return;
      }

      setCheckingAccess(false);

      await loadCompanies();
    }

    init();

    return () => {
      mounted = false;
    };
    // Access is checked once on mount; both helpers use the active auth client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCompany(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const companyName = name.trim();
    const companyEmail = email.trim();
    const companyPassword = password;

    if (
      !companyName ||
      !companyEmail ||
      !companyPassword
    ) {
      setError(
        "Completa el nombre, email y contraseña."
      );
      return;
    }

    if (companyPassword.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/companies",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: companyName,
            email: companyEmail,
            password: companyPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "No se pudo crear la empresa."
        );
        return;
      }

      setName("");
      setEmail("");
      setPassword("");

      setSuccess(
        `Empresa "${companyName}" creada correctamente.`
      );

      await loadCompanies();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Error de conexión."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!companyToDelete || !adminPassword) {
      setError("Introduce tu contraseña de administrador.");
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/companies/${companyToDelete.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: adminPassword }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "No se pudo eliminar la empresa.");
        return;
      }

      setSuccess(
        `Empresa "${companyToDelete.name}" eliminada correctamente.`
      );
      setCompanyToDelete(null);
      setAdminPassword("");
      await loadCompanies();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setDeleting(false);
    }
  }

  /*
   * Mientras comprobamos si el usuario es administrador,
   * no mostramos el contenido administrativo.
   */
  if (checkingAccess) {
    return (
      <main className="tapixxo-shell flex min-h-screen items-center justify-center text-white">
        <p className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-400">
          Verificando acceso...
        </p>
      </main>
    );
  }

  return (
    <main className="tapixxo-shell tapixxo-grid min-h-screen text-white">
      <header className="border-b border-white/[0.08] bg-black/20 px-5 py-5 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <TapixxoMark />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">Tapixxo / Administración</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Empresas</h1>
              <p className="mt-1 text-sm text-gray-500">Gestiona los clientes y sus accesos.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-sm text-gray-400 sm:flex">
              <span className="tapixxo-pulse h-2 w-2 rounded-full bg-orange-400" />
              Sistema activo
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">

        {/* CREAR EMPRESA */}

        <section className="tapixxo-panel tapixxo-enter rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange-300">Nuevo acceso</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Nueva empresa
          </h2>

              <p className="mt-1 text-sm text-gray-500">
            Crea la empresa y su cuenta de acceso al
            mismo tiempo.
          </p>
            </div>
            <span className="rounded-xl border border-orange-400/20 bg-orange-400/10 px-3 py-2 text-xs font-medium text-orange-200">Admin</span>
          </div>

          <form
            onSubmit={createCompany}
            className="mt-5 space-y-4"
          >
            {/* NOMBRE */}

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Nombre de la empresa
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ej. Restaurante Texas"
                disabled={saving}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Email de acceso
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="empresa@email.com"
                disabled={saving}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50"
              />
            </div>

            {/* CONTRASEÑA */}

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Contraseña
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Mínimo 8 caracteres"
                disabled={saving}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-orange-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_24px_rgba(255,122,26,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creando empresa..."
                : "Crear empresa y cuenta"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-lg bg-green-950 px-4 py-3 text-sm text-green-300">
              {success}
            </p>
          )}
        </section>

        {/* EMPRESAS */}

        <section className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-1 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange-300">Directorio</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Empresas registradas
            </h2>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400">
              {companies.length} empresa(s)
            </span>
          </div>

          {loading ? (
            <p className="mt-6 text-gray-400">
              Cargando...
            </p>
          ) : companies.length === 0 ? (
            <p className="mt-6 text-gray-400">
              Todavía no hay empresas registradas.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/25 px-5 py-4 transition hover:border-orange-400/30 hover:bg-orange-400/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CompanyAvatar
                      name={company.name}
                      imagePath={company.profile_image_path}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium tracking-tight">
                        {company.name}
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {company.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/companies/${company.id}`}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium transition hover:border-orange-400/40 hover:bg-orange-400/10"
                    >
                      Abrir
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setCompanyToDelete(company);
                        setAdminPassword("");
                        setError("");
                        setSuccess("");
                      }}
                      className="rounded-xl border border-red-400/30 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400/60 hover:bg-red-400/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
          <form
            onSubmit={deleteCompany}
            className="w-full max-w-md rounded-2xl border border-red-400/30 bg-[#15120f] p-6 shadow-2xl"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-red-300">
              Acción irreversible
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Eliminar {companyToDelete.name}
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Se eliminarán la empresa, sus grupos, códigos, escaneos y cuentas de acceso. Confirma con tu contraseña de administrador.
            </p>

            <label className="mt-5 block text-sm text-gray-300">
              Contraseña de administrador
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                disabled={deleting}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-red-400/60 disabled:opacity-50"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setCompanyToDelete(null);
                  setAdminPassword("");
                }}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deleting || !adminPassword}
                className="rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
