import type { CSSProperties, ReactNode } from "react";

type LiquidGlassProps = {
  children: ReactNode;
  className: string;
  radius: number;
  depth?: number;
  blur?: number;
  strength?: number;
  backgroundColor: string;
  interactive?: boolean;
};

/**
 * A CSS glass surface intentionally renders on the server. The previous SVG
 * displacement implementation created a ResizeObserver and expensive filter
 * for every decorative panel, which made the landing jank on mobile.
 */
export function LiquidGlass({
  children,
  className,
  radius,
  depth = 3,
  blur = 3,
  strength = 16,
  backgroundColor,
  interactive = true,
}: LiquidGlassProps) {
  const style = {
    "--tapixxo-glass-background": backgroundColor,
    "--tapixxo-glass-radius": `${radius}px`,
    "--tapixxo-glass-blur": `${Math.max(blur, 1)}px`,
    "--tapixxo-glass-depth": `${depth}px`,
    "--tapixxo-glass-strength": strength,
  } as CSSProperties;

  return (
    <div
      className={`tapixxo-liquid-glass${interactive ? " tapixxo-liquid-glass-interactive" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
