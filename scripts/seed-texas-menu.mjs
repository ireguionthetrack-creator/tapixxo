import { readFile } from "node:fs/promises";

const legacyCategories = [
  ["Ceviches & Entradas", [["Ceviche de Chicharrón", 32000, "Deliciosos trocitos de chicharrones de cerdo en una cama de aguacate y frescos vegetales, acompañados con chips de patacón."], ["Ceviche Texano", 32000, "Deliciosa combinación de pescado, calamares, camarones y palmito cubiertos en leche de tigre, acompañados con chips de nachos."], ["Ceviche Cremoso", 32000, "Exquisita combinación de cubos de pescado, camarones, calamares, palmito y mango. Bañados en cremosa salsa leche de tigre, acompañados con chips de nachos."], ["Nidos de Plátano", 18000, "Ricas canastas de plátano, rellenas de hogao y queso costeño."], ["Croquetas de Pescado", 24000, "Ricas croquetas apanadas de carne de pescado con salsa Sweet Chili."], ["Chicharrones Ahumados", 28000, "Jugositos chicharrones de cerdo ahumados a la parrilla acompañados de papa criolla."], ["Alitas Texanas", 28000, "6 deliciosas alitas enteras en nuestra exquisita y original salsa BBQ."], ["Nachos Houston", 30000, "Deliciosos nachos con cremosa carne de cangrejo, guacamole, pico de gallo y queso cheddar."], ["Nachos Texanos", 29000, "Deliciosos nachos con exquisita carne molida, queso mozzarella, guacamole, pico de gallo y queso cheddar."], ["Chicharrones de Salmón", 29000, "Sabrosos trocitos de salmón dorado, en deliciosa cama de guacamole de la casa."], ["Chorizos Argentinos Ahumados", 30000, "Jugositos chorizos a la parrilla acompañados de papa criolla."], ["Bombones de Langostinos", 29000, "Crocantes langostinos apanados en salsa de durazno, sobre puré de papa criolla."], ["Tacos Texanos Mixtos", 39000, "Dos tacos de carne y dos tacos de pechugas marinados en salsa BBQ, con cebolla, cilantro y guacamole."]]],
  ["Arroces", [["Texano", 39000, "Arroz con cerdo, lomo de res, pechuga de pollo y jamón york con variedad de vegetales."], ["Cremoso de Camarón", 42000, "Exquisita preparación cremosa de arroz con camarones."], ["Frito de Mariscos", 43000, "Rico arroz al wok con camarones, calamares, langostinos y vegetales."], ["Cremoso de Mariscos", 44000, "Sabrosa preparación cremosa de arroz de coco y langostinos, calamares y camarones."]]],
  ["Postres", [["Chocomani", 13000], ["Cheesecake", 13000], ["Torta de Zanahoria", 17000]]],
  ["Cervezas & Cubetazos", [["Cerveza Budweiser", 10000], ["Cerveza Heineken", 13800], ["Cerveza Sol", 13800], ["Cerveza Club Colombia", 13800], ["Cerveza Corona", 17000], ["Cerveza Stella Artois", 17000], ["Cubetazo Cerveza Budweiser (6 Und)", 50000], ["Cubetazo Cerveza Club Colombia (6 Und)", 69000], ["Cubetazo Cerveza Heineken (6 Und)", 69000]]],
  ["Bebidas", [["Soda Bretaña Saborizada de Maracuyá", 13000], ["Soda Bretaña Saborizada de Frutos Rojos", 13000], ["Soda Bretaña Saborizada de Kiwi", 13000], ["Té Hatsu", 13000], ["Jugos Naturales", 9000], ["Limonada de Panela", 9000], ["Limonada Natural", 9000], ["Limonada de Coco", 14000], ["Limonada Cerezada", 13000], ["Limonada Hierbabuena", 12000], ["Agua con Gas o sin Gas Hatsu", 7500], ["Soda Bretaña", 7500], ["Gaseosas Postobón", 7500], ["Ginger - Tonica Canada Dry", 7500], ["Red Bull Energy", 20000], ["Red Bull Sugarfree", 20000], ["Red Bull Edition", 20000]]],
  ["Premium Angus", [["Picanha Angus", 99000, "Jugoso corte de carne Certified Angus Beef de 300g que se caracteriza por su textura, potencia en sabor y grasa infiltrada, acompañada de papas criollas."], ["Rib Eye Steak", 99000, "Tierno filete Angus de 300g de la costilla de la res asado a la parrilla, acompañados de papas criollas."], ["New York Steak", 130000, "Jugoso corte grueso de res Certified Angus Beef de 300g asado acompañado de papas criollas."]]],
  ["Parrilla", [["Churrasco Asado", 46000, "Jugoso corte mariposa de 300g de lomo ancho asado, acompañado de papas criollas."], ["Punta Gorda", 46000, "Perfecto corte de 300g de punta de anca a la parrilla acompañada de papas criollas."], ["Bife de Chorizo", 50000, "Jugoso corte grueso de 300g de lomo ancho asado, acompañado de papas criollas."], ["Baby Beef", 59000, "300g de un tierno corte de lomo fino parrillado acompañado de papas criollas."], ["Bondiola Ahumada", 40000, "Delicioso corte de bondiola de cerdo asado ahumado de 300g bañado en salsa de la casa, acompañado de papas criollas."], ["Filete de Pechuga", 40000, "Jugoso filete de pechuga de pollo de 300g asado a la parrilla con papas criollas."], ["Lomo de Cerdo", 40000, "Jugoso corte de lomo de cerdo asado de 300g acompañado de papas criollas."], ["Lomo Vaquero", 49000, "300g de tierno corte de filete a la parrilla del famoso asado del carnicero acompañado de papas criollas."], ["T-Bone Steak", 99000, "Jugoso corte típico de 600g en el que puede verse el hueso en forma de T, que divide el solomillo y el entrecot acompañado de papas criollas."], ["Tomahawk de Cerdo", 49000, "Primoroso corte de chuleta de cerdo con costilla de 350g, perfecta a la parrilla acompañada de papas criollas."], ["Parrillada Dallas", 73000, "Cortes de costilla de cerdo BBQ, filete de pechuga de pollo, lomo de cerdo y chorizo asado con papas criollas."], ["Lomo a la Pimienta", 49000, "Deliciosos medallones de lomo fino, bañados en una salsa de pimienta, acompañados de un tierno puré de papa criolla."], ["Lomo Balsámico", 49000, "Deliciosos medallones de lomo fino, bañados en vino tinto y reducción balsámica, acompañados de un tierno puré de papa criolla."], ["Lomo Texano", 49000, "Delicado corte de lomo fino parrillado, con queso mozzarella, albahaca y aceite de oliva, acompañado de papas criollas."], ["Lomo San Antonio", 49000, "Medallones de lomo fino bañados con salsa chimichurri, en una cama de arroz cremoso con tocineta y champiñones."], ["Pechuga en Salsa de Champiñones", 43000, "Exquisita pechuga de pollo en salsa de champiñones, acompañada de puré de papa criolla."], ["Costillas de Cerdo", 60000, "Jugosas costillas de cerdo de 400g en nuestra original salsa BBQ con papas criollas."], ["Ensalada Texas", 33000, "Deliciosa combinación de lechuga, tomate deshidratado, tocinetas, queso parmesano y pechuga de pollo acompañado de vinagreta de la casa."]]],
  ["Pescados & Mariscos", [["Sierra en Zumo de Coco", 40000, "Deliciosa posta de sierra en salsa de coco de la casa, acompañados de patacones, arroz con coco y ensalada verde."], ["Róbalo Plancha", 43000, "Fresco filete de róbalo sobre una cama de arroz con coco cremoso."], ["Róbalo Texano", 55000, "Filete de róbalo bañado en una exquisita salsa de camarones y calamar, sobre una cama de arroz con coco cremoso."], ["Róbalo Caribe", 65000, "Róbalo entero de 500g bañado en exquisita salsa de la casa de camarón y calamar, acompañado de arroz y ensalada."], ["Salmón Parrillero", 50000, "Fresco salmón asado a la parrilla sobre una delicada cama de puré de papa criolla."], ["Salmón en Salsa de Durazno", 52000, "Filete de salmón bañado en deliciosa salsa de durazno, en una suave cama de puré de papa criolla."], ["Pargo a la Criolla", 88000, "Pargo entero de 500g bañado en exquisita salsa criolla de la casa, acompañado de arroz y ensalada."], ["Langostinos al Fuego", 55000, "Deliciosos langostinos en exquisita salsa al ajillo con un toque picante en una cama de puré de papa."], ["Camarones Texas", 44000, "Deliciosos camarones bañados en salsa de quesos en una suave cama de puré de papa criolla."], ["Mojarra Roja Frita", 44000, "Crujiente mojarra roja entera frita, acompañada de patacones, arroz con coco y ensalada."]]],
  ["Pastas", [["Vegetarianas", 36000, "Deliciosa incorporación de champiñones, calabacín, pimentón y cebolla."], ["Pollo y Tocinetas a la Pasta", 45000, "Deliciosos trocitos de pollo y tocinetas en exquisita salsa blanca en una cama de pasta."], ["Pastas Fileto Betina", 49000, "Deliciosa combinación de pastas con lomito de res, cremoso ragú de tomate."], ["Del Mar", 53000, "Ricas pastas en única salsa de camarones, calamares y langostinos."], ["Texanas", 52000, "Ricas pastas con frescos camarones bañados en salsa de quesos."], ["Camarones Trufados y Pasta", 64000, "Ricas pastas con camarones bañados en exótica salsa de trufa."]]],
  ["Burgers", [["Texas", 49000, "125g de Certified Angus Beef, pan brioche, queso mozzarella, chorizo y tocinetas acompañada de papas fritas."], ["Laredo", 37000, "125g de Certified Angus Beef, pan brioche, queso mozzarella y tocinetas, acompañada de papas fritas en nuestra original salsa de maíz."], ["Costeña", 38000, "125g de Certified Angus Beef, pan brioche, queso costeño, suero y tocinetas, acompañada de papas fritas."], ["Cheddar", 39000, "125g de Certified Angus Beef, pan brioche, queso mozzarella y tocinetas, bañadas de salsa cheddar acompañada de papas fritas."], ["Chicken", 31000, "Deliciosa hamburguesa de pechuga de pollo apanada al panko, queso mozzarella, verduras y pan brioche, acompañada de papas fritas."]]],
  ["Infantil", [["Menú Infantil", 27000, "Láminas de pechuga de pollo asada con papitas y gaseosa."]]],
  ["Adicionales", [["Porción de Papa Criolla", 4800], ["Porción de Puré de Papa Criolla", 5800], ["Porción de ensalada Coleslaw", 5800], ["Porción de Arroz con Coco", 4800], ["Porción de Arroz con Coco Cremoso", 7000], ["Porción de Patacones", 7000], ["Papas Fritas", 7000], ["Porción de Suero", 4800], ["Adicional de Camarón (100g)", 12000]]],
];

