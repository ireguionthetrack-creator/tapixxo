import type { TexasProduct } from "./types";
import type { TexasLanguage } from "./translations";

type LocalizedText = { name: string; description: string | null };
type TranslationEntry = Record<Exclude<TexasLanguage, "es">, LocalizedText>;

// Local, curated catalogue copy: no API, key, or translation quota is involved.
const PRODUCT_TRANSLATIONS: Record<string, TranslationEntry> = {
  "Ceviche de Chicharrón": {
    en: { name: "Pork Crackling Ceviche", description: "Delicious pork crackling bites on a bed of avocado and fresh vegetables, served with plantain chips." },
    pt: { name: "Ceviche de Torresmo", description: "Deliciosos pedaços de torresmo sobre uma cama de abacate e vegetais frescos, acompanhados de chips de banana-da-terra." },
    fr: { name: "Ceviche de Couenne de Porc", description: "Délicieux morceaux de couenne de porc sur un lit d'avocat et de légumes frais, accompagnés de chips de plantain." },
  },
  "Ceviche Texano": {
    en: { name: "Texas Ceviche", description: "A delicious mix of fish, squid, shrimp and hearts of palm in tiger's milk, served with nacho chips." },
    pt: { name: "Ceviche Texano", description: "Deliciosa combinação de peixe, lula, camarão e palmito em leite de tigre, acompanhada de chips de nacho." },
    fr: { name: "Ceviche Texan", description: "Délicieuse combinaison de poisson, calamars, crevettes et cœurs de palmier au lait de tigre, accompagnée de chips de nachos." },
  },
  "Ceviche Cremoso": {
    en: { name: "Creamy Ceviche", description: "An exquisite mix of fish cubes, shrimp, squid, hearts of palm and mango in creamy tiger's milk, served with nacho chips." },
    pt: { name: "Ceviche Cremoso", description: "Uma requintada combinação de cubos de peixe, camarão, lula, palmito e manga em cremoso leite de tigre, acompanhada de chips de nacho." },
    fr: { name: "Ceviche Crémeux", description: "Exquise combinaison de dés de poisson, crevettes, calamars, cœurs de palmier et mangue dans un lait de tigre crémeux, accompagnée de chips de nachos." },
  },
  "Nidos de Plátano": {
    en: { name: "Plantain Nests", description: "Tasty plantain baskets filled with hogao sauce and coastal cheese." },
    pt: { name: "Ninhos de Banana-da-terra", description: "Saborosas cestinhas de banana-da-terra recheadas com molho hogao e queijo costeiro." },
    fr: { name: "Nids de Plantain", description: "Savoureuses corbeilles de plantain garnies de sauce hogao et de fromage côtier." },
  },
  "Croquetas de Pescado": {
    en: { name: "Fish Croquettes", description: "Tasty breaded fish croquettes with sweet chili sauce." },
    pt: { name: "Croquetes de Peixe", description: "Saborosos croquetes de peixe empanados com molho sweet chili." },
    fr: { name: "Croquettes de Poisson", description: "Savoureuses croquettes de poisson panées, sauce sweet chili." },
  },
  "Chicharrones Ahumados": {
    en: { name: "Smoked Pork Crackling", description: "Juicy grilled smoked pork crackling served with Colombian creole potatoes." },
    pt: { name: "Torresmo Defumado", description: "Suculento torresmo defumado na grelha acompanhado de batatas crioulas." },
    fr: { name: "Couenne Fumée", description: "Savoureuse couenne de porc fumée au gril, accompagnée de pommes de terre créoles." },
  },
  "Alitas Texanas": {
    en: { name: "Texas Wings", description: "Six delicious whole wings in our signature BBQ sauce." },
    pt: { name: "Asinhas Texanas", description: "Seis deliciosas asinhas inteiras em nosso molho BBQ da casa." },
    fr: { name: "Ailes Texanes", description: "Six délicieuses ailes entières dans notre sauce BBQ signature." },
  },
  "Nachos Houston": {
    en: { name: "Houston Nachos", description: "Delicious nachos with creamy crab meat, guacamole, pico de gallo and cheddar cheese." },
    pt: { name: "Nachos Houston", description: "Deliciosos nachos com carne de caranguejo cremosa, guacamole, pico de gallo e queijo cheddar." },
    fr: { name: "Nachos Houston", description: "Délicieux nachos avec chair de crabe crémeuse, guacamole, pico de gallo et cheddar." },
  },
  "Nachos Texanos": {
    en: { name: "Texas Nachos", description: "Delicious nachos with seasoned ground beef, mozzarella, guacamole, pico de gallo and cheddar cheese." },
    pt: { name: "Nachos Texanos", description: "Deliciosos nachos com carne moída temperada, muçarela, guacamole, pico de gallo e queijo cheddar." },
    fr: { name: "Nachos Texans", description: "Délicieux nachos avec bœuf haché assaisonné, mozzarella, guacamole, pico de gallo et cheddar." },
  },
  "Chicharrones de Salmón": {
    en: { name: "Salmon Crackling", description: "Tasty golden salmon bites on a delicious bed of house guacamole." },
    pt: { name: "Torresmo de Salmão", description: "Saborosos pedaços de salmão dourado sobre uma deliciosa cama de guacamole da casa." },
    fr: { name: "Croustillants de Saumon", description: "Savoureux morceaux de saumon doré sur un délicieux lit de guacamole maison." },
  },
  "Chorizos Argentinos Ahumados": {
    en: { name: "Smoked Argentine Sausages", description: "Juicy grilled Argentine sausages served with Colombian creole potatoes." },
    pt: { name: "Linguiças Argentinas Defumadas", description: "Suculentas linguiças argentinas grelhadas acompanhadas de batatas crioulas." },
    fr: { name: "Saucisses Argentines Fumées", description: "Savoureuses saucisses argentines grillées, accompagnées de pommes de terre créoles." },
  },
  "Bombones de Langostinos": {
    en: { name: "Prawn Bonbons", description: "Crispy breaded prawns in peach sauce, served over creole potato purée." },
    pt: { name: "Bombons de Lagostins", description: "Lagostins empanados crocantes em molho de pêssego, sobre purê de batata crioula." },
    fr: { name: "Bonbons de Langoustines", description: "Langoustines panées croustillantes en sauce pêche, sur une purée de pommes de terre créoles." },
  },
  "Tacos Texanos Mixtos": {
    en: { name: "Mixed Texas Tacos", description: "Two beef tacos and two chicken breast tacos marinated in BBQ sauce, with onion, cilantro and guacamole." },
    pt: { name: "Tacos Texanos Mistos", description: "Dois tacos de carne bovina e dois de peito de frango marinados em molho BBQ, com cebola, coentro e guacamole." },
    fr: { name: "Tacos Texans Mixtes", description: "Deux tacos au bœuf et deux tacos au poulet marinés dans une sauce BBQ, avec oignon, coriandre et guacamole." },
  },
};

