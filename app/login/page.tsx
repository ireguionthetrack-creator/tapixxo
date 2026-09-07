"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";
import { LiquidLoader } from "@/app/components/liquid-loader";

function checkoutReturnPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) return null;

  try {
    const target = new URL(requested, window.location.origin);
    if (target.origin !== window.location.origin || target.pathname !== "/store/checkout") {
      return null;
    }

    const allowedKeys = new Set(["product_key", "model_key", "quantity"]);
    if ([...target.searchParams.keys()].some((key) => !allowedKeys.has(key))) {
      return null;
    }

    return `${target.pathname}${target.search}`;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  function redirectForProfile(profile: { role: string; company_id: string | null }) {
    if (profile.role === "admin") {
      router.replace("/dashboard");
      router.refresh();
      return true;
    }

    if (profile.role === "company" && profile.company_id) {
      router.replace(`/companies/${profile.company_id}`);
      router.refresh();
      return true;
    }

    return false;
  }

  useEffect(() => {
    async function redirectExistingSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCheckingSession(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && redirectForProfile(profile)) return;

      await supabase.auth.signOut();
      setCheckingSession(false);
    }

    void redirectExistingSession();
    // The login redirect is intentionally evaluated only when this page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError || !data.user) {
      setError(
        "Correo o contraseña incorrectos."
      );
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", data.user.id)
        .single();

    if (profileError) {
      console.error(
        "ERROR AL LEER PROFILE:",
        profileError
      );

      setError(
        `Error al leer el perfil: ${profileError.message}`
      );

      setLoading(false);
      return;
    }

    if (!profile) {
      setError(
        "Este usuario no tiene un perfil configurado."
      );

      setLoading(false);
      return;
    }

    const returnPath = checkoutReturnPath();

    if (returnPath) {
      router.push(returnPath);
      router.refresh();
      return;
    }

    if (redirectForProfile(profile)) return;

    await supabase.auth.signOut();

    setError(
      "Esta cuenta no tiene una empresa asignada correctamente."
    );

    setLoading(false);
  }

  if (checkingSession) {
    return (
      <main className="tapixxo-shell flex min-h-screen items-center justify-center">
        <LiquidLoader />
      </main>
    );
  }

  return (
    <main className="tapixxo-shell tapixxo-grid flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <div className="tapixxo-enter w-full max-w-md">

        <div className="mb-8 text-center">
          <TapixxoBrand className="mb-5" priority />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">Espacio de trabajo</p>
          <p className="mt-2 text-sm text-gray-400">
            Panel de administración
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="tapixxo-panel space-y-5 rounded-3xl p-6 sm:p-8"
        >
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Correo electrónico
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50"
              placeholder="admin@tapixxo.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-400 px-4 py-3 font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_28px_rgba(255,122,26,0.28)] disabled:opacity-50"
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
