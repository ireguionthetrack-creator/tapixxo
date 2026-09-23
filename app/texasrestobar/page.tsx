import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Texas Resto Bar | Cartagena",
  description: "Menú, reservas y redes sociales de Texas Resto Bar.",
  icons: {
    icon: [{ url: "/texasrestobar/icon.png", type: "image/png" }],
  },
};

export default function TexasRestoBarPage() {
  redirect("/menu/texasrestobar");
}