// Every product with a description uses complete, human-written copy. This avoids
// word-by-word substitutions that produce incomplete sentences in other languages.
const CURATED_CATALOGUE_TRANSLATIONS: Record<string, TranslationEntry> = {
  "Cóctel Texas Tea": {
    en: { name: "Texas Tea Cocktail", description: "Vodka, tequila, gin, rum, whisky, triple sec, lime and a splash of soda." },
    pt: { name: "Coquetel Texas Tea", description: "Vodka, tequila, gim, rum, uísque, triple sec, limão e um toque de soda." },
    fr: { name: "Cocktail Texas Tea", description: "Vodka, tequila, gin, rhum, whisky, triple sec, citron vert et un trait de soda." },
  },
  "Gin Basil Smash": {
    en: { name: "Gin Basil Smash", description: "Gin, basil and Sweet & Sour." }, pt: { name: "Gin Basil Smash", description: "Gim, manjericão e Sweet & Sour." }, fr: { name: "Gin Basil Smash", description: "Gin, basilic et Sweet & Sour." },
  },
  Bramble: {
    en: { name: "Bramble", description: "Gin, berry coulis and Sweet & Sour." }, pt: { name: "Bramble", description: "Gim, coulis de frutas vermelhas e Sweet & Sour." }, fr: { name: "Bramble", description: "Gin, coulis de fruits rouges et Sweet & Sour." },
  },
  "Medicina Latina": {
    en: { name: "Latin Medicine", description: "Tequila, ginger syrup and Sweet & Sour." }, pt: { name: "Medicina Latina", description: "Tequila, xarope de gengibre e Sweet & Sour." }, fr: { name: "Médecine Latine", description: "Tequila, sirop de gingembre et Sweet & Sour." },
  },
  "Moscow Mule": {
    en: { name: "Moscow Mule", description: "Vodka, Sweet & Sour and a splash of soda." }, pt: { name: "Moscow Mule", description: "Vodka, Sweet & Sour e um toque de soda." }, fr: { name: "Moscow Mule", description: "Vodka, Sweet & Sour et un trait de soda." },
  },
  "Gin Tonic": {
    en: { name: "Gin & Tonic", description: "Gin and tonic water." }, pt: { name: "Gin Tônica", description: "Gim e água tônica." }, fr: { name: "Gin Tonic", description: "Gin et eau tonique." },
  },
  Caipirinha: {
    en: { name: "Caipirinha", description: "Aguardiente, syrup and lime wedges." }, pt: { name: "Caipirinha", description: "Aguardente, xarope e gomos de limão." }, fr: { name: "Caipirinha", description: "Aguardiente, sirop et quartiers de citron vert." },
  },
  Caipiroska: {
    en: { name: "Caipiroska", description: "Vodka, spiced cane-sugar syrup and lime wedges." }, pt: { name: "Caipiroska", description: "Vodka, xarope de rapadura com especiarias e gomos de limão." }, fr: { name: "Caipiroska", description: "Vodka, sirop de panela épicé et quartiers de citron vert." },
  },
  "Mojito Tradicional": {
    en: { name: "Traditional Mojito", description: "Dark rum, mint and Sweet & Sour." }, pt: { name: "Mojito Tradicional", description: "Rum escuro, hortelã e Sweet & Sour." }, fr: { name: "Mojito Traditionnel", description: "Rhum brun, menthe et Sweet & Sour." },
  },
  "Cuba Libre": {
    en: { name: "Cuba Libre", description: "Dark rum, cola and Sweet & Sour." }, pt: { name: "Cuba Libre", description: "Rum escuro, refrigerante de cola e Sweet & Sour." }, fr: { name: "Cuba Libre", description: "Rhum brun, cola et Sweet & Sour." },
  },
  "Passion Cooler (SIN ALCOHOL)": {
    en: { name: "Passion Cooler (NON-ALCOHOLIC)", description: "Passion fruit syrup, Sweet & Sour and a splash of soda." }, pt: { name: "Passion Cooler (SEM ÁLCOOL)", description: "Xarope de maracujá, Sweet & Sour e um toque de soda." }, fr: { name: "Passion Cooler (SANS ALCOOL)", description: "Sirop de fruit de la passion, Sweet & Sour et un trait de soda." },
  },
  "Margarita Clásico": {
    en: { name: "Classic Margarita", description: "Tequila, triple sec and sour mix." }, pt: { name: "Margarita Clássica", description: "Tequila, triple sec e sour." }, fr: { name: "Margarita Classique", description: "Tequila, triple sec et sour." },
  },
  "Spicy Margarita": {
    en: { name: "Spicy Margarita", description: "Tequila, triple sec, sour mix and jalapeño." }, pt: { name: "Margarita Picante", description: "Tequila, triple sec, sour e jalapeño." }, fr: { name: "Margarita Épicée", description: "Tequila, triple sec, sour et jalapeño." },
  },
  "Sangre de Toro": {
    en: { name: "Bull's Blood", description: "Hibiscus-infused tequila, triple sec, Sweet & Sour and Tajín." }, pt: { name: "Sangue de Touro", description: "Tequila infusionada com hibisco, triple sec, Sweet & Sour e Tajín." }, fr: { name: "Sang de Taureau", description: "Tequila infusée à l'hibiscus, triple sec, Sweet & Sour et Tajín." },
  },
  "Coconut Rita": {
    en: { name: "Coconut Rita", description: "Coconut-infused tequila, triple sec, sour mix and dehydrated coconut." }, pt: { name: "Margarita de Coco", description: "Tequila infusionada com coco, triple sec, sour e coco desidratado." }, fr: { name: "Margarita Coco", description: "Tequila infusée à la noix de coco, triple sec, sour et noix de coco déshydratée." },
  },
  "Margarita de Maracuyá": {
    en: { name: "Passion Fruit Margarita", description: "Reposado tequila, passion fruit extract, triple sec and Sweet & Sour." }, pt: { name: "Margarita de Maracujá", description: "Tequila reposado, extrato de maracujá, triple sec e Sweet & Sour." }, fr: { name: "Margarita au Fruit de la Passion", description: "Tequila reposado, extrait de fruit de la passion, triple sec et Sweet & Sour." },
  },
  "Margarita Frutos Rojos": {
    en: { name: "Berry Margarita", description: "Tequila, berry coulis, triple sec and sour mix." }, pt: { name: "Margarita de Frutas Vermelhas", description: "Tequila, coulis de frutas vermelhas, triple sec e sour." }, fr: { name: "Margarita aux Fruits Rouges", description: "Tequila, coulis de fruits rouges, triple sec et sour." },
  },
  "Blue Pacific Margarita": {
    en: { name: "Blue Pacific Margarita", description: "Tequila, Blue Curaçao, triple sec and sour mix." }, pt: { name: "Margarita Blue Pacific", description: "Tequila, Blue Curaçao, triple sec e sour." }, fr: { name: "Margarita Blue Pacific", description: "Tequila, Blue Curaçao, triple sec et sour." },
  },
  "Vino Il Pumo, Italia": {
    en: { name: "Il Pumo Wine, Italy", description: "Il Pumo Negroamaro Salento red, Malvasia Sauvignon Salento and Rosato." }, pt: { name: "Vinho Il Pumo, Itália", description: "Il Pumo Negroamaro Salento tinto, Malvasia Sauvignon Salento e Rosato." }, fr: { name: "Vin Il Pumo, Italie", description: "Il Pumo Negroamaro Salento rouge, Malvasia Sauvignon Salento et Rosato." },
  },
  "Casillero del Diablo, Chile": {
    en: { name: "Casillero del Diablo, Chile", description: "Cabernet Sauvignon and Chardonnay." }, pt: { name: "Casillero del Diablo, Chile", description: "Cabernet Sauvignon e Chardonnay." }, fr: { name: "Casillero del Diablo, Chili", description: "Cabernet Sauvignon et Chardonnay." },
  },
  "Sangría Texas": {
    en: { name: "Texas Sangria", description: "A refreshing blend of house red or white wine, rosé wine and fruit." }, pt: { name: "Sangria Texas", description: "Uma combinação refrescante de vinho da casa tinto ou branco, vinho rosé e frutas." }, fr: { name: "Sangria Texas", description: "Une combinaison rafraîchissante de vin de la maison rouge ou blanc, de vin rosé et de fruits." },
  },
  Texano: {
    en: { name: "Texas Rice", description: "Rice with pork, beef tenderloin, chicken breast, York ham and assorted vegetables." }, pt: { name: "Arroz Texano", description: "Arroz com carne de porco, filé bovino, peito de frango, presunto York e variedade de vegetais." }, fr: { name: "Riz Texan", description: "Riz au porc, filet de bœuf, blanc de poulet, jambon York et légumes variés." },
  },
  "Cremoso de Camarón": {
    en: { name: "Creamy Shrimp Rice", description: "An exquisite creamy rice preparation with shrimp." }, pt: { name: "Arroz Cremoso de Camarão", description: "Uma requintada preparação cremosa de arroz com camarões." }, fr: { name: "Riz Crémeux aux Crevettes", description: "Une exquise préparation de riz crémeux aux crevettes." },
  },
  "Frito de Mariscos": {
    en: { name: "Fried Seafood Rice", description: "Wok-fried rice with shrimp, squid, king prawns and vegetables." }, pt: { name: "Arroz Frito de Frutos do Mar", description: "Arroz ao wok com camarões, lulas, lagostins e vegetais." }, fr: { name: "Riz Frit aux Fruits de Mer", description: "Riz au wok avec crevettes, calamars, langoustines et légumes." },
  },
  "Cremoso de Mariscos": {
    en: { name: "Creamy Seafood Rice", description: "A creamy coconut rice preparation with king prawns, squid and shrimp." }, pt: { name: "Arroz Cremoso de Frutos do Mar", description: "Uma preparação cremosa de arroz de coco com lagostins, lulas e camarões." }, fr: { name: "Riz Crémeux aux Fruits de Mer", description: "Une préparation crémeuse de riz à la noix de coco avec langoustines, calamars et crevettes." },
  },
  "Churrasco Asado": {
    en: { name: "Grilled Churrasco", description: "Juicy 300 g butterfly-cut ribeye steak, grilled and served with Creole potatoes." }, pt: { name: "Churrasco Grelhado", description: "Suculento corte borboleta de contrafilé de 300 g, grelhado e acompanhado de batatas crioulas." }, fr: { name: "Churrasco Grillé", description: "Juteux faux-filet en coupe papillon de 300 g, grillé et accompagné de pommes de terre créoles." },
  },
  "Punta Gorda": {
    en: { name: "Grilled Top Sirloin", description: "A perfect 300 g grilled top sirloin cut, served with Creole potatoes." }, pt: { name: "Ponta de Alcatra Grelhada", description: "Um perfeito corte de alcatra de 300 g na grelha, acompanhado de batatas crioulas." }, fr: { name: "Pointe de Rumsteck Grillée", description: "Une parfaite pièce de rumsteck de 300 g grillée, accompagnée de pommes de terre créoles." },
  },
  "Bife de Chorizo": {
    en: { name: "Strip Steak", description: "Juicy, thick-cut 300 g ribeye steak, grilled and served with Creole potatoes." }, pt: { name: "Bife de Chorizo", description: "Suculento corte grosso de contrafilé de 300 g, grelhado e acompanhado de batatas crioulas." }, fr: { name: "Faux-filet", description: "Juteux faux-filet épais de 300 g, grillé et accompagné de pommes de terre créoles." },
  },
  "Baby Beef": {
    en: { name: "Baby Beef", description: "A tender 300 g grilled beef tenderloin cut, served with Creole potatoes." }, pt: { name: "Baby Beef", description: "Um terno corte de filé mignon de 300 g na grelha, acompanhado de batatas crioulas." }, fr: { name: "Baby Beef", description: "Une tendre pièce de filet de bœuf de 300 g grillée, accompagnée de pommes de terre créoles." },
  },
  "Bondiola Ahumada": {
    en: { name: "Smoked Pork Shoulder", description: "A delicious 300 g smoked grilled pork shoulder cut, coated in house sauce and served with Creole potatoes." }, pt: { name: "Sobrepaleta Suína Defumada", description: "Delicioso corte de sobrepaleta suína defumada de 300 g, grelhado, banhado em molho da casa e acompanhado de batatas crioulas." }, fr: { name: "Échine de Porc Fumée", description: "Délicieuse échine de porc fumée de 300 g, grillée, nappée de sauce maison et accompagnée de pommes de terre créoles." },
  },
  "Filete de Pechuga": {
    en: { name: "Grilled Chicken Breast", description: "Juicy 300 g grilled chicken breast fillet with Creole potatoes." }, pt: { name: "Filé de Peito de Frango", description: "Suculento filé de peito de frango de 300 g na grelha com batatas crioulas." }, fr: { name: "Filet de Blanc de Poulet", description: "Juteux filet de blanc de poulet de 300 g grillé, avec pommes de terre créoles." },
  },
  "Lomo de Cerdo": {
    en: { name: "Pork Tenderloin", description: "Juicy 300 g grilled pork tenderloin cut, served with Creole potatoes." }, pt: { name: "Lombo de Porco", description: "Suculento corte de lombo de porco de 300 g grelhado, acompanhado de batatas crioulas." }, fr: { name: "Filet de Porc", description: "Juteuse pièce de filet de porc de 300 g grillée, accompagnée de pommes de terre créoles." },
  },
  "Lomo Vaquero": {
    en: { name: "Cowboy Tenderloin", description: "A tender 300 g grilled tenderloin cut inspired by the butcher's famous barbecue, served with Creole potatoes." }, pt: { name: "Filé Cowboy", description: "Terno corte de filé de 300 g na grelha, inspirado no famoso churrasco do açougueiro, acompanhado de batatas crioulas." }, fr: { name: "Filet Cowboy", description: "Tendre filet de 300 g grillé, inspiré du fameux barbecue du boucher, accompagné de pommes de terre créoles." },
  },
  "T-Bone Steak": {
    en: { name: "T-Bone Steak", description: "A juicy 600 g classic cut with a T-shaped bone separating the tenderloin and ribeye, served with Creole potatoes." }, pt: { name: "Bife T-Bone", description: "Suculento corte típico de 600 g com osso em forma de T, que separa o filé e o contrafilé, acompanhado de batatas crioulas." }, fr: { name: "Steak T-Bone", description: "Juteuse pièce classique de 600 g avec un os en forme de T séparant le filet et l'entrecôte, accompagnée de pommes de terre créoles." },
  },
  "Tomahawk de Cerdo": {
    en: { name: "Pork Tomahawk", description: "A prime 350 g pork chop with rib, perfectly grilled and served with Creole potatoes." }, pt: { name: "Tomahawk Suíno", description: "Primoroso corte de chuleta suína com costela de 350 g, perfeitamente grelhado e acompanhado de batatas crioulas." }, fr: { name: "Tomahawk de Porc", description: "Superbe côtelette de porc avec os de 350 g, parfaitement grillée et accompagnée de pommes de terre créoles." },
  },
  "Parrillada Dallas": {
    en: { name: "Dallas Grill Platter", description: "BBQ pork ribs, chicken breast fillet, pork tenderloin and grilled sausage, served with Creole potatoes." }, pt: { name: "Grelhado Dallas", description: "Costelas suínas ao BBQ, filé de peito de frango, lombo de porco e linguiça grelhada, acompanhados de batatas crioulas." }, fr: { name: "Grillade Dallas", description: "Côtes de porc BBQ, filet de blanc de poulet, filet de porc et saucisse grillée, accompagnés de pommes de terre créoles." },
  },
  "Lomo a la Pimienta": {
    en: { name: "Pepper Tenderloin", description: "Delicious beef tenderloin medallions in pepper sauce, served with tender Creole potato purée." }, pt: { name: "Filé ao Molho de Pimenta", description: "Deliciosos medalhões de filé mignon ao molho de pimenta, acompanhados de macio purê de batata crioula." }, fr: { name: "Filet au Poivre", description: "Délicieux médaillons de filet de bœuf en sauce au poivre, accompagnés d'une tendre purée de pommes de terre créoles." },
  },
  "Lomo Balsámico": {
    en: { name: "Balsamic Tenderloin", description: "Delicious beef tenderloin medallions in red wine and balsamic reduction, served with tender Creole potato purée." }, pt: { name: "Filé Balsâmico", description: "Deliciosos medalhões de filé mignon ao vinho tinto e redução balsâmica, acompanhados de macio purê de batata crioula." }, fr: { name: "Filet Balsamique", description: "Délicieux médaillons de filet de bœuf au vin rouge et réduction balsamique, accompagnés d'une tendre purée de pommes de terre créoles." },
  },
  "Lomo Texano": {
    en: { name: "Texas Tenderloin", description: "Delicate grilled beef tenderloin with mozzarella, basil and olive oil, served with Creole potatoes." }, pt: { name: "Filé Texano", description: "Delicado filé mignon na grelha, com muçarela, manjericão e azeite, acompanhado de batatas crioulas." }, fr: { name: "Filet Texan", description: "Délicat filet de bœuf grillé, avec mozzarella, basilic et huile d'olive, accompagné de pommes de terre créoles." },
  },
  "Lomo San Antonio": {
    en: { name: "San Antonio Tenderloin", description: "Beef tenderloin medallions in chimichurri sauce, on a bed of creamy bacon and mushroom rice." }, pt: { name: "Filé San Antonio", description: "Medalhões de filé mignon ao molho chimichurri, sobre uma cama de arroz cremoso com bacon e cogumelos." }, fr: { name: "Filet San Antonio", description: "Médaillons de filet de bœuf nappés de chimichurri, sur un lit de riz crémeux au bacon et aux champignons." },
  },
  "Pechuga en Salsa de Champiñones": {
    en: { name: "Chicken Breast in Mushroom Sauce", description: "Exquisite chicken breast in mushroom sauce, served with Creole potato purée." }, pt: { name: "Peito de Frango ao Molho de Cogumelos", description: "Exquisito peito de frango ao molho de cogumelos, acompanhado de purê de batata crioula." }, fr: { name: "Blanc de Poulet à la Sauce aux Champignons", description: "Exquis blanc de poulet à la sauce aux champignons, accompagné de purée de pommes de terre créoles." },
  },
  "Costillas de Cerdo": {
    en: { name: "Pork Ribs", description: "Juicy 400 g pork ribs in our signature BBQ sauce, served with Creole potatoes." }, pt: { name: "Costelas de Porco", description: "Suculentas costelas suínas de 400 g em nosso molho BBQ original, acompanhadas de batatas crioulas." }, fr: { name: "Côtes de Porc", description: "Juteuses côtes de porc de 400 g dans notre sauce BBQ signature, accompagnées de pommes de terre créoles." },
  },
  "Ensalada Texas": {
    en: { name: "Texas Salad", description: "A delicious combination of lettuce, sun-dried tomato, bacon, Parmesan and chicken breast, served with house vinaigrette." }, pt: { name: "Salada Texas", description: "Deliciosa combinação de alface, tomate seco, bacon, parmesão e peito de frango, acompanhada de vinagrete da casa." }, fr: { name: "Salade Texas", description: "Délicieuse combinaison de laitue, tomate séchée, bacon, parmesan et blanc de poulet, accompagnée de vinaigrette maison." },
  },
  "Picanha Angus": {
    en: { name: "Angus Picanha", description: "Juicy 300 g Certified Angus Beef cut, distinguished by its texture, bold flavor and marbling, served with Creole potatoes." }, pt: { name: "Picanha Angus", description: "Suculento corte Certified Angus Beef de 300 g, caracterizado por sua textura, sabor intenso e marmoreio, acompanhado de batatas crioulas." }, fr: { name: "Picanha Angus", description: "Juteuse pièce de Certified Angus Beef de 300 g, reconnue pour sa texture, sa richesse de goût et son persillage, accompagnée de pommes de terre créoles." },
  },
  "Rib Eye Steak": {
    en: { name: "Rib Eye Steak", description: "Tender 300 g Angus rib steak, grilled and served with Creole potatoes." }, pt: { name: "Rib Eye Steak", description: "Terno filé Angus de costela de 300 g na grelha, acompanhado de batatas crioulas." }, fr: { name: "Entrecôte Angus", description: "Tendre entrecôte Angus de 300 g grillée, accompagnée de pommes de terre créoles." },
  },
  "New York Steak": {
    en: { name: "New York Steak", description: "Juicy, thick-cut 300 g Certified Angus Beef steak, grilled and served with Creole potatoes." }, pt: { name: "New York Steak", description: "Suculento corte grosso de Certified Angus Beef de 300 g na grelha, acompanhado de batatas crioulas." }, fr: { name: "New York Steak", description: "Juteux steak épais de Certified Angus Beef de 300 g grillé, accompagné de pommes de terre créoles." },
  },
  "Sierra en Zumo de Coco": {
    en: { name: "Mackerel in Coconut Sauce", description: "A delicious Spanish mackerel steak in house coconut sauce, served with plantain fritters, coconut rice and green salad." }, pt: { name: "Cavala ao Molho de Coco", description: "Deliciosa posta de cavala ao molho de coco da casa, acompanhada de patacones, arroz de coco e salada verde." }, fr: { name: "Maquereau à la Sauce Coco", description: "Délicieuse darne de maquereau en sauce coco maison, accompagnée de plantains frits, riz coco et salade verte." },
  },
  "Róbalo Plancha": {
    en: { name: "Griddled Sea Bass", description: "Fresh sea bass fillet on a bed of creamy coconut rice." }, pt: { name: "Robalo na Chapa", description: "Filé fresco de robalo sobre uma cama de arroz cremoso de coco." }, fr: { name: "Bar à la Plancha", description: "Frais filet de bar sur un lit de riz crémeux à la noix de coco." },
  },
  "Róbalo Texano": {
    en: { name: "Texas Sea Bass", description: "Sea bass fillet in an exquisite shrimp and squid sauce, on a bed of creamy coconut rice." }, pt: { name: "Robalo Texano", description: "Filé de robalo em um requintado molho de camarões e lulas, sobre uma cama de arroz cremoso de coco." }, fr: { name: "Bar Texan", description: "Filet de bar nappé d'une exquise sauce aux crevettes et calamars, sur un lit de riz crémeux à la noix de coco." },
  },
  "Róbalo Caribe": {
    en: { name: "Caribbean Sea Bass", description: "Whole 500 g sea bass in an exquisite house shrimp and squid sauce, served with rice and salad." }, pt: { name: "Robalo Caribe", description: "Robalo inteiro de 500 g em requintado molho da casa de camarão e lula, acompanhado de arroz e salada." }, fr: { name: "Bar des Caraïbes", description: "Bar entier de 500 g nappé d'une exquise sauce maison aux crevettes et calamars, accompagné de riz et de salade." },
  },
  "Salmón Parrillero": {
    en: { name: "Grilled Salmon", description: "Fresh grilled salmon on a delicate bed of Creole potato purée." }, pt: { name: "Salmão Grelhado", description: "Salmão fresco na grelha sobre uma delicada cama de purê de batata crioula." }, fr: { name: "Saumon Grillé", description: "Saumon frais grillé sur un délicat lit de purée de pommes de terre créoles." },
  },
  "Salmón en Salsa de Durazno": {
    en: { name: "Salmon in Peach Sauce", description: "Salmon fillet in delicious peach sauce, on a smooth bed of Creole potato purée." }, pt: { name: "Salmão ao Molho de Pêssego", description: "Filé de salmão em delicioso molho de pêssego, sobre uma suave cama de purê de batata crioula." }, fr: { name: "Saumon à la Sauce Pêche", description: "Filet de saumon nappé d'une délicieuse sauce pêche, sur un doux lit de purée de pommes de terre créoles." },
  },
  "Pargo a la Criolla": {
    en: { name: "Creole Red Snapper", description: "Whole 500 g red snapper in an exquisite house Creole sauce, served with rice and salad." }, pt: { name: "Pargo à Crioula", description: "Pargo inteiro de 500 g em requintado molho crioulo da casa, acompanhado de arroz e salada." }, fr: { name: "Vivaneau à la Créole", description: "Vivaneau entier de 500 g nappé d'une exquise sauce créole maison, accompagné de riz et de salade." },
  },
  "Langostinos al Fuego": {
    en: { name: "Fiery King Prawns", description: "Delicious king prawns in an exquisite garlic sauce with a spicy touch, on a bed of potato purée." }, pt: { name: "Lagostins ao Fogo", description: "Deliciosos lagostins em requintado molho de alho com toque picante, sobre uma cama de purê de batata." }, fr: { name: "Gambas au Feu", description: "Délicieuses langoustines dans une exquise sauce à l'ail légèrement épicée, sur un lit de purée de pommes de terre." },
  },
  "Camarones Texas": {
    en: { name: "Texas Shrimp", description: "Delicious shrimp in cheese sauce on a smooth bed of Creole potato purée." }, pt: { name: "Camarões Texas", description: "Deliciosos camarões ao molho de queijos sobre uma suave cama de purê de batata crioula." }, fr: { name: "Crevettes Texas", description: "Délicieuses crevettes en sauce aux fromages sur un doux lit de purée de pommes de terre créoles." },
  },
  "Mojarra Roja Frita": {
    en: { name: "Fried Red Tilapia", description: "Crispy whole fried red tilapia, served with plantain fritters, coconut rice and salad." }, pt: { name: "Tilápia Vermelha Frita", description: "Tilápia vermelha inteira frita e crocante, acompanhada de patacones, arroz de coco e salada." }, fr: { name: "Tilapia Rouge Frite", description: "Tilapia rouge entière frite et croustillante, accompagnée de plantains frits, riz coco et salade." },
  },
  Vegetarianas: {
    en: { name: "Vegetarian Pasta", description: "A delicious combination of mushrooms, zucchini, bell pepper and onion." }, pt: { name: "Massas Vegetarianas", description: "Deliciosa combinação de cogumelos, abobrinha, pimentão e cebola." }, fr: { name: "Pâtes Végétariennes", description: "Délicieuse combinaison de champignons, courgette, poivron et oignon." },
  },
  "Pollo y Tocinetas a la Pasta": {
    en: { name: "Chicken and Bacon Pasta", description: "Delicious chicken and bacon bites in an exquisite white sauce over pasta." }, pt: { name: "Massas com Frango e Bacon", description: "Deliciosos pedaços de frango e bacon em requintado molho branco sobre uma cama de massas." }, fr: { name: "Pâtes au Poulet et Bacon", description: "Délicieux morceaux de poulet et bacon dans une exquise sauce blanche, sur un lit de pâtes." },
  },
  "Pastas Fileto Betina": {
    en: { name: "Fileto Betina Pasta", description: "A delicious pasta combination with beef tenderloin and creamy tomato ragù." }, pt: { name: "Massas Fileto Betina", description: "Deliciosa combinação de massas com filé bovino e cremoso ragù de tomate." }, fr: { name: "Pâtes Fileto Betina", description: "Délicieuse combinaison de pâtes au filet de bœuf et crémeux ragù de tomate." },
  },
  "Del Mar": {
    en: { name: "Seafood Pasta", description: "Delicious pasta in a unique shrimp, squid and king prawn sauce." }, pt: { name: "Massas do Mar", description: "Deliciosas massas em molho especial de camarões, lulas e lagostins." }, fr: { name: "Pâtes aux Fruits de Mer", description: "Délicieuses pâtes dans une sauce unique aux crevettes, calamars et langoustines." },
  },
  Texanas: {
    en: { name: "Texas Pasta", description: "Delicious pasta with fresh shrimp in cheese sauce." }, pt: { name: "Massas Texanas", description: "Deliciosas massas com camarões frescos ao molho de queijos." }, fr: { name: "Pâtes Texanes", description: "Délicieuses pâtes aux crevettes fraîches en sauce aux fromages." },
  },
  "Camarones Trufados y Pasta": {
    en: { name: "Truffled Shrimp Pasta", description: "Delicious pasta with shrimp in an exotic truffle sauce." }, pt: { name: "Massas com Camarão Trufado", description: "Deliciosas massas com camarões em exótico molho de trufa." }, fr: { name: "Pâtes aux Crevettes Truffées", description: "Délicieuses pâtes aux crevettes dans une exotique sauce à la truffe." },
  },
  Texas: {
    en: { name: "Texas Burger", description: "125 g of Certified Angus Beef on brioche with mozzarella, sausage and bacon, served with fries." }, pt: { name: "Hambúrguer Texas", description: "125 g de Certified Angus Beef no pão brioche, com muçarela, linguiça e bacon, acompanhado de batatas fritas." }, fr: { name: "Burger Texas", description: "125 g de Certified Angus Beef dans un pain brioché, avec mozzarella, saucisse et bacon, accompagné de frites." },
  },
  Laredo: {
    en: { name: "Laredo Burger", description: "125 g of Certified Angus Beef on brioche with mozzarella and bacon, served with fries in our signature corn sauce." }, pt: { name: "Hambúrguer Laredo", description: "125 g de Certified Angus Beef no pão brioche, com muçarela e bacon, acompanhado de batatas fritas em nosso molho original de milho." }, fr: { name: "Burger Laredo", description: "125 g de Certified Angus Beef dans un pain brioché, avec mozzarella et bacon, accompagné de frites dans notre sauce signature au maïs." },
  },
  Costeña: {
    en: { name: "Coastal Burger", description: "125 g of Certified Angus Beef on brioche with coastal cheese, sour cream and bacon, served with fries." }, pt: { name: "Hambúrguer Costeiro", description: "125 g de Certified Angus Beef no pão brioche, com queijo costeiro, suero e bacon, acompanhado de batatas fritas." }, fr: { name: "Burger Côtier", description: "125 g de Certified Angus Beef dans un pain brioché, avec fromage côtier, crème acidulée et bacon, accompagné de frites." },
  },
  Cheddar: {
    en: { name: "Cheddar Burger", description: "125 g of Certified Angus Beef on brioche with mozzarella and bacon, coated in cheddar sauce and served with fries." }, pt: { name: "Hambúrguer Cheddar", description: "125 g de Certified Angus Beef no pão brioche, com muçarela e bacon, banhado em molho cheddar e acompanhado de batatas fritas." }, fr: { name: "Burger Cheddar", description: "125 g de Certified Angus Beef dans un pain brioché, avec mozzarella et bacon, nappé de sauce cheddar et accompagné de frites." },
  },
  Chicken: {
    en: { name: "Chicken Burger", description: "Delicious panko-breaded chicken breast burger with mozzarella, vegetables and brioche, served with fries." }, pt: { name: "Hambúrguer de Frango", description: "Delicioso hambúrguer de peito de frango empanado em panko, com muçarela, vegetais e pão brioche, acompanhado de batatas fritas." }, fr: { name: "Burger au Poulet", description: "Délicieux burger de blanc de poulet pané au panko, avec mozzarella, légumes et pain brioché, accompagné de frites." },
  },
  "Menú Infantil": {
    en: { name: "Kids' Menu", description: "Grilled chicken breast strips with fries and a soft drink." }, pt: { name: "Menu Infantil", description: "Tiras de peito de frango grelhado com batatinhas e refrigerante." }, fr: { name: "Menu Enfants", description: "Émincés de blanc de poulet grillé avec frites et boisson gazeuse." },
  },
};