const beverageFallback = "/menu-assets/texas-products/background-bebidas.png";
const withPriceOptions = (name, sectionName, priceOptions) => ({ name, sectionName, price: priceOptions[0].price, priceOptions, imageUrl: beverageFallback });
const product = (name, price, description, sectionName) => ({ name, price, description, sectionName, imageUrl: beverageFallback, priceOptions: [] });
const priceOptions = (...options) => options.map(([label, price]) => ({ label, price }));
const categories = legacyCategories.map(([name, products]) => ({
  name,
  products: products.map(([productName, price, description]) => ({ name: productName, price, description: description ?? null, sectionName: null, priceOptions: [], imageUrl: null })),
}));

categories.push(
  {
    name: "Cócteles & Margaritas",
    products: [
      product("Cóctel Texas Tea", 22000, "Vodka, tequila, ginebra, ron, whisky, triple sec, limón, top de soda.", "Cócteles Clásicos Texas"),
      product("Gin Basil Smash", 22000, "Gin, albahaca, Sweet & Sour.", "Cócteles Clásicos Texas"),
      product("Bramble", 22000, "Gin, coulis de frutos rojos, Sweet & Sour.", "Cócteles Clásicos Texas"),
      product("Medicina Latina", 22000, "Tequila, ginger syrup, Sweet & Sour.", "Cócteles Clásicos Texas"),
      product("Moscow Mule", 22000, "Vodka, Sweet & Sour, top de soda.", "Cócteles Clásicos Texas"),
      product("Gin Tonic", 22000, "Gin, agua tónica.", "Cócteles Clásicos Texas"),
      product("Caipirinha", 22000, "Aguardiente, syrup, cascos de limón.", "Cócteles Clásicos Texas"),
      product("Caipiroska", 22000, "Vodka, syrup de panela especiada, cascos de limón.", "Cócteles Clásicos Texas"),
      product("Mojito Tradicional", 22000, "Ron oscuro, hierbabuena, Sweet & Sour.", "Cócteles Clásicos Texas"),
      product("Cuba Libre", 22000, "Ron oscuro, gaseosa negra, Sweet & Sour.", "Cócteles Clásicos Texas"),
      product("Passion Cooler (SIN ALCOHOL)", 22000, "Syrup de maracuyá, Sweet & Sour, top de soda.", "Cócteles Clásicos Texas"),
      product("Margarita Clásico", 22000, "Tequila, triple sec, Sour.", "Texas Margaritas"),
      product("Spicy Margarita", 22000, "Tequila, triple sec, Sour, jalapeño.", "Texas Margaritas"),
      product("Sangre de Toro", 22000, "Tequila infusión de jamaica, triple sec, Sweet & Sour, Tajín.", "Texas Margaritas"),
      product("Coconut Rita", 22000, "Tequila infusión de coco, triple sec, Sour, coco deshidratado.", "Texas Margaritas"),
      product("Margarita de Maracuyá", 22000, "Tequila reposado, extracto de maracuyá, triple sec, Sweet & Sour.", "Texas Margaritas"),
      product("Margarita Frutos Rojos", 22000, "Tequila, coulis de frutos rojos, triple sec, Sour.", "Texas Margaritas"),
      product("Blue Pacific Margarita", 22000, "Tequila, Blue Curaçao, triple sec, Sour.", "Texas Margaritas"),
    ],
  },
  {
    name: "Licores",
    products: [
      withPriceOptions("Buchanan's 18 años", "Whisky", priceOptions(["Trago", 42000], ["Botella", 650000])),
      withPriceOptions("Old Parr 12 años", "Whisky", priceOptions(["Trago", 20000], ["Media", 210000], ["Botella", 320000])),
      withPriceOptions("JW Sello Negro", "Whisky", priceOptions(["Trago", 20000], ["Media", 210000], ["Botella", 320000])),
      withPriceOptions("Buchanan's 12 años", "Whisky", priceOptions(["Trago", 20000], ["Media", 210000], ["Botella", 320000])),
      withPriceOptions("Buchanan's Master", "Whisky", priceOptions(["Trago", 26000], ["Botella", 420000])),
      withPriceOptions("Jack Daniels", "Whisky", priceOptions(["Trago", 18000], ["Botella", 285000])),
      withPriceOptions("JW Sello Rojo", "Whisky", priceOptions(["Trago", 12000], ["Botella", 165000])),
      withPriceOptions("Tanqueray London", "Ginebras", priceOptions(["Trago", 18000], ["Botella", 275000])),
      withPriceOptions("Hendricks", "Ginebras", priceOptions(["Trago", 33000], ["Botella", 530000])),
      withPriceOptions("Gordons London", "Ginebras", priceOptions(["Trago", 12000], ["Botella", 165000])),
      withPriceOptions("Absolut", "Vodka", priceOptions(["Trago", 12000], ["Botella", 180000])),
      withPriceOptions("Smirnoff", "Vodka", priceOptions(["Trago", 12000], ["Botella", 180000])),
      withPriceOptions("Grey Goose", "Vodka", priceOptions(["Trago", 28000], ["Botella", 440000])),
      withPriceOptions("Patrón Reposado", "Tequilas", priceOptions(["Trago", 37000], ["Botella", 590000])),
      withPriceOptions("Patrón Silver", "Tequilas", priceOptions(["Trago", 32000], ["Botella", 510000])),
      withPriceOptions("Don Julio Blanco", "Tequilas", priceOptions(["Trago", 37000], ["Botella", 590000])),
      withPriceOptions("Don Julio Reposado", "Tequilas", priceOptions(["Trago", 42000], ["Botella", 670000])),
      withPriceOptions("Don Julio Añejo", "Tequilas", priceOptions(["Trago", 45000], ["Botella", 700000])),
      withPriceOptions("1800 Reposado", "Tequilas", priceOptions(["Trago", 28000], ["Botella", 440000])),
      withPriceOptions("José Cuervo Silver - Reposado", "Tequilas", priceOptions(["Trago", 19000], ["Media", 130000], ["Botella", 280000])),
      withPriceOptions("Mezcal Montelobos", "Tequilas", priceOptions(["Trago", 30000], ["Botella", 430000])),
      withPriceOptions("Ron Dictador 12 años", "Rones y Aguardientes", priceOptions(["Trago", 36000], ["Botella", 580000])),
      withPriceOptions("Ron Dictador 20 años", "Rones y Aguardientes", priceOptions(["Trago", 46000], ["Botella", 730000])),
      withPriceOptions("Ron Hechicera", "Rones y Aguardientes", priceOptions(["Trago", 30000], ["Botella", 480000])),
      withPriceOptions("Zacapa Ámbar", "Rones y Aguardientes", priceOptions(["Trago", 17000], ["Botella", 220000])),
      withPriceOptions("Ron Medellín 12 años", "Rones y Aguardientes", priceOptions(["Trago", 16000], ["Botella", 210000])),
      withPriceOptions("Ron Medellín 8 años", "Rones y Aguardientes", priceOptions(["Trago", 12000], ["Botella", 175000])),
      withPriceOptions("Ron Medellín 3 años", "Rones y Aguardientes", priceOptions(["Trago", 9000], ["Botella", 130000])),
      withPriceOptions("Aguardiente Antioqueño", "Rones y Aguardientes", priceOptions(["Trago", 9000], ["Botella", 130000])),
    ],
  },
  {
    name: "Vinos",
    products: [
      product("Vino Il Pumo, Italia", 100000, "Vino Tinto Il Pumo Negroamaro Salento, Malvasia Sauvignon Salento y Rosato.", null),
      product("Vino Espumante Cinzano Secco", 120000, null, null),
      product("Casillero del Diablo, Chile", 170000, "Cabernet Sauvignon y Chardonnay.", null),
      product("Vino Torres Sangre de Toro Tempranillo", 150000, null, null),
      product("Sangría Texas", 85000, "Refrescante combinación de vino de la casa tinto o vino blanco, vino rosé y frutas.", null),
    ],
  },
);

