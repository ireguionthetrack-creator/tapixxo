import { DigitalMenuEditor } from "./digital-menu-editor-next";
import { redirect } from "next/navigation";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";

export default async function DigitalMenuPage({ params }: PageProps<"/companies/[id]/digital-menu">) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) redirect(`/companies/${id}`);
  return <DigitalMenuEditor companyId={id} />;
}
