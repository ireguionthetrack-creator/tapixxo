import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type SocialProofCompany = {
  id: string;
  name: string;
  profile_image_path: string | null;
};

export type LandingData = {
  companies: SocialProofCompany[];
  companyCount: number;
  scanCount: number;
};

/**
 * The public landing does not need a new database round-trip for every visit.
 * Keeping this short-lived cache also keeps the page responsive while Supabase
 * is briefly slow or unavailable.
 */
export const getLandingData = unstable_cache(
  async (): Promise<LandingData> => {
    try {
      const supabase = createAdminClient();
      const [companies, scans] = await Promise.all([
        supabase
          .from("companies")
          .select("id, name, profile_image_path", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("code_scans").select("id", { count: "exact", head: true }),
      ]);

      if (companies.error?.code === "42703") {
        const fallback = await supabase
          .from("companies")
          .select("id, name", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(5);

        return {
          companies: (fallback.data ?? []).map((company) => ({
            ...company,
            profile_image_path: null,
          })),
          companyCount: fallback.error ? 0 : fallback.count ?? 0,
          scanCount: scans.error ? 0 : scans.count ?? 0,
        };
      }

      return {
        companies: companies.error ? [] : (companies.data ?? []),
        companyCount: companies.error ? 0 : companies.count ?? 0,
        scanCount: scans.error ? 0 : scans.count ?? 0,
      };
    } catch {
      // The landing remains available while the company service is unavailable.
      return { companies: [], companyCount: 0, scanCount: 0 };
    }
  },
  ["landing-data"],
  { revalidate: 300, tags: ["landing-data"] },
);
