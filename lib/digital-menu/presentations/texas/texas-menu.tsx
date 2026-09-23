"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { TexasMultiLink } from "@/lib/multilink/texas/texas-multilink";
import { TexasProductRow } from "./product-row";
import { TexasPromotionCarousel, type TexasPromotionFlyer } from "./promotion-carousel";
import type { TexasMenuData, TexasProduct } from "./types";
import { detectTexasLanguage, isTexasLanguage, TEXAS_COPY, TEXAS_LANGUAGE_OPTIONS, translateTexasCategory, type TexasLanguage } from "./translations";
import { translateTexasProduct, translateTexasSectionName } from "./product-translations";
import styles from "./texas-menu.module.css";

const TEXAS_PROMOTION_FLYERS: readonly TexasPromotionFlyer[] = [
  {
    id: "texas-signature-grill",
    imageUrl: "/menu-assets/texas-promo-food.png",
    eyebrow: "Sabor de la casa",
    title: "La mesa texana te espera",
    description: "Parrilla, costillas y mariscos hechos para compartir.",
  },
  {
    id: "texas-margaritas",
    imageUrl: "/menu-assets/texas-promo-margaritas-sept-22.png",
    eyebrow: "",
    title: "",
    description: "",
    showOverlay: false,
  },
];

const CATEGORY_ART_BY_NAME: Record<string, string> = {
  "ceviches-y-entradas": "/menu-assets/texas-categories/ceviches.png",
  arroces: "/menu-assets/texas-categories/arroces.png",
  postres: "/menu-assets/texas-categories/postres.png",
  "cervezas-y-cubetazos": "/menu-assets/texas-categories/cervezas.png",
  bebidas: "/menu-assets/texas-categories/bebidas.png",
  "premium-angus": "/menu-assets/texas-categories/angus.png",
  parrilla: "/menu-assets/texas-categories/parrilla.png",
  "pescados-y-mariscos": "/menu-assets/texas-categories/pescados-mariscos.png",
  pastas: "/menu-assets/texas-categories/pastas.png",
  burgers: "/menu-assets/texas-categories/burgers.png",
  infantil: "/menu-assets/texas-categories/infantil.png",
  adicionales: "/menu-assets/texas-categories/adicionales.png",
  "cocteles-y-margaritas": "/menu-assets/texas-categories/cocteles.png",
  licores: "/menu-assets/texas-categories/licores.png",
  vinos: "/menu-assets/texas-categories/vinos.png",
};

const PARCHMENT_CATEGORY_KEYS = new Set(["ceviches-y-entradas", "arroces", "parrilla", "pastas"]);
const MARINE_CATEGORY_KEYS = new Set(["pescados-y-mariscos", "postres", "infantil"]);
const PREMIUM_CATEGORY_KEYS = new Set(["premium-angus", "vinos"]);
const ADDITIONAL_CATEGORY_KEYS = new Set(["adicionales"]);
const FAVORITES_COOKIE = "tapixxo_texas_favorites";
const WAITER_BUTTON_INTRO_STORAGE_KEY = "tapixxo_texas_waiter_button_intro_seen";
const TEXAS_CATEGORY_GROUPS: ReadonlyArray<{ id: string; categoryKeys: readonly string[]; labels: Record<TexasLanguage, string> }> = [
  { id: "beverages", categoryKeys: ["bebidas", "cocteles-y-margaritas", "cervezas-y-cubetazos", "licores", "vinos"], labels: { es: "Bebidas", en: "Drinks", pt: "Bebidas", fr: "Boissons" } },
  { id: "starters", categoryKeys: ["ceviches-y-entradas"], labels: { es: "Entradas", en: "Starters", pt: "Entradas", fr: "Entrées" } },
  { id: "main-dishes", categoryKeys: ["arroces", "parrilla", "premium-angus", "pescados-y-mariscos", "pastas", "burgers", "infantil"], labels: { es: "Platos fuertes", en: "Main dishes", pt: "Pratos principais", fr: "Plats principaux" } },
  { id: "desserts", categoryKeys: ["postres"], labels: { es: "Postres", en: "Desserts", pt: "Sobremesas", fr: "Desserts" } },
  { id: "extras", categoryKeys: ["adicionales"], labels: { es: "Adicionales", en: "Extras", pt: "Adicionais", fr: "Suppléments" } },
];

