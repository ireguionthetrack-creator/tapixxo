"use client";

import { createElement, useEffect, type ReactNode } from "react";

const SOURCES = [
  "/vendor/srdavo-liquid-glass/displacement-utils.js",
  "/vendor/srdavo-liquid-glass/glass-element.js",
] as const;

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

function loadScript(source: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);

    if (existing) {
      if (existing.dataset.ready === "true") resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Unable to load ${source}`)), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = source;
    script.async = false;
    script.addEventListener("load", () => {
      script.dataset.ready = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Unable to load ${source}`)), { once: true });
    document.head.appendChild(script);
  });
}

/** Local integration of srdavo/liquid-glass, loaded dependency-first. */
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
  useEffect(() => {
    if (window.customElements.get("glass-element")) return;

    void (async () => {
      try {
        for (const source of SOURCES) await loadScript(source);
      } catch {
        // Before the component is upgraded, semantic links and controls stay usable.
      }
    })();
  }, []);

  return createElement(
    "glass-element",
    {
      className,
      "auto-size": "",
      radius,
      depth,
      blur,
      strength,
      "chromatic-aberration": 0,
      "background-color": backgroundColor,
      interactive: interactive ? "" : undefined,
    },
    children,
  );
}
