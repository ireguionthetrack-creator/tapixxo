import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicDigitalMenuBySlug } from "@/lib/digital-menu/public-data";
import { TexasMenu } from "@/lib/digital-menu/presentations/texas/texas-menu";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/menu/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== "texasrestobar") return {};
  return {
    title: "Texas Resto Bar | Menú Digital",
    description: "Menú digital de Texas Resto Bar",
    icons: {
      icon: [{ url: "/menu/texasrestobar/icon.png", type: "image/png" }],
    },
  };
}

export default async function PublicMenuPage({ params, searchParams }: PageProps<"/menu/[slug]">) {
  const { slug } = await params;
  const { plate } = await searchParams;
  const menu = await getPublicDigitalMenuBySlug(slug);
  if (!menu || slug !== "texasrestobar") notFound();
  const plateCode = typeof plate === "string" && /^[A-Za-z]+[1-9]\d*$/.test(plate) ? plate.toUpperCase() : undefined;
  return <TexasMenu menu={menu} plateCode={plateCode} />;
}
