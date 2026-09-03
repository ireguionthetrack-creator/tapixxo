import { Suspense } from "react";
import { PaymentReturnContent } from "./payment-return-content";

export default function WompiPaymentReturnPage() {
  return (
    <Suspense fallback={<main className="tapixxo-shell flex min-h-screen items-center justify-center text-sm text-gray-400">Preparando el estado del pago...</main>}>
      <PaymentReturnContent />
    </Suspense>
  );
}