function getConfig(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^["']|["']$/g, "")]] : [];
  }));
}

const config = getConfig(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const baseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = config.SUPABASE_SECRET_KEY ?? config.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceKey) throw new Error("Falta la configuración administrativa de Supabase.");

async function rest(path, options = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const [menu] = await rest("digital_menus?slug=eq.texasrestobar&select=id,status");
if (!menu) throw new Error("No existe el menú texasrestobar; no se importó ningún dato.");

await rest(`digital_menus?id=eq.${menu.id}`, { method: "PATCH", body: JSON.stringify({ status: "published" }) });
const existingCategories = await rest(`menu_categories?menu_id=eq.${menu.id}&select=id,name`);
const categoryIds = new Map(existingCategories.map((category) => [category.name, category.id]));

for (const category of categories) {
  let categoryId = categoryIds.get(category.name);
  if (!categoryId) {
    const [created] = await rest("menu_categories?select=id,name", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ menu_id: menu.id, name: category.name, sort_order: categories.findIndex((item) => item.name === category.name), is_active: true }),
    });
    categoryId = created.id;
    categoryIds.set(category.name, categoryId);
  }
}

const existingProducts = await rest(`menu_products?menu_id=eq.${menu.id}&select=id,category_id,name`);
const productKeys = new Set(existingProducts.map((product) => `${product.category_id}:${product.name}`));
const newProducts = categories.flatMap((category, categoryOrder) => category.products.flatMap((product, sortOrder) => {
  const categoryId = categoryIds.get(category.name);
  const key = `${categoryId}:${product.name}`;
  if (productKeys.has(key)) return [];
  return [{ menu_id: menu.id, category_id: categoryId, name: product.name, description: product.description ?? null, section_name: product.sectionName ?? null, price: product.price, price_options: product.priceOptions, currency_code: "COP", image_url: product.imageUrl ?? null, available: true, sort_order: categoryOrder * 100 + sortOrder }];
}));

if (newProducts.length) {
  await rest("menu_products", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(newProducts) });
}

console.log(JSON.stringify({ menu: "texasrestobar", categories: categories.length, insertedProducts: newProducts.length, status: "published" }));
