"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./texas-menu.module.css";

export type TexasPromotionFlyer = {
  id: string;
  imageUrl: string;
  eyebrow: string;
  title: string;
  description: string;
  showOverlay?: boolean;
};

function isRemoteImage(source: string) {
  return source.startsWith("http://") || source.startsWith("https://");
}

export function TexasPromotionCarousel({ flyers, autoplaySeconds = 8 }: { flyers: readonly TexasPromotionFlyer[]; autoplaySeconds?: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const hasMultipleFlyers = flyers.length > 1;

  useEffect(() => {
    if (!hasMultipleFlyers) return;
    const interval = Math.min(45, Math.max(5, autoplaySeconds)) * 1_000;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % flyers.length), interval);
    return () => window.clearInterval(timer);
  }, [autoplaySeconds, flyers.length, hasMultipleFlyers]);

  if (!flyers.length) return null;

  const moveBy = (direction: -1 | 1) => setActiveIndex((index) => (index + direction + flyers.length) % flyers.length);
  const handleTouchEnd = (endX: number) => {
    if (!hasMultipleFlyers || touchStart === null) return;
    const distance = endX - touchStart;
    if (Math.abs(distance) > 42) moveBy(distance > 0 ? -1 : 1);
    setTouchStart(null);
  };

  return <section className={styles.promotionSection} aria-label="Promociones">
    <div className={styles.promotionViewport} aria-roledescription="carrusel" aria-label={`Promociones, ${flyers.length} ${flyers.length === 1 ? "flyer" : "flyers"}`} onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}>
      <div className={styles.promotionTrack} style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {flyers.map((flyer, index) => <article className={styles.promotionSlide} key={flyer.id} aria-hidden={activeIndex !== index}>
          <Image src={flyer.imageUrl} alt="" fill sizes="(max-width: 700px) 100vw, 58rem" className={styles.promotionImage} unoptimized={isRemoteImage(flyer.imageUrl)} />
          {flyer.showOverlay !== false && <><div className={styles.promotionShade} /><div className={styles.promotionCopy}><p>{flyer.eyebrow}</p><h2>{flyer.title}</h2><span>{flyer.description}</span></div></>}
        </article>)}
      </div>
    </div>
    <div className={styles.promotionDots} aria-label="Seleccionar promoción">
      {flyers.map((flyer, index) => <button type="button" key={flyer.id} aria-label={`Ver promoción ${index + 1}`} aria-current={activeIndex === index} onClick={() => setActiveIndex(index)} />)}
    </div>
  </section>;
}
