"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LiquidLoader } from "@/app/components/liquid-loader";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      // 1. Obtener usuario autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      // 2. Obtener su perfil
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        setError(
          profileError?.message ||
            "No se encontró el perfil de este usuario."
        );
        setLoading(false);
        return;
      }

      // 3. Si es una empresa, ir directamente a SU empresa
      if (profile.role === "company") {
        if (!profile.company_id) {
          setError(
            "Esta cuenta no tiene una empresa asignada."
          );
          setLoading(false);
          return;
        }

        router.replace(
          `/companies/${profile.company_id}`
        );

        return;
      }

      // 4. Si es admin, mostrar dashboard
      if (profile.role === "admin") {
         router.replace("/companies");
         return;
}

      // 5. Rol desconocido
      setError("No tienes un rol válido.");
      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="tapixxo-shell flex min-h-screen items-center justify-center">
        <LiquidLoader />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-900 bg-red-950/40 p-6">
          <h1 className="text-xl font-semibold">
            No se puede acceder
          </h1>

          <p className="mt-2 text-sm text-red-300">
            {error}
          </p>
        </div>
      </main>
    );
  }

  // Dashboard exclusivo del administrador
  return (
    <main className="min-h-screen bg-gray-950 text-white">

      <header className="border-b border-gray-800 px-8 py-5">
        <h1 className="text-2xl font-bold">
          Tapixxo
        </h1>

        <p className="text-sm text-gray-400">
          Panel de administración
        </p>
      </header>

      <div className="grid gap-6 p-8 md:grid-cols-3">

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">
            Empresas
          </p>

          <p className="mt-2 text-3xl font-bold">
            0
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">
            Códigos
          </p>

          <p className="mt-2 text-3xl font-bold">
            0
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">
            Visitas
          </p>

          <p className="mt-2 text-3xl font-bold">
            0
          </p>
        </div>

      </div>

      <section className="px-8 pb-8">

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">

          <h2 className="text-xl font-semibold">
            Empresas
          </h2>

          <p className="mt-2 text-gray-400">
            Aquí administraremos las empresas,
            grupos y códigos de Tapixxo.
          </p>

        </div>

      </section>

    </main>
  );
}
