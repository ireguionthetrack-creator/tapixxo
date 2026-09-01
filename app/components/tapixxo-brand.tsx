import Image from "next/image";

type TapixxoBrandProps = {
  className?: string;
  priority?: boolean;
};

export function TapixxoBrand({
  className = "",
  priority = false,
}: TapixxoBrandProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/brand/tapixxo-wordmark-white.png"
        alt="Tapixxo"
        width={249}
        height={69}
        priority={priority}
        className="h-7 w-auto"
      />
    </span>
  );
}

type TapixxoMarkProps = {
  className?: string;
};

export function TapixxoMark({ className = "" }: TapixxoMarkProps) {
  return (
    <Image
      src="/brand/tapixxo-mark-white.png"
      alt=""
      aria-hidden="true"
      width={48}
      height={48}
      className={`h-9 w-9 shrink-0 object-contain ${className}`}
    />
  );
}
