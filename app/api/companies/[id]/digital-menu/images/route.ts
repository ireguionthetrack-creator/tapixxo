import { NextResponse } from "next/server";
import { getCompanyDigitalMenuAccess } from "@/lib/digital-menu/access";

const BUCKET = "menu-images";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const IMAGE_KINDS = ["category-bubble", "category-card", "product", "banner"] as const;
type ImageKind = typeof IMAGE_KINDS[number];

function imageKind(value: FormDataEntryValue | null): ImageKind | null {
  return typeof value === "string" && IMAGE_KINDS.includes(value as ImageKind)
    ? value as ImageKind
    : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getCompanyDigitalMenuAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = imageKind(formData.get("kind"));

    if (!kind) return NextResponse.json({ error: "El tipo de imagen no es válido." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona una imagen para subir." }, { status: 400 });
    if (file.type !== "image/webp") return NextResponse.json({ error: "La imagen debe estar optimizada en formato WEBP." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "La imagen no puede superar los 2 MB." }, { status: 400 });

    const imagePath = `${id}/${access.menu.id}/${kind}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await access.admin.storage
      .from(BUCKET)
      .upload(imagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      const error = uploadError.message.toLowerCase().includes("bucket")
        ? "No está preparado el almacenamiento de imágenes. Aplica la migración de Menú Digital."
        : uploadError.message;
      return NextResponse.json({ error }, { status: 500 });
    }

    const { data } = access.admin.storage.from(BUCKET).getPublicUrl(imagePath);
    return NextResponse.json({ imageUrl: data.publicUrl, imagePath });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo subir la imagen." }, { status: 500 });
  }
}
