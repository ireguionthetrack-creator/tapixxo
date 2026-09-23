"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { TexasProduct } from "./types";
import type { TexasLanguage } from "./translations";
import { formatMenuPrice } from "./types";
import styles from "./texas-menu.module.css";

const PRODUCT_UI_COPY: Record<TexasLanguage, { details: string; close: string; soldOut: string; brand: string; addFavorite: string; removeFavorite: string }> = {
  es: { details: "Ver detalles de", close: "Cerrar detalles", soldOut: "Agotado", brand: "Texas Resto Bar", addFavorite: "Agregar a favoritos", removeFavorite: "Quitar de favoritos" },
  en: { details: "View details for", close: "Close details", soldOut: "Sold out", brand: "Texas Resto Bar", addFavorite: "Add to favorites", removeFavorite: "Remove from favorites" },
  pt: { details: "Ver detalhes de", close: "Fechar detalhes", soldOut: "Esgotado", brand: "Texas Resto Bar", addFavorite: "Adicionar aos favoritos", removeFavorite: "Remover dos favoritos" },
  fr: { details: "Voir les détails de", close: "Fermer les détails", soldOut: "Épuisé", brand: "Texas Resto Bar", addFavorite: "Ajouter aux favoris", removeFavorite: "Retirer des favoris" },
};

export function TexasProductRow({ product, language, showCurrency, isFavorite, isRemovingFromFavorites, onToggleFavorite }: { product: TexasProduct; language: TexasLanguage; showCurrency: boolean; isFavorite: boolean; isRemovingFromFavorites: boolean; onToggleFavorite: (productId: string) => void }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const detailsId = `texas-product-${product.id}`;
  const copy = PRODUCT_UI_COPY[language];
  const hasPriceOptions = product.priceOptions.length > 0;

  useEffect(() => {
    if (!isDetailsOpen) return;

    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDetailsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isDetailsOpen]);

  return <>
    <article className={`${styles.product} ${!product.available ? styles.soldOut : ""} ${isRemovingFromFavorites ? styles.productFavoriteRemoving : ""}`}>
      <button type="button" className={styles.productTrigger} onClick={() => setIsDetailsOpen(true)} aria-expanded={isDetailsOpen} aria-controls={detailsId} aria-label={`${copy.details} ${product.name}`}>
        {product.imageUrl && <span className={styles.productImageFrame}><Image className={styles.productImage} src={product.imageUrl} alt="" fill sizes="80px" unoptimized /></span>}
        <span className={styles.productContent}>
          <span className={styles.productLine}>
            <span className={styles.productName}>{product.name}</span>
            {!hasPriceOptions && <><span className={styles.dots} aria-hidden="true" /><span className={styles.price}>{formatMenuPrice(product.price, product.currencyCode, showCurrency)}</span></>}
          </span>
          {hasPriceOptions && <span className={styles.productPriceOptions}>{product.priceOptions.map((option) => <span key={option.label}><strong>{option.label}</strong><b>{formatMenuPrice(option.price, product.currencyCode, showCurrency)}</b></span>)}</span>}
          {product.description && <span className={styles.description}>{product.description}</span>}
          {!product.available && <span className={styles.soldOutLabel}>{copy.soldOut}</span>}
        </span>
      </button>
    </article>

    {isDetailsOpen && <div className={styles.productDetailsBackdrop} onMouseDown={() => setIsDetailsOpen(false)}>
      <section id={detailsId} className={styles.productDetailsSheet} role="dialog" aria-modal="true" aria-labelledby={`${detailsId}-title`} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.productDetailsHandle} aria-hidden="true" />
        <button ref={closeButtonRef} type="button" className={styles.productDetailsClose} onClick={() => setIsDetailsOpen(false)} aria-label={copy.close}>×</button>
        <button type="button" disabled={isRemovingFromFavorites} className={`${styles.productDetailsFavorite} ${isFavorite ? styles.productDetailsFavoriteActive : ""}`} aria-label={isFavorite ? `${copy.removeFavorite}: ${product.name}` : `${copy.addFavorite}: ${product.name}`} aria-pressed={isFavorite} onClick={() => onToggleFavorite(product.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.85 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.07-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.85-8.84a5.5 5.5 0 0 0 0-7.78Z" /></svg>
        </button>
        {product.imageUrl && <div className={styles.productDetailsImageFrame}><Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 100vw, 38rem" className={styles.productDetailsImage} unoptimized priority /></div>}
        <div className={styles.productDetailsContent}>
          <p className={styles.productDetailsEyebrow}>{copy.brand}</p>
          <h2 id={`${detailsId}-title`}>{product.name}</h2>
          {hasPriceOptions
            ? <div className={styles.productDetailsPriceOptions}>{product.priceOptions.map((option) => <p key={option.label}><span>{option.label}</span><b>{formatMenuPrice(option.price, product.currencyCode, showCurrency)}</b></p>)}</div>
            : <p className={styles.productDetailsPrice}>{formatMenuPrice(product.price, product.currencyCode, showCurrency)}</p>}
          {product.description && <p className={styles.productDetailsDescription}>{product.description}</p>}
          {!product.available && <p className={styles.productDetailsSoldOut}>{copy.soldOut}</p>}
        </div>
      </section>
    </div>}
  </>;
}
