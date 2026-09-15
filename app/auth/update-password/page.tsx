"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";
import { createClient } from "@/lib/supabase/client";

const MINIMUM_PASSWORD_LENGTH = 12;

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= MINIMUM_PASSWORD_LENGTH) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function passwordMessage(score: number) {
  if (score <= 1) return "Débil";
  if (score === 2) return "Aceptable";
  if (score === 3) return "Segura";
  return "Muy segura";
}

function messageForUpdateError() {
  return "No pudimos actualizar la contraseña. El enlace puede haber expirado; solicita uno nuevo.";
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [recoveryReady, setRecoveryReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestingNewLink, setRequestingNewLink] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");
  const [resending, setResending] = useState(false);
  const strength = passwordScore(password);

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoveryReady(true);
      }
    });

    async function resolveRecovery() {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (active) setRecoveryReady(!exchangeError);
        return;
      }

      timeoutId = window.setTimeout(() => {
        if (active) setRecoveryReady((current) => current ?? false);
      }, 3000);
    }

    void resolveRecovery();
    return () => {
      active = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!recoveryReady) {
      setError("Este enlace ya no es válido.");
      return;
    }
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      setError(`Usa al menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Incluye mayúsculas, minúsculas y al menos un número.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(messageForUpdateError());
      setSaving(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
    setSaving(false);
    window.setTimeout(() => router.replace("/login?password=updated"), 1400);
  }

  async function requestNewLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendError("");
    const email = resendEmail.trim();
    if (!email) {
      setResendError("Escribe el correo asociado a tu cuenta.");
      return;
    }

    setResending(true);
    try {
      const redirectTo = new URL("/auth/update-password", window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) {
        setResendError("No pudimos enviar el enlace en este momento. Inténtalo de nuevo más tarde.");
        return;
      }
      setResendSent(true);
    } catch {
      setResendError("No pudimos enviar el enlace en este momento. Inténtalo de nuevo más tarde.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="tapixxo-shell tapixxo-grid flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <div className="tapixxo-enter w-full max-w-md">
        <div className="mb-8 text-center">
          <TapixxoBrand className="mb-5" priority />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300">Seguridad de la cuenta</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Crea una nueva contraseña</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">Elige una contraseña segura para proteger tu cuenta.</p>
        </div>

        <section className="tapixxo-panel rounded-3xl p-6 sm:p-8">
          {recoveryReady === null ? (
            <p className="text-center text-sm text-gray-300">Validando enlace seguro…</p>
          ) : !recoveryReady ? (
            <div className="text-center">
              <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">Este enlace ya no es válido.</p>
              {resendSent ? (
                <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">Si el correo corresponde a una cuenta, recibirás un nuevo enlace seguro.</p>
              ) : requestingNewLink ? (
                <form onSubmit={requestNewLink} className="mt-5 space-y-4 text-left">
                  <label className="block text-sm text-gray-300">
                    Correo electrónico
                    <input type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} autoComplete="email" required disabled={resending} className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50" />
                  </label>
                  {resendError && <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{resendError}</p>}
                  <button type="submit" disabled={resending} className="min-h-11 w-full rounded-xl bg-orange-400 px-4 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:opacity-50">{resending ? "Enviando…" : "Enviar nuevo enlace"}</button>
                </form>
              ) : (
                <button type="button" onClick={() => setRequestingNewLink(true)} className="mt-5 min-h-11 w-full rounded-xl border border-orange-300/40 bg-orange-400/[0.08] px-4 text-sm font-semibold text-orange-100 transition hover:bg-orange-400/[0.16]">Solicitar un nuevo enlace</button>
              )}
              <Link href="/login" className="mt-4 inline-flex text-sm text-gray-400 transition hover:text-white">Volver al inicio de sesión</Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/10 text-xl text-emerald-200">✓</div>
              <p className="mt-4 text-sm text-emerald-100">Tu contraseña se actualizó correctamente. Te llevaremos al inicio de sesión.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <label className="block text-sm text-gray-300">
                Nueva contraseña
                <span className="relative mt-2 block">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={MINIMUM_PASSWORD_LENGTH} autoComplete="new-password" required disabled={saving} className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 pr-16 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-1 min-w-12 rounded-lg text-xs font-medium text-gray-400 transition hover:bg-white/[0.08] hover:text-white" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? "Ocultar" : "Ver"}</button>
                </span>
              </label>
              <div>
                <div className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((level) => <span key={level} className={`h-1 flex-1 rounded-full ${strength >= level ? "bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.7)]" : "bg-white/[0.1]"}`} />)}
                </div>
                <p className="mt-2 text-xs text-gray-400">Seguridad: {password ? passwordMessage(strength) : "pendiente"}. Usa 12 caracteres, mayúsculas, minúsculas y números.</p>
              </div>
              <label className="block text-sm text-gray-300">
                Confirmar contraseña
                <span className="relative mt-2 block">
                  <input type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={MINIMUM_PASSWORD_LENGTH} autoComplete="new-password" required disabled={saving} className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 pr-16 text-white outline-none transition focus:border-orange-400/60 disabled:opacity-50" />
                  <button type="button" onClick={() => setShowConfirmation((visible) => !visible)} className="absolute inset-y-0 right-1 min-w-12 rounded-lg text-xs font-medium text-gray-400 transition hover:bg-white/[0.08] hover:text-white" aria-label={showConfirmation ? "Ocultar contraseña" : "Mostrar contraseña"}>{showConfirmation ? "Ocultar" : "Ver"}</button>
                </span>
              </label>
              {confirmation && confirmation !== password && <p className="-mt-2 text-xs text-red-200">Las contraseñas no coinciden.</p>}
              {error && <p className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
              <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-orange-400 px-4 font-semibold text-black transition hover:bg-orange-300 disabled:cursor-wait disabled:opacity-50">{saving ? "Actualizando…" : "Actualizar contraseña"}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
