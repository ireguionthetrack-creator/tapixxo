"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type ChangePasswordControlProps = {
  className?: string;
};

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!domain) return "••••";
  const visiblePart = localPart.slice(0, Math.min(2, localPart.length));
  return `${visiblePart || "•"}••••@${domain}`;
}

export function ChangePasswordControl({ className = "" }: ChangePasswordControlProps) {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setCheckingUser(false);
    }

    void loadUser();
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (open && !sent) {
      cancelButtonRef.current?.focus();
    }
  }, [open, sent]);

  async function sendRecoveryEmail() {
    setSending(true);
    setError("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authenticatedEmail = userData.user?.email;

      if (userError || !authenticatedEmail) {
        setError("Tu sesión ya no está activa. Inicia sesión nuevamente para continuar.");
        return;
      }

      const redirectTo = new URL("/auth/update-password", window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        authenticatedEmail,
        { redirectTo },
      );

      if (resetError) {
        setError("No pudimos enviar el correo en este momento. Inténtalo de nuevo en unos minutos.");
        return;
      }

      setEmail(authenticatedEmail);
      setSent(true);
    } catch {
      setError("No pudimos enviar el correo en este momento. Inténtalo de nuevo en unos minutos.");
    } finally {
      setSending(false);
    }
  }

  if (checkingUser || !email) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setSent(false);
          setOpen(true);
        }}
        className={`inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-gray-100 transition hover:border-orange-400/45 hover:bg-orange-400/10 ${className}`}
      >
        Cambiar contraseña
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="tapixxo-password-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="tapixxo-password-dialog tapixxo-enter w-full max-w-md rounded-3xl p-5 sm:p-6"
          >
            {sent ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/10 text-xl text-emerald-200">✓</div>
                <h2 id="change-password-title" className="mt-4 text-xl font-semibold text-white">Revisa tu correo</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Hemos enviado un enlace seguro para cambiar tu contraseña a {maskEmail(email)}.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 min-h-11 w-full rounded-xl bg-orange-400 px-4 text-sm font-semibold text-black transition hover:bg-orange-300"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">Seguridad de la cuenta</p>
                <h2 id="change-password-title" className="mt-2 text-xl font-semibold text-white">Verifica tu identidad</h2>
                <p className="mt-3 text-sm leading-6 text-gray-300">
                  Te enviaremos un enlace seguro al correo asociado con tu cuenta para que puedas establecer una nueva contraseña.
                </p>
                <div className="mt-4 rounded-xl border border-white/[0.12] bg-black/25 px-4 py-3 text-sm text-gray-200">
                  {maskEmail(email)}
                </div>
                {error && (
                  <p className="mt-4 rounded-xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </p>
                )}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    ref={cancelButtonRef}
                    disabled={sending}
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void sendRecoveryEmail()}
                    className="min-h-11 rounded-xl bg-orange-400 px-4 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:cursor-wait disabled:opacity-50"
                  >
                    {sending ? "Enviando…" : "Enviar correo de verificación"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
