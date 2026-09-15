"use client";

import { useEffect, useState } from "react";

import { LiquidGlass } from "./liquid-glass";
import { TapixxoBrand } from "./tapixxo-brand";

const COMPACT_AFTER_SCROLL = 32;
const HIDE_AFTER_SCROLL = 96;

/** Fixed navigation that settles into a smaller glass rail after the hero. */
export function LandingNav() {
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let frame = 0;

    const updateNavigation = () => {
      frame = 0;
      const scrollY = window.scrollY;
      setCompact(scrollY > COMPACT_AFTER_SCROLL);
      setHidden(scrollY > HIDE_AFTER_SCROLL);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateNavigation);
    };

    updateNavigation();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <LiquidGlass
      className={`tapixxo-srdavo-surface tapixxo-srdavo-nav-surface${hidden ? " tapixxo-nav-hidden" : ""}`}
      radius={20}
      depth={3}
      blur={3}
      strength={65}
      backgroundColor="rgba(18, 18, 17, 0.34)"
      interactive={false}
    >
      <header className="tapixxo-showcase-nav" data-compact={compact} aria-hidden={hidden}>
        <a href="#inicio" className="tapixxo-showcase-brand" aria-label="Tapixxo, inicio" tabIndex={hidden ? -1 : undefined}>
          <TapixxoBrand priority />
        </a>
        <LiquidGlass
          className="tapixxo-srdavo-surface tapixxo-srdavo-control tapixxo-srdavo-control-warm tapixxo-login-control"
          radius={17}
          depth={2}
          blur={2}
          strength={50}
          backgroundColor="rgba(255, 110, 37, 0.78)"
        >
          <a className="tapixxo-showcase-nav-cta tapixxo-login-button" href="/login" tabIndex={hidden ? -1 : undefined}>
            Iniciar sesión
          </a>
        </LiquidGlass>
      </header>
    </LiquidGlass>
  );
}
