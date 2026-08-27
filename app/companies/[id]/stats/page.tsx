"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { AnalyticsChart } from "@/app/components/analytics-chart";
import { SignOutButton } from "@/app/components/sign-out-button";

type Company = {
  id: string;
  name: string;
};

type Code = {
  id: string;
  code: string;
  group_id: string;
  destination_url: string | null;
  active: boolean;
  created_at: string;
};

type Scan = {
  code_id: string;
  created_at: string;
};

type CodeStats = {
  id: string;
  code: string;
  active: boolean;
  destination_url: string | null;
  scans: number;
  group_name: string;
};

export default function StatsPage() {
  const params = useParams();

  const companyId = params.id as string;

  const supabase = createClient();

  const [company, setCompany] =
    useState<Company | null>(null);

  const [codes, setCodes] =
    useState<Code[]>([]);

  const [groupNames, setGroupNames] =
    useState<Record<string, string>>({});

  const [scans, setScans] =
    useState<Scan[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [period, setPeriod] =
    useState<7 | 30 | "all">(7);

  const [error, setError] =
    useState("");

  const [referenceNow] = useState(() => Date.now());

  async function loadStats() {
    setLoading(true);
    setError("");

    // 1. Cargar empresa
    const companyResult = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single();

    if (companyResult.error) {
      setError(companyResult.error.message);
      setLoading(false);
      return;
    }

    // 2. Buscar los grupos que pertenecen a esta empresa
    const groupsResult = await supabase
      .from("code_groups")
      .select("id, name")
      .eq("company_id", companyId);

    if (groupsResult.error) {
      setError(groupsResult.error.message);
      setLoading(false);
      return;
    }

    const groupIds =
      (groupsResult.data ?? []).map(
        (group) => group.id
      );
    const names: Record<string, string> = {};

for (const group of groupsResult.data ?? []) {
  names[group.id] = group.name;
}

    // 3. Buscar códigos pertenecientes a esos grupos
    let codesData: Code[] = [];

    if (groupIds.length > 0) {
      const codesResult = await supabase
        .from("codes")
        .select(
          "id, code, group_id, destination_url, active, created_at"
        )
        .in("group_id", groupIds)
        .order("created_at", {
          ascending: true,
        });

      if (codesResult.error) {
        setError(codesResult.error.message);
        setLoading(false);
        return;
      }

      codesData = codesResult.data ?? [];
    }

    // 4. Obtener los IDs de los códigos de esta empresa
    const codeIds = codesData.map(
      (code) => code.id
    );

    // 5. Buscar únicamente los escaneos de esos códigos
    let scansData: Scan[] = [];

    if (codeIds.length > 0) {
      const scansResult = await supabase
        .from("code_scans")
        .select("code_id, created_at")
        .in("code_id", codeIds);

      if (scansResult.error) {
        setError(scansResult.error.message);
        setLoading(false);
        return;
      }

      scansData = scansResult.data ?? [];
    }

    setCompany(companyResult.data);
    setCodes(codesData);
    setGroupNames(names);
    setScans(scansData);

    setLoading(false);
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(loadTimer);
    // The company ID is the query identity; helpers intentionally use current state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  if (loading) {
    return (
      <main className="tapixxo-shell flex min-h-screen items-center justify-center p-8 text-white">
        <p className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-400">
          Cargando estadísticas...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="tapixxo-shell min-h-screen p-6 text-white md:p-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href={`/companies/${companyId}`}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Volver a la empresa
          </Link>

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-950/30 p-5 text-red-200">
            {error}
          </div>
        </div>
      </main>
    );
  }

  const totalScans = scans.length;
  const today = new Date();

    const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
    );

    const scansToday = scans.filter(
    (scan) =>
        new Date(scan.created_at) >= startOfToday
    ).length;

    const firstScanTime =
  scans.length > 0
    ? Math.min(
        ...scans.map((scan) =>
          new Date(scan.created_at).getTime()
        )
      )
    : referenceNow;

const totalDays = Math.max(
  1,
  Math.ceil(
    (referenceNow - firstScanTime) /
      (1000 * 60 * 60 * 24)
  ) + 1
);

let chartMode:
  | "day"
  | "week"
  | "month";

if (period === 7 || period === 30) {
  chartMode = "day";
} else if (totalDays <= 31) {
  chartMode = "day";
} else if (totalDays <= 180) {
  chartMode = "week";
} else {
  chartMode = "month";
}

const numberOfDays =
  period === "all"
    ? totalDays
    : period;

const chartStart = new Date();

chartStart.setHours(0, 0, 0, 0);

chartStart.setDate(
  chartStart.getDate() -
    (numberOfDays - 1)
);

type ChartItem = {
  label: string;
  dateLabel: string;
  count: number;
};

let scansByDay: ChartItem[] = [];

if (chartMode === "day") {
  const days = Array.from(
    { length: numberOfDays },
    (_, index) => {
      const date = new Date(chartStart);

      date.setDate(
        date.getDate() + index
      );

      return date;
    }
  );

  scansByDay = days.map((date) => {
    const nextDay = new Date(date);

    nextDay.setDate(
      nextDay.getDate() + 1
    );

    const count = scans.filter((scan) => {
      const scanDate = new Date(
        scan.created_at
      );

      return (
        scanDate >= date &&
        scanDate < nextDay
      );
    }).length;

    return {
      label: date.toLocaleDateString(
        "es-ES",
        {
          day: "2-digit",
          month: "2-digit",
        }
      ),
      dateLabel:
        date.toLocaleDateString(
          "es-ES",
          {
            weekday: "short",
          }
        ),
      count,
    };
  });
}

if (chartMode === "week") {
  const numberOfWeeks = Math.ceil(
    numberOfDays / 7
  );

  scansByDay = Array.from(
    { length: numberOfWeeks },
    (_, index) => {
      const start = new Date(chartStart);

      start.setDate(
        start.getDate() + index * 7
      );

      const end = new Date(start);

      end.setDate(
        end.getDate() + 7
      );

      const count = scans.filter(
        (scan) => {
          const scanDate = new Date(
            scan.created_at
          );

          return (
            scanDate >= start &&
            scanDate < end
          );
        }
      ).length;

      return {
        label:
          start.toLocaleDateString(
            "es-ES",
            {
              day: "2-digit",
              month: "2-digit",
            }
          ),
        dateLabel: "semana",
        count,
      };
    }
  );
}

if (chartMode === "month") {
  const startDate = new Date(
    firstScanTime
  );

  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const now = new Date();

  const months =
    (now.getFullYear() -
      startDate.getFullYear()) *
      12 +
    (now.getMonth() -
      startDate.getMonth()) +
    1;

  scansByDay = Array.from(
    { length: months },
    (_, index) => {
      const start = new Date(
        startDate
      );

      start.setMonth(
        start.getMonth() + index
      );

      const end = new Date(start);

      end.setMonth(
        end.getMonth() + 1
      );

      const count = scans.filter(
        (scan) => {
          const scanDate = new Date(
            scan.created_at
          );

          return (
            scanDate >= start &&
            scanDate < end
          );
        }
      ).length;

      return {
        label:
          start.toLocaleDateString(
            "es-ES",
            {
              month: "short",
              year: "numeric",
            }
          ),
        dateLabel: "",
        count,
      };
    }
  );
}

  const totalCodes = codes.length;

  const activeCodes = codes.filter(
    (code) => code.active
  ).length;

  const codeStats: CodeStats[] = codes
    .map((code) => ({
      id: code.id,
      code: code.code,
      active: code.active,
      destination_url:
        code.destination_url,
      group_name:
        groupNames[code.group_id] ?? "Sin grupo",
      scans: scans.filter(
        (scan) => scan.code_id === code.id
      ).length,
    }))
    .sort((a, b) => b.scans - a.scans);
    const groupStats = Object.entries(groupNames)
  .map(([groupId, groupName]) => {
    const groupCodes = codes.filter(
      (code) => code.group_id === groupId
    );

    const groupScans = scans.filter((scan) =>
      groupCodes.some(
        (code) => code.id === scan.code_id
      )
    ).length;

    return {
      id: groupId,
      name: groupName,
      codes: groupCodes.length,
      scans: groupScans,
    };
  })
  .sort((a, b) => b.scans - a.scans);

  return (
    <main className="tapixxo-shell tapixxo-grid min-h-screen p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}

        <div className="tapixxo-enter mb-8 rounded-2xl border border-white/[0.08] bg-black/25 px-5 py-5 backdrop-blur-sm md:px-7">

          <Link
            href={`/companies/${companyId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-orange-300"
          >
            ← Volver a la empresa
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">
                Analítica de escaneos
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                {company?.name}
              </h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadStats}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium transition hover:border-orange-400/40 hover:bg-orange-400/10"
              >
                Actualizar
              </button>
              <SignOutButton />
            </div>

          </div>

        </div>

        {/* RESUMEN */}

        <div className="grid gap-3 md:grid-cols-4">
            <div className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-1 rounded-2xl p-5">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
                    Escaneos hoy
                </p>

                <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {scansToday}
                </p>
                </div>

          <div className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-1 rounded-2xl p-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              Total de escaneos
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {totalScans}
            </p>
          </div>

          <div className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-2 rounded-2xl p-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              Códigos
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {totalCodes}
            </p>
          </div>

          <div className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-3 rounded-2xl p-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
              Códigos activos
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {activeCodes}
            </p>
          </div>

        </div>

        {/* ESCANEOS DE LOS ÚLTIMOS 7 DÍAS */}

<section className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-2 mt-8 overflow-hidden rounded-2xl">
  <div className="flex flex-col gap-5 border-b border-white/[0.08] p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
    <div>
      <div className="flex items-center gap-2">
        <span className="tapixxo-pulse h-2 w-2 rounded-full bg-orange-400" />
        <h2 className="text-lg font-semibold">Escaneos</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">Actividad registrada durante el periodo seleccionado.</p>
    </div>

    <div className="flex w-fit rounded-xl border border-white/10 bg-black/30 p-1">
      {([7, 30, "all"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setPeriod(value)}
          className={
            period === value
              ? "rounded-lg bg-orange-400 px-3 py-1.5 text-sm font-semibold text-black shadow-[0_0_18px_rgba(255,122,26,0.18)]"
              : "rounded-lg px-3 py-1.5 text-sm text-gray-400 transition hover:text-white"
          }
        >
          {value === "all" ? "Todo" : `${value} días`}
        </button>
      ))}
    </div>
  </div>

  <div className="p-4 sm:p-6">
    <AnalyticsChart data={scansByDay} />
  </div>
</section>
{/* ESCANEOS POR GRUPO */}

<section className="tapixxo-panel tapixxo-enter tapixxo-enter-delay-3 mt-8 overflow-hidden rounded-2xl">

  <div className="border-b border-white/[0.08] p-5 sm:p-6">
    <h2 className="text-lg font-semibold tracking-tight">
      Escaneos por grupo
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      Cantidad de escaneos acumulados por cada grupo.
    </p>
  </div>

  <div className="divide-y divide-white/[0.07]">

    {groupStats.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">
        No hay grupos creados todavía.
      </div>
    ) : (
      groupStats.map((group) => {

        const maxScans = Math.max(
          ...groupStats.map(
            (item) => item.scans
          ),
          1
        );

        const width =
          (group.scans / maxScans) * 100;

        return (
          <div
            key={group.id}
            className="p-5 transition hover:bg-white/[0.02] sm:p-6"
          >

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold">
                  {group.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {group.codes}{" "}
                  {group.codes === 1
                    ? "código"
                    : "códigos"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold">
                  {group.scans}
                </p>

                <p className="text-xs text-gray-500">
                  {group.scans === 1
                    ? "escaneo"
                    : "escaneos"}
                </p>
              </div>

            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">

              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-300 to-orange-500 transition-all duration-700"
                style={{
                  width: `${width}%`,
                }}
              />

            </div>

          </div>
        );
      })
    )}

  </div>

</section>
        {/* ESCANEOS POR CÓDIGO */}

        <section className="tapixxo-panel mt-8 overflow-hidden rounded-2xl">

          <div className="border-b border-white/[0.08] p-5 sm:p-6">

            <h2 className="text-lg font-semibold">
              Escaneos por código
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Ordenados de mayor a menor cantidad de escaneos.
            </p>

          </div>

          <div className="divide-y divide-white/[0.07]">

            {codeStats.length === 0 ? (
              <div className="p-6 text-gray-500">
                No hay códigos creados todavía.
              </div>
            ) : (
              codeStats.map((code) => (
                <div
                  key={code.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between sm:px-6"
                >

                  <div>

                    <div className="flex items-center gap-3">

                      <span className="font-mono font-semibold">
                        {code.code}
                      </span>
                        <p className="text-xs text-gray-500">
                        Grupo: {code.group_name}
                        </p>
                      <span
                        className={
                          code.active
                            ? "rounded-full border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-xs text-orange-300"
                            : "rounded-full bg-white/[0.06] px-2 py-1 text-xs text-gray-500"
                        }
                      >
                        {code.active
                          ? "Activo"
                          : "Inactivo"}
                      </span>

                    </div>

                    <p className="mt-1 text-xs text-gray-600">
                      /t/{code.code}
                    </p>

                  </div>

                  <div className="text-left md:text-right">

                    <p className="text-2xl font-bold">
                      {code.scans}
                    </p>

                    <p className="text-xs text-gray-500">
                      {code.scans === 1
                        ? "escaneo"
                        : "escaneos"}
                    </p>

                  </div>

                </div>
              ))
            )}

          </div>

        </section>

      </div>
    </main>
  );
}
