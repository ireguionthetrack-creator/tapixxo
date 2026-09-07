type LiquidLoaderProps = {
  className?: string;
};

export function LiquidLoader({ className = "" }: LiquidLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`tapixxo-liquid-loader ${className}`}
    >
      <i aria-hidden="true" className="tapixxo-loader-decagon tapixxo-loader-decagon-one" />
      <i aria-hidden="true" className="tapixxo-loader-decagon tapixxo-loader-decagon-two" />
      <i aria-hidden="true" className="tapixxo-loader-decagon tapixxo-loader-decagon-three" />
      <span aria-hidden="true" />
    </div>
  );
}
