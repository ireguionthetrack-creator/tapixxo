export const SHIPPING_CLASSIFICATIONS = [
  "cartagena",
  "colombia",
  "international",
] as const;

export type ShippingClassification =
  (typeof SHIPPING_CLASSIFICATIONS)[number];

// Configura tarifas reales aquí. Mientras una tarifa sea null, el servidor
// rechaza la creación del pedido para evitar cobrar un valor inventado.
export const shippingRatesCop: Record<ShippingClassification, number | null> = {
  cartagena: 0,
  colombia: null,
  international: null,
};

export const shippingOptions: Array<{
  id: ShippingClassification;
  name: string;
  unavailableLabel?: string;
  disabled?: boolean;
}> = [
  { id: "cartagena", name: "Cartagena" },
  {
    id: "colombia",
    name: "Resto de Colombia",
    unavailableLabel: "Envío nacional próximamente",
  },
  {
    id: "international",
    name: "Internacional",
    unavailableLabel: "Envío internacional no disponible por ahora",
    disabled: true,
  },
];

export function isShippingClassification(
  value: unknown
): value is ShippingClassification {
  return (
    typeof value === "string" &&
    SHIPPING_CLASSIFICATIONS.includes(value as ShippingClassification)
  );
}

export function formatCop(value: number | null) {
  if (value === null) return "Por definir";

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatShippingCop(value: number | null) {
  if (value === null) return "Próximamente";
  if (value === 0) return "Envío gratis";
  return formatCop(value);
}