type FallbackLanguage = Exclude<TexasLanguage, "es">;
type Replacement = readonly [string, string];

const PRODUCT_NAME_OVERRIDES: Partial<Record<string, Record<FallbackLanguage, string>>> = {
  "Texano": { en: "Texas Rice", pt: "Arroz Texano", fr: "Riz Texan" },
  "Cremoso de Camarón": { en: "Creamy Shrimp Rice", pt: "Arroz Cremoso de Camarão", fr: "Riz Crémeux aux Crevettes" },
  "Frito de Mariscos": { en: "Fried Seafood Rice", pt: "Arroz Frito de Frutos do Mar", fr: "Riz Frit aux Fruits de Mer" },
  "Cremoso de Mariscos": { en: "Creamy Seafood Rice", pt: "Arroz Cremoso de Frutos do Mar", fr: "Riz Crémeux aux Fruits de Mer" },
  "Torta de Zanahoria": { en: "Carrot Cake", pt: "Bolo de Cenoura", fr: "Gâteau aux Carottes" },
  "Churrasco Asado": { en: "Grilled Churrasco", pt: "Churrasco Grelhado", fr: "Churrasco Grillé" },
  "Punta Gorda": { en: "Grilled Top Sirloin", pt: "Ponta de Alcatra Grelhada", fr: "Pointe de Rumsteck Grillée" },
  "Bife de Chorizo": { en: "Strip Steak", pt: "Bife de Chorizo", fr: "Faux-filet" },
  "Bondiola Ahumada": { en: "Smoked Pork Shoulder", pt: "Sobrepaleta Suína Defumada", fr: "Échine de Porc Fumée" },
  "Filete de Pechuga": { en: "Grilled Chicken Breast", pt: "Filé de Peito de Frango", fr: "Filet de Blanc de Poulet" },
  "Lomo de Cerdo": { en: "Pork Tenderloin", pt: "Lombo de Porco", fr: "Filet de Porc" },
  "Lomo Vaquero": { en: "Cowboy Tenderloin", pt: "Filé Cowboy", fr: "Filet Cowboy" },
  "Tomahawk de Cerdo": { en: "Pork Tomahawk", pt: "Tomahawk Suíno", fr: "Tomahawk de Porc" },
  "Parrillada Dallas": { en: "Dallas Grill Platter", pt: "Grelhado Dallas", fr: "Grillade Dallas" },
  "Lomo a la Pimienta": { en: "Pepper Tenderloin", pt: "Filé ao Molho de Pimenta", fr: "Filet au Poivre" },
  "Lomo Balsámico": { en: "Balsamic Tenderloin", pt: "Filé Balsâmico", fr: "Filet Balsamique" },
  "Lomo Texano": { en: "Texas Tenderloin", pt: "Filé Texano", fr: "Filet Texan" },
  "Lomo San Antonio": { en: "San Antonio Tenderloin", pt: "Filé San Antonio", fr: "Filet San Antonio" },
  "Pechuga en Salsa de Champiñones": { en: "Chicken Breast in Mushroom Sauce", pt: "Peito de Frango ao Molho de Cogumelos", fr: "Blanc de Poulet à la Sauce aux Champignons" },
  "Costillas de Cerdo": { en: "Pork Ribs", pt: "Costelas de Porco", fr: "Côtes de Porc" },
  "Ensalada Texas": { en: "Texas Salad", pt: "Salada Texas", fr: "Salade Texas" },
  "Sierra en Zumo de Coco": { en: "Mackerel in Coconut Sauce", pt: "Cavala ao Molho de Coco", fr: "Maquereau à la Sauce Coco" },
  "Róbalo Plancha": { en: "Griddled Sea Bass", pt: "Robalo na Chapa", fr: "Bar à la Plancha" },
  "Róbalo Texano": { en: "Texas Sea Bass", pt: "Robalo Texano", fr: "Bar Texan" },
  "Róbalo Caribe": { en: "Caribbean Sea Bass", pt: "Robalo Caribe", fr: "Bar des Caraïbes" },
  "Salmón Parrillero": { en: "Grilled Salmon", pt: "Salmão Grelhado", fr: "Saumon Grillé" },
  "Salmón en Salsa de Durazno": { en: "Salmon in Peach Sauce", pt: "Salmão ao Molho de Pêssego", fr: "Saumon à la Sauce Pêche" },
  "Pargo a la Criolla": { en: "Creole Red Snapper", pt: "Pargo à Crioula", fr: "Vivaneau à la Créole" },
  "Langostinos al Fuego": { en: "Fiery King Prawns", pt: "Lagostins ao Fogo", fr: "Gambas au Feu" },
  "Camarones Texas": { en: "Texas Shrimp", pt: "Camarões Texas", fr: "Crevettes Texas" },
  "Mojarra Roja Frita": { en: "Fried Red Tilapia", pt: "Tilápia Vermelha Frita", fr: "Tilapia Rouge Frit" },
  "Vegetarianas": { en: "Vegetarian Pasta", pt: "Massas Vegetarianas", fr: "Pâtes Végétariennes" },
  "Pollo y Tocinetas a la Pasta": { en: "Chicken and Bacon Pasta", pt: "Massas com Frango e Bacon", fr: "Pâtes au Poulet et Bacon" },
  "Pastas Fileto Betina": { en: "Fileto Betina Pasta", pt: "Massas Fileto Betina", fr: "Pâtes Fileto Betina" },
  "Del Mar": { en: "Seafood Pasta", pt: "Massas do Mar", fr: "Pâtes aux Fruits de Mer" },
  "Texanas": { en: "Texas Pasta", pt: "Massas Texanas", fr: "Pâtes Texanes" },
  "Camarones Trufados y Pasta": { en: "Truffled Shrimp Pasta", pt: "Massas com Camarão Trufado", fr: "Pâtes aux Crevettes Truffées" },
  "Costeña": { en: "Coastal Burger", pt: "Hambúrguer Costeiro", fr: "Burger Côtier" },
  "Menú Infantil": { en: "Kids' Menu", pt: "Menu Infantil", fr: "Menu Enfants" },
  "Porción de Papa Criolla": { en: "Creole Potato Portion", pt: "Porção de Batata Crioula", fr: "Portion de Pommes de Terre Créoles" },
  "Porción de Puré de Papa Criolla": { en: "Creole Potato Purée Portion", pt: "Porção de Purê de Batata Crioula", fr: "Portion de Purée de Pommes de Terre Créoles" },
  "Porción de ensalada Coleslaw": { en: "Coleslaw Portion", pt: "Porção de Salada Coleslaw", fr: "Portion de Coleslaw" },
  "Porción de Arroz con Coco": { en: "Coconut Rice Portion", pt: "Porção de Arroz com Coco", fr: "Portion de Riz au Coco" },
  "Porción de Arroz con Coco Cremoso": { en: "Creamy Coconut Rice Portion", pt: "Porção de Arroz Cremoso com Coco", fr: "Portion de Riz Crémeux au Coco" },
  "Porción de Patacones": { en: "Plantain Fritter Portion", pt: "Porção de Patacones", fr: "Portion de Plantains Frits" },
  "Papas Fritas": { en: "French Fries", pt: "Batatas Fritas", fr: "Frites" },
  "Porción de Suero": { en: "Sour Cream Portion", pt: "Porção de Suero", fr: "Portion de Crème Acidulée" },
  "Adicional de Camarón (100g)": { en: "Extra Shrimp (100g)", pt: "Camarão Extra (100g)", fr: "Supplément de Crevettes (100g)" },
  "Cóctel Texas Tea": { en: "Texas Tea Cocktail", pt: "Coquetel Texas Tea", fr: "Cocktail Texas Tea" },
  "Passion Cooler (SIN ALCOHOL)": { en: "Passion Cooler (NON-ALCOHOLIC)", pt: "Passion Cooler (SEM ÁLCOOL)", fr: "Passion Cooler (SANS ALCOOL)" },
  "Margarita Clásico": { en: "Classic Margarita", pt: "Margarita Clássica", fr: "Margarita Classique" },
  "Margarita de Maracuyá": { en: "Passion Fruit Margarita", pt: "Margarita de Maracujá", fr: "Margarita au Fruit de la Passion" },
  "Margarita Frutos Rojos": { en: "Berry Margarita", pt: "Margarita de Frutas Vermelhas", fr: "Margarita aux Fruits Rouges" },
  "Vino Il Pumo, Italia": { en: "Il Pumo Wine, Italy", pt: "Vinho Il Pumo, Itália", fr: "Vin Il Pumo, Italie" },
  "Vino Espumante Cinzano Secco": { en: "Cinzano Secco Sparkling Wine", pt: "Vinho Espumante Cinzano Secco", fr: "Vin Effervescent Cinzano Secco" },
  "Casillero del Diablo, Chile": { en: "Casillero del Diablo, Chile", pt: "Casillero del Diablo, Chile", fr: "Casillero del Diablo, Chili" },
  "Vino Torres Sangre de Toro Tempranillo": { en: "Torres Sangre de Toro Tempranillo Wine", pt: "Vinho Torres Sangre de Toro Tempranillo", fr: "Vin Torres Sangre de Toro Tempranillo" },
  "Sangría Texas": { en: "Texas Sangria", pt: "Sangria Texas", fr: "Sangria Texas" },
  "Soda Bretaña Saborizada de Maracuyá": { en: "Bretaña Passion Fruit Soda", pt: "Soda Bretaña Sabor Maracujá", fr: "Soda Bretaña au Fruit de la Passion" },
  "Soda Bretaña Saborizada de Frutos Rojos": { en: "Bretaña Berry Soda", pt: "Soda Bretaña de Frutas Vermelhas", fr: "Soda Bretaña aux Fruits Rouges" },
  "Soda Bretaña Saborizada de Kiwi": { en: "Bretaña Kiwi Soda", pt: "Soda Bretaña de Kiwi", fr: "Soda Bretaña au Kiwi" },
  "Té Hatsu": { en: "Hatsu Tea", pt: "Chá Hatsu", fr: "Thé Hatsu" },
  "Jugos Naturales": { en: "Natural Juices", pt: "Sucos Naturais", fr: "Jus Naturels" },
  "Limonada de Panela": { en: "Raw Cane Sugar Lemonade", pt: "Limonada de Rapadura", fr: "Citronnade au Sucre de Canne" },
  "Limonada Natural": { en: "Fresh Lemonade", pt: "Limonada Natural", fr: "Citronnade Maison" },
  "Limonada de Coco": { en: "Coconut Lemonade", pt: "Limonada de Coco", fr: "Citronnade à la Noix de Coco" },
  "Limonada Cerezada": { en: "Cherry Lemonade", pt: "Limonada de Cereja", fr: "Citronnade à la Cerise" },
  "Limonada Hierbabuena": { en: "Mint Lemonade", pt: "Limonada de Hortelã", fr: "Citronnade à la Menthe" },
  "Agua con Gas o sin Gas Hatsu": { en: "Hatsu Sparkling or Still Water", pt: "Água Hatsu com ou sem Gás", fr: "Eau Hatsu Gazeuse ou Plate" },
  "Soda Bretaña": { en: "Bretaña Soda", pt: "Soda Bretaña", fr: "Soda Bretaña" },
  "Gaseosas Postobón": { en: "Postobón Soft Drinks", pt: "Refrigerantes Postobón", fr: "Sodas Postobón" },
  "Ginger - Tonica Canada Dry": { en: "Canada Dry Ginger Ale or Tonic", pt: "Ginger Ale ou Tônica Canada Dry", fr: "Ginger Ale ou Tonic Canada Dry" },
  "Red Bull Sugarfree": { en: "Red Bull Sugarfree", pt: "Red Bull Sem Açúcar", fr: "Red Bull Sans Sucre" },
  "Cerveza Budweiser": { en: "Budweiser Beer", pt: "Cerveja Budweiser", fr: "Bière Budweiser" },
  "Cerveza Heineken": { en: "Heineken Beer", pt: "Cerveja Heineken", fr: "Bière Heineken" },
  "Cerveza Sol": { en: "Sol Beer", pt: "Cerveja Sol", fr: "Bière Sol" },
  "Cerveza Club Colombia": { en: "Club Colombia Beer", pt: "Cerveja Club Colombia", fr: "Bière Club Colombia" },
  "Cerveza Corona": { en: "Corona Beer", pt: "Cerveja Corona", fr: "Bière Corona" },
  "Cerveza Stella Artois": { en: "Stella Artois Beer", pt: "Cerveja Stella Artois", fr: "Bière Stella Artois" },
  "Cubetazo Cerveza Budweiser (6 Und)": { en: "Budweiser Beer Bucket (6 units)", pt: "Balde de Cerveja Budweiser (6 unid.)", fr: "Seau de Bières Budweiser (6 unités)" },
  "Cubetazo Cerveza Club Colombia (6 Und)": { en: "Club Colombia Beer Bucket (6 units)", pt: "Balde de Cerveja Club Colombia (6 unid.)", fr: "Seau de Bières Club Colombia (6 unités)" },
  "Cubetazo Cerveza Heineken (6 Und)": { en: "Heineken Beer Bucket (6 units)", pt: "Balde de Cerveja Heineken (6 unid.)", fr: "Seau de Bières Heineken (6 unités)" },
  "Medicina Latina": { en: "Latin Medicine", pt: "Medicina Latina", fr: "Médecine Latine" },
  "Mojito Tradicional": { en: "Traditional Mojito", pt: "Mojito Tradicional", fr: "Mojito Traditionnel" },
  "Sangre de Toro": { en: "Bull's Blood", pt: "Sangue de Touro", fr: "Sang de Taureau" },
  "Blue Pacific Margarita": { en: "Blue Pacific Margarita", pt: "Margarita Blue Pacific", fr: "Margarita Blue Pacific" },
  "Buchanan's 18 años": { en: "Buchanan's 18 Years", pt: "Buchanan's 18 Anos", fr: "Buchanan's 18 Ans" },
  "Old Parr 12 años": { en: "Old Parr 12 Years", pt: "Old Parr 12 Anos", fr: "Old Parr 12 Ans" },
  "JW Sello Negro": { en: "JW Black Label", pt: "JW Black Label", fr: "JW Black Label" },
  "Buchanan's 12 años": { en: "Buchanan's 12 Years", pt: "Buchanan's 12 Anos", fr: "Buchanan's 12 Ans" },
  "JW Sello Rojo": { en: "JW Red Label", pt: "JW Red Label", fr: "JW Red Label" },
  "Ron Dictador 12 años": { en: "Dictador Rum 12 Years", pt: "Rum Dictador 12 Anos", fr: "Rhum Dictador 12 Ans" },
  "Ron Dictador 20 años": { en: "Dictador Rum 20 Years", pt: "Rum Dictador 20 Anos", fr: "Rhum Dictador 20 Ans" },
  "Ron Hechicera": { en: "Hechicera Rum", pt: "Rum Hechicera", fr: "Rhum Hechicera" },
  "Ron Medellín 12 años": { en: "Medellín Rum 12 Years", pt: "Rum Medellín 12 Anos", fr: "Rhum Medellín 12 Ans" },
  "Ron Medellín 8 años": { en: "Medellín Rum 8 Years", pt: "Rum Medellín 8 Anos", fr: "Rhum Medellín 8 Ans" },
  "Ron Medellín 3 años": { en: "Medellín Rum 3 Years", pt: "Rum Medellín 3 Anos", fr: "Rhum Medellín 3 Ans" },
  "Aguardiente Antioqueño": { en: "Antioqueño Aguardiente", pt: "Aguardente Antioqueño", fr: "Aguardiente Antioqueño" },
};

