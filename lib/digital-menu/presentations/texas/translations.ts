export const TEXAS_LANGUAGES = ["es", "en", "pt", "fr"] as const;

export type TexasLanguage = typeof TEXAS_LANGUAGES[number];

export const TEXAS_LANGUAGE_OPTIONS: ReadonlyArray<{ code: TexasLanguage; label: string }> = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
];

export const TEXAS_COPY: Record<TexasLanguage, Record<string, string>> = {
  es: { tools: "Herramientas del menú", search: "Buscar en el menú", closeSearch: "Cerrar búsqueda", searchPlaceholder: "Buscar en todo el menú…", quickCategories: "Categorías rápidas", choose: "Elige tu antojo", categories: "Nuestras categorías", home: "Inicio", results: "Resultados para", favorites: "Tus favoritos", favoriteProducts: "Ver favoritos", addFavorite: "Agregar a favoritos", removeFavorite: "Quitar de favoritos", noProducts: "No encontramos productos", noFavorites: "Aún no tienes favoritos", tryAnother: "Prueba con otro término o categoría.", language: "Cambiar idioma", selectLanguage: "Seleccionar idioma", callWaiter: "Llamar al mesero", openingWaiterWhatsApp: "Enviando solicitud…", waiterRequestReady: "Solicitud en proceso", waiterRequestError: "No se pudo avisar", scrollToTop: "Volver arriba", menuBy: "Menú digital por Tapixxo" },
  en: { tools: "Menu tools", search: "Search the menu", closeSearch: "Close search", searchPlaceholder: "Search the full menu…", quickCategories: "Quick categories", choose: "Choose your craving", categories: "Our categories", home: "Home", results: "Results for", favorites: "Your favorites", favoriteProducts: "View favorites", addFavorite: "Add to favorites", removeFavorite: "Remove from favorites", noProducts: "No products found", noFavorites: "You have no favorites yet", tryAnother: "Try a different term or category.", language: "Change language", selectLanguage: "Select language", callWaiter: "Call waiter", openingWaiterWhatsApp: "Sending request…", waiterRequestReady: "Request in progress", waiterRequestError: "Could not notify", scrollToTop: "Back to top", menuBy: "Digital menu by Tapixxo" },
  pt: { tools: "Ferramentas do cardápio", search: "Buscar no cardápio", closeSearch: "Fechar busca", searchPlaceholder: "Buscar em todo o cardápio…", quickCategories: "Categorias rápidas", choose: "Escolha sua vontade", categories: "Nossas categorias", home: "Início", results: "Resultados para", favorites: "Seus favoritos", favoriteProducts: "Ver favoritos", addFavorite: "Adicionar aos favoritos", removeFavorite: "Remover dos favoritos", noProducts: "Não encontramos produtos", noFavorites: "Você ainda não tem favoritos", tryAnother: "Tente outro termo ou categoria.", language: "Mudar idioma", selectLanguage: "Selecionar idioma", callWaiter: "Chamar garçom", openingWaiterWhatsApp: "Enviando solicitação…", waiterRequestReady: "Solicitação em andamento", waiterRequestError: "Não foi possível avisar", scrollToTop: "Voltar ao topo", menuBy: "Cardápio digital por Tapixxo" },
  fr: { tools: "Outils du menu", search: "Rechercher dans le menu", closeSearch: "Fermer la recherche", searchPlaceholder: "Rechercher dans tout le menu…", quickCategories: "Catégories rapides", choose: "Choisissez votre envie", categories: "Nos catégories", home: "Accueil", results: "Résultats pour", favorites: "Vos favoris", favoriteProducts: "Voir les favoris", addFavorite: "Ajouter aux favoris", removeFavorite: "Retirer des favoris", noProducts: "Aucun produit trouvé", noFavorites: "Vous n'avez pas encore de favoris", tryAnother: "Essayez un autre terme ou une autre catégorie.", language: "Changer de langue", selectLanguage: "Sélectionner la langue", callWaiter: "Appeler le serveur", openingWaiterWhatsApp: "Envoi de la demande…", waiterRequestReady: "Demande en cours", waiterRequestError: "Impossible de prévenir", scrollToTop: "Retour en haut", menuBy: "Menu numérique par Tapixxo" },
};

const CATEGORY_TRANSLATIONS: Record<string, Record<TexasLanguage, string>> = {
  "ceviches-y-entradas": { es: "Ceviches & Entradas", en: "Ceviches & Starters", pt: "Ceviches & Entradas", fr: "Ceviches & Entrées" },
  arroces: { es: "Arroces", en: "Rice dishes", pt: "Arrozes", fr: "Riz" },
  postres: { es: "Postres", en: "Desserts", pt: "Sobremesas", fr: "Desserts" },
  "cervezas-y-cubetazos": { es: "Cervezas & Cubetazos", en: "Beers & Buckets", pt: "Cervejas & Baldes", fr: "Bières & Seaux" },
  bebidas: { es: "Bebidas", en: "Drinks", pt: "Bebidas", fr: "Boissons" },
  "premium-angus": { es: "Premium Angus", en: "Premium Angus", pt: "Premium Angus", fr: "Premium Angus" },
  parrilla: { es: "Parrilla", en: "Grill", pt: "Grelhados", fr: "Grillades" },
  "pescados-y-mariscos": { es: "Pescados & Mariscos", en: "Fish & Seafood", pt: "Peixes & Frutos do Mar", fr: "Poissons & Fruits de mer" },
  pastas: { es: "Pastas", en: "Pasta", pt: "Massas", fr: "Pâtes" },
  burgers: { es: "Burgers", en: "Burgers", pt: "Hambúrgueres", fr: "Burgers" },
  infantil: { es: "Infantil", en: "Kids' Menu", pt: "Menu Infantil", fr: "Menu Enfants" },
  adicionales: { es: "Adicionales", en: "Sides", pt: "Adicionais", fr: "Suppléments" },
  "cocteles-y-margaritas": { es: "Cócteles & Margaritas", en: "Cocktails & Margaritas", pt: "Coquetéis & Margaritas", fr: "Cocktails & Margaritas" },
  licores: { es: "Licores", en: "Spirits", pt: "Destilados", fr: "Spiritueux" },
  vinos: { es: "Vinos", en: "Wines", pt: "Vinhos", fr: "Vins" },
};

function categoryKey(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/&/g, "y").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function translateTexasCategory(name: string, language: TexasLanguage) {
  return CATEGORY_TRANSLATIONS[categoryKey(name)]?.[language] ?? name;
}

export function detectTexasLanguage(locales: readonly string[]): TexasLanguage {
  const locale = locales.find((value) => TEXAS_LANGUAGES.includes(value.slice(0, 2).toLocaleLowerCase() as TexasLanguage));
  const code = locale?.slice(0, 2).toLocaleLowerCase();
  return TEXAS_LANGUAGES.includes(code as TexasLanguage) ? code as TexasLanguage : "es";
}

export function isTexasLanguage(value: string | null): value is TexasLanguage {
  return Boolean(value && TEXAS_LANGUAGES.includes(value as TexasLanguage));
}
