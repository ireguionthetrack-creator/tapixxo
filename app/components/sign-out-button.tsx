"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();

    try {
      // Cierra únicamente esta sesión y evita una espera de red al revocar
      // sesiones de otros dispositivos. La recarga resetea el estado local
      // incluso cuando el destino es la misma página (como "/").
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;

      window.location.replace(redirectTo);
    } catch (error) {
      console.error("No se pudo cerrar la sesión", {
        message: error instanceof Error ? error.message : "Error desconocido",
      });
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="rounded-xl border border-white/15 bg-white/[0.045] px-4 py-2.5 text-sm font-medium text-gray-300 shadow-[inset_0_1px_rgba(255,255,255,0.1)] transition hover:border-orange-400/45 hover:bg-orange-400/10 hover:text-white disabled:cursor-wait disabled:opacity-50"
    >
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