const DESCRIPTION_REPLACEMENTS: Record<FallbackLanguage, readonly Replacement[]> = {
  en: [["acompañados con", "served with"], ["acompañada con", "served with"], ["acompañado de", "served with"], ["acompañada de", "served with"], ["acompañados de", "served with"], ["acompañadas de", "served with"], ["acompañado con", "served with"], ["acompañada por", "served with"], ["Deliciosa combinación de", "Delicious combination of"], ["Exquisita combinación de", "Exquisite combination of"], ["Deliciosos", "Delicious"], ["Deliciosa", "Delicious"], ["Exquisita", "Exquisite"], ["Sabrosa", "Tasty"], ["Ricas", "Delicious"], ["Rico", "Delicious"], ["Jugoso", "Juicy"], ["Jugosas", "Juicy"], ["Fresco", "Fresh"], ["Crujiente", "Crispy"], ["Tierno", "Tender"], ["Perfecto", "Perfect"], ["Primoroso", "Prime"], ["bañado en", "topped with"], ["bañados en", "topped with"], ["sobre una cama de", "on a bed of"], ["en una cama de", "on a bed of"], ["con", "with"], ["y", "and"], ["arroz", "rice"], ["camarones", "shrimp"], ["calamares", "squid"], ["langostinos", "king prawns"], ["pescado", "fish"], ["salmón", "salmon"], ["róbalo", "sea bass"], ["papa criolla", "creole potatoes"], ["papas criollas", "creole potatoes"], ["puré de papa", "potato purée"], ["pechuga de pollo", "chicken breast"], ["lomo de cerdo", "pork tenderloin"], ["lomo fino", "beef tenderloin"], ["carne de res", "beef"], ["queso", "cheese"], ["ensalada", "salad"], ["vegetales", "vegetables"], ["champiñones", "mushrooms"], ["salsa", "sauce"], ["parrilla", "grill"], ["asado", "grilled"], ["frito", "fried"], ["coco", "coconut"], ["patacones", "plantain fritters"], ["frutas", "fruit"], ["vino", "wine"], ["limón", "lime"], ["agua tónica", "tonic water"], ["sin alcohol", "non-alcoholic"]],
  pt: [["acompañados con", "acompanhados de"], ["acompañada con", "acompanhada de"], ["acompañado de", "acompanhado de"], ["acompañada de", "acompanhada de"], ["acompañados de", "acompanhados de"], ["acompañadas de", "acompanhadas de"], ["Deliciosa combinación de", "Deliciosa combinação de"], ["Exquisita combinación de", "Exquisita combinação de"], ["Deliciosos", "Deliciosos"], ["Deliciosa", "Deliciosa"], ["Exquisita", "Exquisita"], ["Sabrosa", "Saborosa"], ["Ricas", "Deliciosas"], ["Rico", "Delicioso"], ["Jugoso", "Suculento"], ["Jugosas", "Suculentas"], ["Fresco", "Fresco"], ["Crujiente", "Crocante"], ["Tierno", "Macio"], ["bañado en", "banhado em"], ["bañados en", "banhados em"], ["sobre una cama de", "sobre uma cama de"], ["en una cama de", "em uma cama de"], ["con", "com"], ["y", "e"], ["arroz", "arroz"], ["camarones", "camarões"], ["calamares", "lulas"], ["langostinos", "lagostins"], ["pescado", "peixe"], ["salmón", "salmão"], ["róbalo", "robalo"], ["papa criolla", "batata crioula"], ["papas criollas", "batatas crioulas"], ["puré de papa", "purê de batata"], ["pechuga de pollo", "peito de frango"], ["lomo de cerdo", "lombo de porco"], ["lomo fino", "filé mignon"], ["carne de res", "carne bovina"], ["queso", "queijo"], ["ensalada", "salada"], ["vegetales", "vegetais"], ["champiñones", "cogumelos"], ["salsa", "molho"], ["parrilla", "grelha"], ["asado", "grelhado"], ["frito", "frito"], ["coco", "coco"], ["patacones", "patacones"], ["frutas", "frutas"], ["vino", "vinho"], ["limón", "limão"], ["agua tónica", "água tônica"], ["sin alcohol", "sem álcool"]],
  fr: [["acompañados con", "accompagnés de"], ["acompañada con", "accompagnée de"], ["acompañado de", "accompagné de"], ["acompañada de", "accompagnée de"], ["acompañados de", "accompagnés de"], ["acompañadas de", "accompagnées de"], ["Deliciosa combinación de", "Délicieuse combinaison de"], ["Exquisita combinación de", "Exquise combinaison de"], ["Deliciosos", "Délicieux"], ["Deliciosa", "Délicieuse"], ["Exquisita", "Exquise"], ["Sabrosa", "Savoureuse"], ["Ricas", "Délicieuses"], ["Rico", "Délicieux"], ["Jugoso", "Juteux"], ["Jugosas", "Juteuses"], ["Fresco", "Frais"], ["Crujiente", "Croustillant"], ["Tierno", "Tendre"], ["bañado en", "nappé de"], ["bañados en", "nappés de"], ["sobre una cama de", "sur un lit de"], ["en una cama de", "sur un lit de"], ["con", "avec"], ["y", "et"], ["arroz", "riz"], ["camarones", "crevettes"], ["calamares", "calamars"], ["langostinos", "langoustines"], ["pescado", "poisson"], ["salmón", "saumon"], ["róbalo", "bar"], ["papa criolla", "pommes de terre créoles"], ["papas criollas", "pommes de terre créoles"], ["puré de papa", "purée de pommes de terre"], ["pechuga de pollo", "blanc de poulet"], ["lomo de cerdo", "filet de porc"], ["lomo fino", "filet de bœuf"], ["carne de res", "bœuf"], ["queso", "fromage"], ["ensalada", "salade"], ["vegetales", "légumes"], ["champiñones", "champignons"], ["salsa", "sauce"], ["parrilla", "gril"], ["asado", "grillé"], ["frito", "frit"], ["coco", "noix de coco"], ["patacones", "plantains frits"], ["frutas", "fruits"], ["vino", "vin"], ["limón", "citron vert"], ["agua tónica", "eau tonique"], ["sin alcohol", "sans alcool"]],
};

