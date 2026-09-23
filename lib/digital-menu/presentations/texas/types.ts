import type { PublicDigitalMenu, PublicMenuProduct } from "@/lib/digital-menu/public-data";

export type TexasMenuData = PublicDigitalMenu;
export type TexasProduct = PublicMenuProduct;

export function formatMenuPrice(price: number, currencyCode: string, showCurrency: boolean) {
  const amount = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(price);
  return showCurrency ? `${currencyCode} $${amount}` : `$${amount}`;
}
