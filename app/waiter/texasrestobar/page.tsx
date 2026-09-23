import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TexasWaiterPanel } from "@/lib/waiter-panel/texas-waiter-panel";
import { getTexasWaiterPanelAccess } from "@/lib/waiter-panel/texas-access";

export const metadata: Metadata = { title: "Texas Resto Bar | Panel de meseros", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TexasWaiterPage() {
  const access = await getTexasWaiterPanelAccess();
  if (!access) redirect("/login");
  return <TexasWaiterPanel />;
}