function replaceLocalizedTerms(value: string, replacements: readonly Replacement[]) {
  return replacements.reduce((result, [from, to]) => result.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), to), value);
}

const PRICE_OPTION_TRANSLATIONS: Record<FallbackLanguage, Record<string, string>> = {
  en: { Trago: "Shot", Media: "Half bottle", Botella: "Bottle" },
  pt: { Trago: "Dose", Media: "Meia garrafa", Botella: "Garrafa" },
  fr: { Trago: "Verre", Media: "Demi-bouteille", Botella: "Bouteille" },
};

const SECTION_TRANSLATIONS: Record<string, Record<FallbackLanguage, string>> = {
  "Cócteles Clásicos Texas": { en: "Texas Classic Cocktails", pt: "Coquetéis Clássicos Texas", fr: "Cocktails Classiques Texas" },
  "Texas Margaritas": { en: "Texas Margaritas", pt: "Margaritas Texas", fr: "Margaritas Texas" },
  Whisky: { en: "Whisky", pt: "Whisky", fr: "Whisky" },
  Ginebras: { en: "Gin", pt: "Gins", fr: "Gins" },
  Vodka: { en: "Vodka", pt: "Vodka", fr: "Vodka" },
  Tequilas: { en: "Tequilas", pt: "Tequilas", fr: "Tequilas" },
  "Rones y Aguardientes": { en: "Rums and Aguardientes", pt: "Rums e Aguardentes", fr: "Rhums et Aguardientes" },
};

