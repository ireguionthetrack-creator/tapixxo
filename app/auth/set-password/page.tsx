"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";
import { createClient } from "@/lib/supabase/client";

const MINIMUM_PASSWORD_LENGTH = 12;

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function resolveRecoverySession() {
      const { data } = await supabase.auth.getSession();
      if (active) setIsValidSession(Boolean(data.session));
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setIsValidSession(true);
    });

    void resolveRecoverySession();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isValidSession) {
      setError("Este enlace no es válido o ya expiró.");
      return;
    }
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("No se pudo actualizar la contraseña. Solicita un nuevo acceso cuando esté disponible.");
      setSaving(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
    setSaving(false);
    window.setTimeout(() => router.replace("/login?password=created"), 1200);
  }

  return (
    <main className="tapixxo-shell tapixxo-grid flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <div className="tapixxo-enter w-full max-w-md">
        <div className="mb-8 text-center">
          <TapixxoBrand className="mb-5" priority />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">Activa tu acceso</p>
          <p className="mt-2 text-sm text-gray-400">Crea una contraseña para entrar a tu panel.</p>
        </div>

        <section className="tapixxo-panel rounded-3xl p-6 sm:p-8">
          {isValidSession === null ? (
            <p className="text-sm text-gray-300">Validando enlace seguro…</p>
          ) : !isValidSession ? (
            <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">Este enlace no es válido o ya expiró. Solicita un nuevo acceso cuando esta opción esté disponible.</p>
          ) : success ? (
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">Tu contraseña fue creada correctamente. Te llevaremos al inicio de sesión.</p>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <label className="block text-sm text-gray-300">Nueva contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={MINIMUM_PASSWORD_LENGTH} autoComplete="new-password" required disabled={saving} className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50" /></label>
              <label className="block text-sm text-gray-300">Confirmar contraseña<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={MINIMUM_PASSWORD_LENGTH} autoComplete="new-password" required disabled={saving} className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50" /></label>
              <p className="text-xs leading-5 text-gray-400">Usa al menos {MINIMUM_PASSWORD_LENGTH} caracteres.</p>
              {error && <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
              <button type="submit" disabled={saving} className="w-full rounded-xl bg-orange-400 px-4 py-3 font-semibold text-black transition hover:bg-orange-300 disabled:opacity-50">{saving ? "Guardando…" : "Crear contraseña"}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
