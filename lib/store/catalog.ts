export type StoreModel = {
  id: string;
  name: string;
  description: string;
  imageSrc: string | null;
};

export const tapixxoNfcProduct = {
  slug: "tapixxo-nfc",
  name: "Tapixxo NFC",
  shortDescription: "Una placa física NFC + QR para conectar cualquier espacio con tu mundo digital.",
  description:
    "Tapixxo NFC reúne NFC y código QR en una placa física pensada para acompañar tus espacios. Después de la compra, configurarás el destino desde tu panel Tapixxo.",

  // Precio unitario público. Los tres modelos y el diseño estándar mantienen
  // el mismo valor: no hay recargos por modelo ni personalización en esta fase.
  basePriceCop: 70000 as number | null,

  // Sustituye null por una ruta local, por ejemplo "/store/tapixxo-nfc.jpg",
  // cuando la fotografía definitiva esté disponible.
  imageSrc: null as string | null,

  models: [
    {
      id: "model-1",
      name: "Modelo 1",
      description: "Un primer acabado visual para tu placa Tapixxo.",
      imageSrc: null,
    },
    {
      id: "model-2",
      name: "Modelo 2",
      description: "Una segunda propuesta preparada para el diseño final.",
      imageSrc: null,
    },
    {
      id: "model-3",
      name: "Modelo 3",
      description: "Una tercera variante con el mismo precio base.",
      imageSrc: null,
    },
  ] satisfies StoreModel[],
};

export function formatBasePrice(basePriceCop: number | null) {
  if (basePriceCop === null) return "Precio por definir";

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(basePriceCop);
}
