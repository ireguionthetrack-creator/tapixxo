import { createHash } from "crypto";

const WOMPI_SANDBOX_CHECKOUT_URL = "https://checkout.wompi.co/p/";
const MAX_SAFE_AMOUNT_IN_CENTS = Number.MAX_SAFE_INTEGER;

export type WompiSandboxConfig = {
  publicKey: string;
  integritySecret: string;
  eventsSecret: string;
  appUrl: string;
};

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

export function getWompiSandboxConfig(): WompiSandboxConfig {
  if (process.env.WOMPI_ENVIRONMENT !== "sandbox") {
    throw new Error("Wompi está configurado únicamente para Sandbox en esta fase.");
  }

  const publicKey = requiredEnvironmentValue("WOMPI_SANDBOX_PUBLIC_KEY");
  if (!publicKey.startsWith("pub_test_")) {
    throw new Error("La llave pública de Wompi debe ser una llave Sandbox (pub_test_)." );
  }

  const appUrl = new URL(requiredEnvironmentValue("TAPIXXO_APP_URL"));
  if (appUrl.protocol !== "https:") {
    throw new Error("TAPIXXO_APP_URL debe usar HTTPS para Wompi Sandbox.");
  }

  return {
    publicKey,
    integritySecret: requiredEnvironmentValue("WOMPI_SANDBOX_INTEGRITY_SECRET"),
    eventsSecret: requiredEnvironmentValue("WOMPI_SANDBOX_EVENTS_SECRET"),
    appUrl: appUrl.origin,
  };
}

export function toPositiveAmountInCents(totalCop: unknown) {
  let total: number;

  if (typeof totalCop === "number" && Number.isSafeInteger(totalCop)) {
    total = totalCop;
  } else if (typeof totalCop === "string" && /^\d+$/.test(totalCop)) {
    total = Number(totalCop);
  } else {
    throw new Error("El total del pedido no es un entero válido.");
  }

  if (!Number.isSafeInteger(total) || total <= 0 || total > MAX_SAFE_AMOUNT_IN_CENTS / 100) {
    throw new Error("El total del pedido está fuera del rango permitido.");
  }

  return total * 100;
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createWompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
) {
  return sha256(`${reference}${amountInCents}${currency}${integritySecret}`);
}

export function wompiSandboxCheckoutUrl() {
  return WOMPI_SANDBOX_CHECKOUT_URL;
}
