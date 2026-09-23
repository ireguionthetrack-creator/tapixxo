"use client";

/* eslint-disable @next/next/no-img-element -- The preview is a local browser URL or a dynamic storage URL. */

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ImageUploadIcon, Tick02Icon } from "@hugeicons/core-free-icons";

export type MenuImageKind = "category-bubble" | "category-card" | "product" | "banner";

type ImageSpec = { width: number; height: number; label: string };
const SPECS: Record<MenuImageKind, ImageSpec> = {
  "category-bubble": { width: 720, height: 720, label: "720 × 720 px" },
  "category-card": { width: 1200, height: 1200, label: "1200 × 1200 px" },
  product: { width: 1200, height: 1200, label: "1200 × 1200 px" },
  banner: { width: 1600, height: 900, label: "1600 × 900 px" },
};
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo optimizar la imagen.")), "image/webp", quality);
  });
}

async function optimizeImage(file: File, spec: ImageSpec) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
      image.src = url;
    });
    const sourceRatio = image.width / image.height;
    const targetRatio = spec.width / spec.height;
    const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
    const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
    const canvas = document.createElement("canvas");
    canvas.width = spec.width;
    canvas.height = spec.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, spec.width, spec.height);
    for (const quality of [0.84, 0.72, 0.6]) {
      const blob = await canvasBlob(canvas, quality);
      if (blob.size <= MAX_FILE_SIZE) return new File([blob], "menu-image.webp", { type: "image/webp" });
    }
    throw new Error("No fue posible reducir la imagen a 2 MB. Usa una imagen menos pesada.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function MenuImageUpload({ companyId, kind, value, label, onChange }: { companyId: string; kind: MenuImageKind; value: string; label: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const spec = SPECS[kind];
  const image = preview ?? value;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!ACCEPTED_TYPES.has(file.type)) { setError("Selecciona un archivo JPG, PNG o WEBP."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("El archivo original no puede superar los 12 MB."); return; }
    setUploading(true);
    try {
      const optimized = await optimizeImage(file, spec);
      const localPreview = URL.createObjectURL(optimized);
      setPreview((current) => { if (current) URL.revokeObjectURL(current); return localPreview; });
      const formData = new FormData();
      formData.append("file", optimized);
      formData.append("kind", kind);
      const response = await fetch(`/api/companies/${companyId}/digital-menu/images`, { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo subir la imagen.");
      onChange(result.imageUrl);
      setPreview((current) => { if (current) URL.revokeObjectURL(current); return null; });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo procesar la imagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <div className="rounded-xl border border-dashed border-white/15 bg-black/15 p-3">
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectImage(event)} className="hidden" />
    <div className="flex items-center gap-3">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/30">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <HugeiconsIcon icon={ImageUploadIcon} size={21} strokeWidth={1.6} className="text-orange-200" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-gray-400">{spec.label} · WEBP optimizado · máximo 2 MB</p>
      </div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="min-h-10 shrink-0 rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 text-xs font-semibold text-orange-100 disabled:opacity-50">
        {uploading ? "Optimizando…" : image ? "Cambiar" : "Subir"}
      </button>
    </div>
    {image && !uploading && <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-200"><HugeiconsIcon icon={Tick02Icon} size={14} aria-hidden="true" />Imagen lista para guardar</p>}
    {error && <p role="alert" className="mt-2 text-xs leading-5 text-red-200">{error}</p>}
  </div>;
}
