"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function GuestAccountForm({
  reference,
  email,
  initialCompanyName,
}: {
  reference: string;
  email: string;
  initialCompanyName: string | null;
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialCompanyName ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoginUrl("");
    if (password !== passwordConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/store/guest-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          company_name: companyName,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "No se pudo crear la cuenta.");
        setLoginUrl(result.login_url ?? "");
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });
      if (signInError) {
        setError("Tu cuenta fue creada. Inicia sesión con el correo y la contraseña que acabas de elegir.");
        setLoginUrl("/login");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4 border-t border-white/10 pt-7 text-left">
      <h2 className="text-lg font-semibold text-white">Crea tu cuenta</h2>
      <label className="block text-sm text-gray-300">
        Correo
        <input value={email} disabled className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-gray-400" />
      </label>
      <label className="block text-sm text-gray-300">
        Nombre de empresa
        <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required maxLength={160} disabled={submitting} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400/60" />
      </label>
      <label className="block text-sm text-gray-300">
        Contraseña
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" disabled={submitting} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400/60" />
      </label>
      <label className="block text-sm text-gray-300">
        Confirmar contraseña
        <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required minLength={8} autoComplete="new-password" disabled={submitting} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400/60" />
      </label>
      <p className="text-xs leading-5 text-gray-500">Al crear tu cuenta confirmas los <Link href="/terminos" className="text-orange-200 underline">Términos y Condiciones</Link> aceptados durante tu compra.</p>
      {error && <p className="rounded-xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}{loginUrl && <Link href={loginUrl} className="mt-2 block font-medium text-orange-200 underline">Iniciar sesión</Link>}</p>}
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black hover:bg-orange-300 disabled:cursor-wait disabled:bg-white/10 disabled:text-gray-500">{submitting ? "Creando cuenta..." : "Crear mi cuenta"}</button>
    </form>
  );
}
