"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/app/components/sign-out-button";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";
import { createClient } from "@/lib/supabase/client";

export function StoreHeader() {
  const [visibleName, setVisibleName] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setVisibleName(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", profile.company_id)
          .maybeSingle();
        if (company?.name) {
          setVisibleName(company.name);
          return;
        }
      }

      const metadataName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name.trim()
          : "";
      setVisibleName(metadataName || user.email || "Mi cuenta");
    }

    void loadSession();
  }, []);

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Tapixxo">
          <TapixxoBrand priority />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navegación principal">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
          >
            Inicio
          </Link>
          {visibleName ? (
            <>
              <span className="hidden max-w-44 truncate px-2 text-sm font-medium text-gray-200 sm:inline">
                {visibleName}
              </span>
              <SignOutButton redirectTo="/" />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5 sm:px-5 sm:py-2.5"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
