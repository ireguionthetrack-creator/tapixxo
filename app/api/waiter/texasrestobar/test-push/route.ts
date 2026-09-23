import { NextResponse } from "next/server";
import { getTexasWaiterPanelAccess } from "@/lib/waiter-panel/texas-access";
import { sendTexasWaiterPush } from "@/lib/waiter-panel/web-push";

export const runtime = "nodejs";

export async function POST() {
  const access = await getTexasWaiterPanelAccess();
  if (!access) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const result = await sendTexasWaiterPush({
    companyId: access.companyId,
    requestId: "waiter-push-test",
    tableLabel: "Prueba de alertas",
  });

  if (!result.configured) {
    return NextResponse.json({ error: "Las alertas push no están configuradas en el servidor." }, { status: 503 });
  }
  if (!result.subscriptions) {
    return NextResponse.json({ error: "No hay un dispositivo con alertas activas para Texas." }, { status: 409 });
  }
  if (!result.delivered) {
    return NextResponse.json({ error: "No se pudo entregar la alerta. Revisa que la app tenga permiso de notificaciones." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
