const foodFallback = "/menu-assets/texas-products/comida-stand.png";
const beverageFallback = "/menu-assets/texas-products/background-bebidas.png";
const seafoodFallback = "/menu-assets/texas-products/pescados-mariscos-stand.png";

const exactImages = new Map([
  ["Alitas Texanas", "/menu-assets/texas-products/ceviches/alitas.png"],
  ["Ceviche Cremoso", "/menu-assets/texas-products/ceviches/ceviche%20cremoso.png"],
  ["Ceviche de Chicharrón", "/menu-assets/texas-products/ceviches/ceviche%20de%20chch.png"],
  ["Ceviche Texano", "/menu-assets/texas-products/ceviches/ceviche%20texano.png"],
  ["Croquetas de Pescado", "/menu-assets/texas-products/ceviches/croquetas.png"],
  ["Nachos Texanos", "/menu-assets/texas-products/ceviches/nachos%20texanos.png"],
  ["Nidos de Plátano", "/menu-assets/texas-products/ceviches/nidos%20de%20platano.png"],
  ["Cerveza Budweiser", "/menu-assets/texas-products/cervezas/budweiser_tx.png"],
  ["Cerveza Club Colombia", "/menu-assets/texas-products/cervezas/club%20colombia_tx.png"],
  ["Cerveza Corona", "/menu-assets/texas-products/cervezas/corona_tx.png"],
  ["Cerveza Heineken", "/menu-assets/texas-products/cervezas/heineken_tx.png"],
  ["Cerveza Sol", "/menu-assets/texas-products/cervezas/sol_tx.png"],
  ["Cerveza Stella Artois", "/menu-assets/texas-products/cervezas/stella_tx.png"],
  ["Cubetazo Cerveza Budweiser (6 Und)", "/menu-assets/texas-products/cervezas/Cubetazo%20budweiser.png"],
  ["Cubetazo Cerveza Club Colombia (6 Und)", "/menu-assets/texas-products/cervezas/Cubetazo%20club.png"],
  ["Cubetazo Cerveza Heineken (6 Und)", "/menu-assets/texas-products/cervezas/Cubetazo%20heineken.png"],
]);

function imageForProduct(product, categoryName) {
  return exactImages.get(product.name)
    ?? (categoryName === "Pescados & Mariscos" ? seafoodFallback : null)
    ?? (categoryName === "Bebidas" || categoryName === "Cervezas & Cubetazos" ? beverageFallback : foodFallback);
}

async function main() {
  const nextEnvModule = await import("@next/env");
  const supabaseModule = await import("@supabase/supabase-js");
  const { loadEnvConfig } = nextEnvModule.default ?? nextEnvModule;
  const { createClient } = supabaseModule.default ?? supabaseModule;
  loadEnvConfig(process.cwd());
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: menu, error: menuError } = await client.from("digital_menus").select("id").eq("slug", "texasrestobar").single();
  if (menuError) throw menuError;

  const [{ data: categories, error: categoriesError }, { data: products, error: productsError }] = await Promise.all([
    client.from("menu_categories").select("id, name").eq("menu_id", menu.id),
    client.from("menu_products").select("id, name, category_id, image_url").eq("menu_id", menu.id),
  ]);
  if (categoriesError) throw categoriesError;
  if (productsError) throw productsError;

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const pending = products.filter((product) => !product.image_url || categoryNames.get(product.category_id) === "Pescados & Mariscos");

  for (const product of pending) {
    const imageUrl = imageForProduct(product, categoryNames.get(product.category_id) ?? "");
    const { error } = await client.from("menu_products").update({ image_url: imageUrl }).eq("id", product.id).eq("menu_id", menu.id);
    if (error) throw error;
  }

  console.log(JSON.stringify({ assigned: pending.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