function categoryAssetKey(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/&/g, "y").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isRemoteImage(source: string) {
  return source.startsWith("http://") || source.startsWith("https://");
}

function favoriteIdsFromSessionCookie() {
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${FAVORITES_COOKIE}=`));
  if (!cookie) return [];
  try {
    return [...new Set(decodeURIComponent(cookie.slice(FAVORITES_COOKIE.length + 1)).split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  } catch {
    return [];
  }
}

function productsBySection(products: TexasProduct[]) {
  return products.reduce<Array<{ name: string | null; products: TexasProduct[] }>>((groups, product) => {
    const group = groups.find((item) => item.name === product.sectionName);
    if (group) group.products.push(product);
    else groups.push({ name: product.sectionName, products: [product] });
    return groups;
  }, []);
}

function categoriesByHierarchy(categories: TexasMenuData["categories"]) {
  const categoriesByKey = new Map(categories.map((category) => [categoryAssetKey(category.name), category]));
  const grouped = TEXAS_CATEGORY_GROUPS.flatMap((group) => group.categoryKeys.flatMap((key) => {
    const category = categoriesByKey.get(key);
    return category ? [category] : [];
  }));
  const groupedIds = new Set(grouped.map((category) => category.id));
  return [...grouped, ...categories.filter((category) => !groupedIds.has(category.id))];
}

function localizedCategoryName(category: TexasMenuData["categories"][number], language: TexasLanguage) {
  return language === "es" ? category.name : category.translations[language]?.name ?? translateTexasCategory(category.name, language);
}

function localizedSectionName(product: TexasProduct, language: TexasLanguage) {
  if (!product.sectionName) return null;
  return language === "es" ? product.sectionName : product.sectionTranslations[language] ?? translateTexasSectionName(product.sectionName, language);
}

export function TexasMenu({ menu, plateCode }: { menu: TexasMenuData; plateCode?: string }) {
  const [isMenuFrontVisible, setIsMenuFrontVisible] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [language, setLanguage] = useState<TexasLanguage>("es");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isCategoryTransitioning, setIsCategoryTransitioning] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [removingFavoriteIds, setRemovingFavoriteIds] = useState<string[]>([]);
  const [isFavoritesView, setIsFavoritesView] = useState(false);
  const [areFavoritesReady, setAreFavoritesReady] = useState(false);
  const [waiterButtonIntroState, setWaiterButtonIntroState] = useState<"pending" | "animate" | "ready">("pending");
  const [waiterCallState, setWaiterCallState] = useState<"idle" | "submitting" | "pending" | "error">("idle");
  const [isScrollToTopVisible, setIsScrollToTopVisible] = useState(false);
  const [isHeaderOutOfView, setIsHeaderOutOfView] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const languageControlRef = useRef<HTMLDivElement>(null);
  const categoryScrollerRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastScrollYRef = useRef(0);
  const transitionTimersRef = useRef<number[]>([]);
  const favoriteRemovalTimersRef = useRef<number[]>([]);
  const copy = TEXAS_COPY[language];
  const availableLanguageOptions = useMemo(() => TEXAS_LANGUAGE_OPTIONS.filter((option) => menu.enabledLanguages.includes(option.code)), [menu.enabledLanguages]);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const isHome = !categoryId && !normalizedQuery && !isFavoritesView;
  const organizedCategories = useMemo(() => categoriesByHierarchy(menu.categories), [menu.categories]);
  const localizedProducts = useMemo(() => menu.products.map((product) => translateTexasProduct(product, language)), [language, menu.products]);
  const categorySearchIndex = useMemo(() => new Map(menu.categories.map((category) => [
    category.id,
    `${category.name} ${localizedCategoryName(category, language)}`.toLocaleLowerCase("es"),
  ])), [language, menu.categories]);
  const matchingProducts = useMemo(() => localizedProducts.filter((product) => {
    const matchesCategory = !categoryId || product.categoryId === categoryId;
    const matchesQuery = !normalizedQuery || `${product.name} ${product.description ?? ""} ${product.priceOptions.map((option) => option.label).join(" ")}`.toLocaleLowerCase("es").includes(normalizedQuery) || categorySearchIndex.get(product.categoryId ?? "")?.includes(normalizedQuery);
    const matchesFavorites = !isFavoritesView || favoriteIds.includes(product.id) || removingFavoriteIds.includes(product.id);
    return matchesCategory && matchesQuery && matchesFavorites;
  }), [categoryId, categorySearchIndex, favoriteIds, isFavoritesView, localizedProducts, normalizedQuery, removingFavoriteIds]);
  const visibleCategories = organizedCategories.filter((category) => matchingProducts.some((product) => product.categoryId === category.id));
  const selectedCategory = menu.categories.find((category) => category.id === categoryId);
  const usesParchment = Boolean(selectedCategory && PARCHMENT_CATEGORY_KEYS.has(categoryAssetKey(selectedCategory.name)));
  const usesMarineMosaic = Boolean(selectedCategory && MARINE_CATEGORY_KEYS.has(categoryAssetKey(selectedCategory.name)));
  const usesPremiumTexture = Boolean(selectedCategory && PREMIUM_CATEGORY_KEYS.has(categoryAssetKey(selectedCategory.name)));
  const usesAdditionalTexture = Boolean(selectedCategory && ADDITIONAL_CATEGORY_KEYS.has(categoryAssetKey(selectedCategory.name)));

  const refreshWaiterCall = useCallback(async () => {
    if (!plateCode) return;
    try {
      const response = await fetch(`/api/menu/waiter-call?plateCode=${encodeURIComponent(plateCode)}`, { cache: "no-store" });
      const result = await response.json() as { status?: "idle" | "pending" };
      if (!response.ok) return;
      setWaiterCallState((current) => result.status === "pending" ? "pending" : current === "pending" ? "idle" : current);
    } catch {
      // A temporary connection issue must not erase a pending request locally.
    }
  }, [plateCode]);

  useEffect(() => {
    if (!categoryId) return;
    const frame = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [categoryId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const storedLanguage = window.localStorage.getItem("tapixxo-texas-language");
        const detected = isTexasLanguage(storedLanguage) ? storedLanguage : detectTexasLanguage(navigator.languages.length ? navigator.languages : [navigator.language]);
        setLanguage(menu.enabledLanguages.includes(detected) ? detected : "es");
      } catch {
        const detected = detectTexasLanguage(navigator.languages.length ? navigator.languages : [navigator.language]);
        setLanguage(menu.enabledLanguages.includes(detected) ? detected : "es");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menu.enabledLanguages]);

  useEffect(() => {
    if (!plateCode) return;
    const initialCheck = window.setTimeout(() => void refreshWaiterCall(), 0);
    const poll = window.setInterval(() => void refreshWaiterCall(), 6_000);
    return () => { window.clearTimeout(initialCheck); window.clearInterval(poll); };
  }, [plateCode, refreshWaiterCall]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new IntersectionObserver(([entry]) => {
      const isOutOfView = !entry.isIntersecting;
      setIsHeaderOutOfView(isOutOfView);
      setIsScrollToTopVisible(isOutOfView);
    }, { threshold: .1 });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const closeSearchWhenScrollingDown = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollYRef.current + 8;
      const isSearchBeingUsed = document.activeElement === searchInputRef.current;
      if (isScrollingDown && !isSearchBeingUsed) setIsSearchOpen(false);
      lastScrollYRef.current = currentScrollY;
    };
    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", closeSearchWhenScrollingDown, { passive: true });
    return () => window.removeEventListener("scroll", closeSearchWhenScrollingDown);
  }, [isSearchOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try {
        const hasSeenIntro = window.localStorage.getItem(WAITER_BUTTON_INTRO_STORAGE_KEY) === "true";
        if (hasSeenIntro || prefersReducedMotion) {
          setWaiterButtonIntroState("ready");
          return;
        }
        window.localStorage.setItem(WAITER_BUTTON_INTRO_STORAGE_KEY, "true");
        setWaiterButtonIntroState("animate");
      } catch {
        setWaiterButtonIntroState(prefersReducedMotion ? "ready" : "animate");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFavoriteIds(favoriteIdsFromSessionCookie());
      setAreFavoritesReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!areFavoritesReady) return;
    document.cookie = `${FAVORITES_COOKIE}=${encodeURIComponent(favoriteIds.join(","))}; Path=/; SameSite=Lax`;
  }, [areFavoritesReady, favoriteIds]);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLanguageMenuOpen(false);
    };
    const closeWhenClickingOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !languageControlRef.current?.contains(target)) setIsLanguageMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeWhenClickingOutside);
    };
  }, [isLanguageMenuOpen]);

  useEffect(() => () => {
    transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => () => {
    favoriteRemovalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const clearCategoryTransitionTimers = () => {
    transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    transitionTimersRef.current = [];
  };

  const transitionToCategory = (nextCategoryId: string | null) => {
    if (nextCategoryId === categoryId) return;
    clearCategoryTransitionTimers();
    setIsCategoryTransitioning(true);
    const changeTimer = window.setTimeout(() => {
      setQuery("");
      setCategoryId(nextCategoryId);
      const revealTimer = window.setTimeout(() => setIsCategoryTransitioning(false), 180);
      transitionTimersRef.current = [revealTimer];
    }, 130);
    transitionTimersRef.current = [changeTimer];
  };

  const scrollToMenuTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  const scrollSelectedCategoryToLeadingEdge = (id: string) => {
    const scroller = categoryScrollerRef.current;
    const categoryButton = categoryButtonRefs.current.get(id);
    if (!scroller || !categoryButton) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const leadingPadding = Number.parseFloat(window.getComputedStyle(scroller).paddingLeft) || 0;
    scroller.scrollTo({
      left: Math.max(0, categoryButton.offsetLeft - leadingPadding),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const selectCategory = (id: string) => {
    setIsFavoritesView(false);
    scrollToMenuTop();
    scrollSelectedCategoryToLeadingEdge(id);
    transitionToCategory(id);
  };

  const returnToHome = () => {
    setIsFavoritesView(false);
    scrollToMenuTop();
    transitionToCategory(null);
  };

  const enterMenu = () => {
    setIsMenuFrontVisible(false);
    scrollToMenuTop();
  };

  const callWaiter = async () => {
    if (!plateCode || waiterCallState === "submitting" || waiterCallState === "pending") return;
    setWaiterCallState("submitting");
    try {
      const response = await fetch("/api/menu/waiter-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateCode }),
      });
      const result = await response.json() as { status?: "pending" };
      if (!response.ok || result.status !== "pending") throw new Error("No se pudo crear la solicitud.");
      setWaiterCallState("pending");
    } catch {
      setWaiterCallState("error");
    }
  };

  const toggleFavorite = (productId: string) => {
    if (isFavoritesView && favoriteIds.includes(productId)) {
      setRemovingFavoriteIds((current) => current.includes(productId) ? current : [...current, productId]);
      const removalTimer = window.setTimeout(() => {
        setFavoriteIds((current) => current.filter((id) => id !== productId));
        setRemovingFavoriteIds((current) => current.filter((id) => id !== productId));
        favoriteRemovalTimersRef.current = favoriteRemovalTimersRef.current.filter((timer) => timer !== removalTimer);
      }, 260);
      favoriteRemovalTimersRef.current = [...favoriteRemovalTimersRef.current, removalTimer];
      return;
    }
    setFavoriteIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  };

  const toggleFavoritesView = () => {
    setQuery("");
    setCategoryId(null);
    setIsFavoritesView((isViewingFavorites) => !isViewingFavorites);
    scrollToMenuTop();
  };

  const toggleSearch = () => {
    setIsSearchOpen((isOpen) => !isOpen);
    if (!isSearchOpen) {
      scrollToMenuTop();
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  const selectLanguage = (nextLanguage: TexasLanguage) => {
    setLanguage(nextLanguage);
    setIsLanguageMenuOpen(false);
    try {
      window.localStorage.setItem("tapixxo-texas-language", nextLanguage);
    } catch {}
  };

  const fallbackCategoryImage = (category: typeof menu.categories[number]) => CATEGORY_ART_BY_NAME[categoryAssetKey(category.name)] ?? menu.products.find((product) => product.categoryId === category.id && product.imageUrl)?.imageUrl ?? "/menu-assets/texas-promo-food.png";
  const bubbleImageForCategory = (category: typeof menu.categories[number]) => category.bubbleImageUrl ?? fallbackCategoryImage(category);
  const cardImageForCategory = (category: typeof menu.categories[number]) => category.cardImageUrl ?? category.bubbleImageUrl ?? fallbackCategoryImage(category);
  const promotionFlyers = useMemo<readonly TexasPromotionFlyer[]>(() => menu.banners.length ? menu.banners.map((banner) => {
    const localized = language === "es" ? undefined : banner.translations[language];
    return { id: banner.id, imageUrl: banner.imageUrl, eyebrow: localized?.eyebrow ?? banner.eyebrow, title: localized?.title ?? banner.title, description: localized?.description ?? banner.description, showOverlay: banner.showOverlay };
  }) : TEXAS_PROMOTION_FLYERS, [language, menu.banners]);

  return <>
  <main inert={isMenuFrontVisible || undefined} aria-hidden={isMenuFrontVisible || undefined} className={`${styles.page} ${usesParchment ? styles.parchmentPage : ""} ${usesMarineMosaic ? styles.marinePage : ""} ${usesPremiumTexture ? styles.premiumPage : ""} ${usesAdditionalTexture ? styles.additionalPage : ""}`}>
    <div aria-hidden="true" className={`${styles.categoryTransition} ${isCategoryTransitioning ? styles.categoryTransitionActive : ""}`} />
    <header ref={headerRef} className={styles.header}>
      <div className={styles.headerLeading}>
        {categoryId && <button type="button" className={styles.headerHomeButton} onClick={returnToHome}><span aria-hidden="true">←</span>{copy.home}</button>}
        <button type="button" className={`${styles.headerAction} ${isFavoritesView ? styles.headerFavoriteActive : ""}`} aria-label={copy.favoriteProducts} aria-pressed={isFavoritesView} onClick={toggleFavoritesView}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.85 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.07-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.85-8.84a5.5 5.5 0 0 0 0-7.78Z" /></svg>
          {favoriteIds.length > 0 && <span className={styles.favoriteCount}>{favoriteIds.length}</span>}
        </button>
      </div>
      <button type="button" className={styles.headerLogoButton} onClick={returnToHome} aria-label={copy.home}>
        <Image src="/menu-assets/texas-logo.png" alt="" width={1536} height={1024} preload sizes="(max-width: 640px) 88vw, 32rem" className={styles.headerLogo} />
      </button>
      <div className={styles.headerActions} aria-label={copy.tools}>
        <button type="button" className={styles.headerAction} aria-label={isSearchOpen ? copy.closeSearch : copy.search} aria-expanded={isSearchOpen} aria-controls="texas-menu-search" onClick={toggleSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 5 5" /></svg>
        </button>
        <div ref={languageControlRef} className={styles.languageControl}>
          <button type="button" className={styles.headerAction} aria-label={copy.language} title={copy.language} aria-expanded={isLanguageMenuOpen} aria-controls="texas-language-menu" onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.75h8a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H9l-3.5 3v-3H4.5a2 2 0 0 1-2-2v-5.5a2 2 0 0 1 2-2Z" /><path d="M8 7.75h2.25M9.1 7.75c0 2-1.1 3.6-2.6 4.5M7.1 10.4c.7.75 1.5 1.35 2.5 1.85" /><path d="M14.5 10.25h5a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H18.5v2.5L15 19.75h-.5a2 2 0 0 1-2-2v-3.5" /><path d="m16.1 16.6 1.45-3.4 1.45 3.4M16.65 15.35h1.8" /></svg>
          </button>
          {isLanguageMenuOpen && <div id="texas-language-menu" className={styles.languageMenu} role="menu" aria-label={copy.selectLanguage}>
            {availableLanguageOptions.map((option) => <button key={option.code} type="button" role="menuitemradio" aria-checked={language === option.code} className={language === option.code ? styles.languageOptionActive : ""} onClick={() => selectLanguage(option.code)}>{option.label}</button>)}
          </div>}
        </div>
      </div>
      <h1 className={styles.srOnly}>Texas Resto Bar</h1>
    </header>

    <div className={`${styles.searchWrap} ${isSearchOpen ? styles.searchOpen : styles.searchClosed}`}>
      <label className={styles.searchLabel} htmlFor="texas-menu-search">{copy.search}</label>
      <input ref={searchInputRef} id="texas-menu-search" type="search" value={query} tabIndex={isSearchOpen ? 0 : -1} onChange={(event) => { setCategoryId(null); setIsFavoritesView(false); setQuery(event.target.value); }} placeholder={copy.searchPlaceholder} className={styles.search} />
    </div>

    <nav className={styles.categoryNav} aria-label={copy.quickCategories}>
      <div ref={categoryScrollerRef} className={styles.categoryScroller}>
        {organizedCategories.map((category) => {
          const imageSource = bubbleImageForCategory(category);
          return <button ref={(element) => {
            if (element) categoryButtonRefs.current.set(category.id, element);
            else categoryButtonRefs.current.delete(category.id);
          }} key={category.id} type="button" onClick={() => selectCategory(category.id)} aria-pressed={categoryId === category.id} className={categoryId === category.id ? styles.categoryActive : ""}>
            <span className={styles.categoryImageFrame}>
              <span className={styles.categoryImageMask}>
                <Image src={imageSource} alt="" fill sizes="76px" className={styles.categoryImage} loading="eager" unoptimized={isRemoteImage(imageSource)} />
              </span>
            </span>
            <span>{localizedCategoryName(category, language)}</span>
          </button>;
        })}
      </div>
    </nav>

    {isHome ? <>
      <TexasPromotionCarousel flyers={promotionFlyers} autoplaySeconds={menu.bannerAutoplaySeconds} />
      <section className={styles.categoryGridSection} aria-label={copy.categories}>
        <div className={styles.categoryGrid}>
          {organizedCategories.map((category) => {
            const imageSource = cardImageForCategory(category);
            return <button type="button" key={category.id} onClick={() => selectCategory(category.id)} className={styles.categoryCard}>
              <span className={styles.categoryCardImage}>
                <Image src={imageSource} alt="" fill sizes="(max-width: 700px) 50vw, 18rem" className={styles.categoryImage} unoptimized={isRemoteImage(imageSource)} />
              </span>
              {language !== "es" && <><span className={styles.categoryCardShade} /><span className={styles.categoryCardLabel}>{localizedCategoryName(category, language)}</span></>}
              <span className={styles.categoryArrow} aria-hidden="true">→</span>
            </button>;
          })}
        </div>
      </section>
    </> : <section className={`${styles.menu} ${usesParchment ? styles.parchmentMenu : ""} ${usesMarineMosaic ? styles.marineMenu : ""} ${usesPremiumTexture ? styles.premiumMenu : ""} ${usesAdditionalTexture ? styles.additionalMenu : ""}`} aria-live="polite">
      {!categoryId && <div className={styles.resultsHeader}>
        <button type="button" className={styles.homeButton} onClick={returnToHome}>← {copy.home}</button>
        <p>{isFavoritesView ? copy.favorites : normalizedQuery ? `${copy.results} “${query.trim()}”` : selectedCategory && localizedCategoryName(selectedCategory, language)}</p>
      </div>}
      {visibleCategories.map((category) => <section key={category.id} className={styles.categorySection} aria-labelledby={`category-${category.id}`}>
        <div className={styles.ribbon}><span aria-hidden="true">★</span><h2 id={`category-${category.id}`}>{localizedCategoryName(category, language)}</h2><span aria-hidden="true">★</span></div>
        <div className={styles.productList}>{productsBySection(matchingProducts.filter((product) => product.categoryId === category.id)).map((group) => <div key={group.name ?? "products"} className={styles.productGroup}>
          {group.name && <h3 className={styles.productSubsection}>{localizedSectionName(group.products[0], language)}</h3>}
          {group.products.map((product) => <TexasProductRow key={product.id} product={product} language={language} showCurrency={menu.currencyEnabled} isFavorite={favoriteIds.includes(product.id)} isRemovingFromFavorites={removingFavoriteIds.includes(product.id)} onToggleFavorite={toggleFavorite} />)}
        </div>)}</div>
      </section>)}
      {!visibleCategories.length && <div className={styles.empty}><p>★</p><h2>{isFavoritesView ? copy.noFavorites : copy.noProducts}</h2><span>{copy.tryAnother}</span></div>}
    </section>}

    <footer className={styles.footer}>
      <Image src="/menu-assets/texas-bottom.png" alt="" width={2078} height={757} sizes="100vw" className={styles.footerArt} />
      <p className={styles.footerCredit}>{copy.menuBy}</p>
    </footer>

    {isScrollToTopVisible && <button type="button" className={styles.scrollToTopButton} onClick={scrollToMenuTop} aria-label={copy.scrollToTop} title={copy.scrollToTop}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 14 5.5-5.5 5.5 5.5M12 9v9" /></svg>
    </button>}
    {(isHeaderOutOfView || plateCode) && <div className={`${styles.floatingControls} ${isHeaderOutOfView ? styles.floatingControlsExpanded : ""}`}>
      {isHeaderOutOfView && <>
        <button type="button" className={styles.floatingAction} aria-label={isSearchOpen ? copy.closeSearch : copy.search} aria-expanded={isSearchOpen} aria-controls="texas-menu-search" onClick={toggleSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.75" /><path d="m15 15 5 5" /></svg>
        </button>
        <button type="button" className={styles.floatingAction} aria-label={copy.home} onClick={returnToHome}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 10.75 7.5-6.25 7.5 6.25v8.75h-15v-8.75Z" /><path d="M9.5 19.5v-5h5v5" /></svg>
        </button>
        <button type="button" className={`${styles.floatingAction} ${isFavoritesView ? styles.floatingFavoriteActive : ""}`} aria-label={copy.favoriteProducts} aria-pressed={isFavoritesView} onClick={toggleFavoritesView}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.85 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.07-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.85-8.84a5.5 5.5 0 0 0 0-7.78Z" /></svg>
          {favoriteIds.length > 0 && <span className={styles.favoriteCount}>{favoriteIds.length}</span>}
        </button>
      </>}
      {plateCode && <button type="button" className={`${styles.waiterButton} ${waiterButtonIntroState === "pending" ? styles.waiterButtonIntroPending : ""} ${waiterButtonIntroState === "animate" ? styles.waiterButtonIntro : ""} ${waiterCallState === "pending" ? styles.waiterButtonReady : ""} ${waiterCallState === "error" ? styles.waiterButtonError : ""}`} disabled={waiterCallState === "submitting" || waiterCallState === "pending"} onClick={callWaiter} aria-label={waiterCallState === "submitting" ? copy.openingWaiterWhatsApp : waiterCallState === "pending" ? copy.waiterRequestReady : copy.callWaiter}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5h16M6.5 18.5v-1.25a5.5 5.5 0 0 1 11 0v1.25M12 6.25v4M9.75 8.5h4.5M9 14.25h6" /><path d="M8.25 18.5v1.25M15.75 18.5v1.25" /></svg>
        <span>{waiterCallState === "submitting" ? copy.openingWaiterWhatsApp : waiterCallState === "pending" ? copy.waiterRequestReady : waiterCallState === "error" ? copy.waiterRequestError : copy.callWaiter}</span>
      </button>}
    </div>}
  </main>
  {isMenuFrontVisible && <TexasMultiLink onViewMenu={enterMenu} enabledLanguages={menu.enabledLanguages.filter(isTexasLanguage)} />}
  </>;
}
