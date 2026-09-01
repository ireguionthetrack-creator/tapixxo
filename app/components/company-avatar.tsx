/* eslint-disable @next/next/no-img-element -- Supabase Storage URL is dynamic. */

type CompanyAvatarProps = {
  name: string;
  imagePath?: string | null;
  size?: "sm" | "lg";
  version?: number;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function CompanyAvatar({
  name,
  imagePath,
  size = "sm",
  version,
}: CompanyAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const imageUrl = imagePath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-avatars/${imagePath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}${version ? `?v=${version}` : ""}`
    : null;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`Logo de ${name}`}
        className={`${sizeClasses[size]} shrink-0 rounded-2xl border border-white/10 bg-black/30 object-cover`}
      />
    );
  }

  return (
    <div
      aria-label={`Inicial de ${name}`}
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-400/10 font-semibold text-orange-200`}
    >
      {initial}
    </div>
  );
}
