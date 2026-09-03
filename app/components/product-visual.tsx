import Image from "next/image";

type ProductVisualProps = {
  alt: string;
  imageSrc: string | null;
  label: string;
  className?: string;
};

export function ProductVisual({
  alt,
  imageSrc,
  label,
  className = "",
}: ProductVisualProps) {
  if (imageSrc) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={imageSrc} alt={alt} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(255,122,26,0.34),transparent_31%),linear-gradient(145deg,#272520,#0d0e0d_74%)] ${className}`}
      aria-label={`${alt}. Imagen de referencia`}
    >
      <div className="absolute inset-x-[19%] top-[19%] bottom-[17%] rounded-[17%] border border-orange-200/35 bg-gradient-to-br from-orange-300/30 via-orange-400/10 to-transparent shadow-[0_24px_55px_rgba(0,0,0,0.45)]" />
      <div className="absolute left-[30%] top-[32%] h-[13%] w-[40%] rounded-full border border-orange-100/35 bg-black/20" />
      <div className="absolute bottom-[29%] left-[30%] right-[30%] h-px bg-orange-100/35" />
      <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-orange-100/80">
        {label}
      </span>
    </div>
  );
}