export function translateTexasSectionName(name: string, language: TexasLanguage) {
  return language === "es" ? name : SECTION_TRANSLATIONS[name]?.[language] ?? name;
}

function fallbackTranslation(product: TexasProduct, language: FallbackLanguage): LocalizedText {
  return {
    name: PRODUCT_NAME_OVERRIDES[product.name]?.[language] ?? replaceLocalizedTerms(product.name, DESCRIPTION_REPLACEMENTS[language]),
    description: product.description ? replaceLocalizedTerms(product.description, DESCRIPTION_REPLACEMENTS[language]) : null,
  };
}

export function translateTexasProduct(product: TexasProduct, language: TexasLanguage): TexasProduct {
  if (language === "es") return product;
  const savedTranslation = product.translations[language];
  const translation = savedTranslation?.name || savedTranslation?.description
    ? { name: savedTranslation.name ?? product.name, description: savedTranslation.description ?? product.description }
    : CURATED_CATALOGUE_TRANSLATIONS[product.name]?.[language] ?? PRODUCT_TRANSLATIONS[product.name]?.[language];
  return {
    ...product,
    ...(translation ?? fallbackTranslation(product, language)),
    priceOptions: product.priceOptions.map((option) => ({ ...option, label: PRICE_OPTION_TRANSLATIONS[language][option.label] ?? option.label })),
  };
}
