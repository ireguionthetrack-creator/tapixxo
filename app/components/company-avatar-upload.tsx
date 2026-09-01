"use client";
/* eslint-disable @next/next/no-img-element -- Preview uses a browser object URL. */

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { CompanyAvatar } from "@/app/components/company-avatar";

type CompanyAvatarUploadProps = {
  companyId: string;
  companyName: string;
  imagePath: string | null;
  canManage: boolean;
  version: number;
  onImageChange: (imagePath: string | null) => void;
  onClose: () => void;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function optimizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);

      const sourceSize = Math.min(image.width, image.height);
      const sourceX = (image.width - sourceSize) / 2;
      const sourceY = (image.height - sourceSize) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("No se pudo preparar la imagen."));
        return;
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        512,
        512
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("No se pudo optimizar la imagen."));
            return;
          }

          resolve(
            new File([blob], "avatar.webp", {
              type: "image/webp",
            })
          );
        },
        "image/webp",
        0.82
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    image.src = sourceUrl;
  });
}

export function CompanyAvatarUpload({
  companyId,
  companyName,
  imagePath,
  canManage,
  version,
  onImageChange,
  onClose,
}: CompanyAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openFilePicker() {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setStatus("");
    setError("");

    if (!file) return;

    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("La imagen no puede superar los 2 MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImage() {
    if (!selectedFile) return;

    setProcessing(true);
    setStatus("");
    setError("");

    try {
      const optimizedFile = await optimizeImage(selectedFile);

      if (optimizedFile.size > MAX_FILE_SIZE) {
        throw new Error("La imagen optimizada supera el límite de 2 MB.");
      }

      const formData = new FormData();
      formData.append("file", optimizedFile);

      const response = await fetch(
        `/api/companies/${companyId}/avatar`,
        {
          method: "POST",
          body: formData,
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo subir la imagen.");
      }

      onImageChange(result.imagePath);
      setSelectedFile(null);
      setPreviewUrl(null);
      setStatus("Imagen actualizada.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la imagen."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function deleteImage() {
    setProcessing(true);
    setStatus("");
    setError("");

    try {
      const response = await fetch(
        `/api/companies/${companyId}/avatar`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo eliminar la imagen.");
      }

      onImageChange(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setStatus("Imagen eliminada.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar la imagen."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="tapixxo-panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa del logo"
              className="h-20 w-20 rounded-2xl border border-orange-400/30 bg-black/30 object-cover"
            />
          ) : (
            <CompanyAvatar
              name={companyName}
              imagePath={imagePath}
              size="lg"
              version={version}
            />
          )}

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange-300">
              Identidad visual
            </p>
            <h2 className="mt-1 text-lg font-semibold">Logo de empresa</h2>
            <p className="mt-1 text-sm text-gray-500">
              JPG, PNG o WEBP. Se ajusta a 512 × 512 y se convierte a WEBP.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          aria-label="Cerrar editor de logo"
          className="self-start rounded-lg px-2 py-0.5 text-2xl leading-none text-gray-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          ×
        </button>

        {canManage && (
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={selectFile}
            className="hidden"
          />
        )}
      </div>

      {canManage && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={processing}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold transition hover:border-orange-400/40 hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedFile ? "Cambiar selección" : "Cambiar imagen"}
          </button>

          {selectedFile && (
            <button
              type="button"
              onClick={() => void uploadImage()}
              disabled={processing}
              className="rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Subiendo..." : "Subir imagen"}
            </button>
          )}

          {imagePath && !selectedFile && (
            <button
              type="button"
              onClick={() => void deleteImage()}
              disabled={processing}
              className="rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-400/60 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Eliminando..." : "Eliminar imagen"}
            </button>
          )}
        </div>
      )}

      {status && (
        <p className="mt-4 rounded-lg bg-green-950 px-4 py-3 text-sm text-green-300">
          {status}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
