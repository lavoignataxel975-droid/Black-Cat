/**
 * Contenu de départ du site The Black Cat : la carte et les événements tels qu'ils
 * figurent dans assets/js/data.js, dans le même ordre. `cle` relie un produit à sa
 * catégorie le temps du seed (en base, un produit désigne sa catégorie par son identifiant).
 *
 * Fichier généré — pour le régénérer depuis le site :
 *   node scripts/gen-seed.js
 */

export const CATEGORIES: Record<string, string>[] = [
  {
    "cle": "cocktails",
    "nom": "Cocktails",
    "groupe": "boire",
    "note": "8,50 € — tous les cocktails"
  },
  {
    "cle": "mixers",
    "nom": "Mixers",
    "groupe": "boire"
  },
  {
    "cle": "bieres-pression",
    "nom": "Bières pression",
    "groupe": "boire",
    "note": "25 cl / 50 cl / girafe 2,5 L"
  },
  {
    "cle": "bieres-bouteilles",
    "nom": "Bières bouteilles",
    "groupe": "boire",
    "note": "33 cl"
  },
  {
    "cle": "vins",
    "nom": "Vins",
    "groupe": "boire",
    "note": "verre / bouteille"
  },
  {
    "cle": "apero",
    "nom": "Apéro",
    "groupe": "boire"
  },
  {
    "cle": "rhums-arranges",
    "nom": "Rhums arrangés",
    "groupe": "boire",
    "note": "maison — 3,50 € le shot · 31,50 € le mètre"
  },
  {
    "cle": "gins-infuses",
    "nom": "Gins infusés",
    "groupe": "boire",
    "note": "maison"
  },
  {
    "cle": "spiritueux",
    "nom": "Spiritueux",
    "groupe": "boire",
    "note": "4 cl"
  },
  {
    "cle": "shots",
    "nom": "Shots",
    "groupe": "boire",
    "note": "à l'unité / le mètre"
  },
  {
    "cle": "les-virgins",
    "nom": "Les Virgins",
    "groupe": "boire",
    "note": "sans alcool"
  },
  {
    "cle": "softs",
    "nom": "Softs",
    "groupe": "boire"
  },
  {
    "cle": "boissons-chaudes",
    "nom": "Boissons chaudes",
    "groupe": "boire"
  },
  {
    "cle": "tapas-du-black-cat",
    "nom": "Tapas du Black Cat",
    "groupe": "manger",
    "note": "à partager"
  },
  {
    "cle": "burgers",
    "nom": "Burgers",
    "groupe": "manger"
  },
  {
    "cle": "plats",
    "nom": "Plats",
    "groupe": "manger"
  },
  {
    "cle": "desserts",
    "nom": "Desserts",
    "groupe": "manger",
    "note": "suppl. coco 0,50 € · boule vanille 1,50 € · chantilly 1 €"
  }
];

export const PRODUITS: Record<string, string>[] = [
  {
    "categorie": "cocktails",
    "nom": "Moscow Mule & dérivés",
    "description": "London, Caribbean, Mexican — vodka, jus citron vert, ginger beer",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Mojito",
    "description": "Menthe, citron vert, cassonade, rhum blanc, bitter",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Ti Punch",
    "description": "Rhum blanc, citron vert, cassonade",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Caïpirinha",
    "description": "Cachaça, citron vert, sucre blanc",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Cosmopolitan",
    "description": "Vodka, triple sec, citron jaune, jus de cranberry",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Cucus",
    "description": "Vodka, citron vert, jus de passion, jus d'hibiscus",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Margarita",
    "description": "Tequila, triple sec, citron vert, sirop d'agave",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Espresso Martini",
    "description": "Vodka, Kahlúa, espresso",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Espresso Tiramisu",
    "description": "Rhum infusé café, Baileys, amaretto, espresso, cacao",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Negroni",
    "description": "Gin, vermouth rouge, Campari",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Aperol Spritz",
    "description": "Aperol, sparkling, eau gazeuse, orange",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Sex on the Beach",
    "description": "Vodka, crème de pêche, jus d'ananas, jus de cranberry",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Piña Colada",
    "description": "Rhum, crème de coco, jus d'ananas, citron vert",
    "prix": "8,50 €"
  },
  {
    "categorie": "cocktails",
    "nom": "Long Island",
    "description": "Vodka, gin, tequila, rhum, citron vert, cola",
    "prix": "8,50 €"
  },
  {
    "categorie": "mixers",
    "nom": "Jäger Bomb",
    "prix": "8 €"
  },
  {
    "categorie": "mixers",
    "nom": "Gin Tonic",
    "prix": "7 €"
  },
  {
    "categorie": "mixers",
    "nom": "Whisky Cola",
    "prix": "7 €"
  },
  {
    "categorie": "mixers",
    "nom": "Rhum Cola ou Orange",
    "prix": "7 €"
  },
  {
    "categorie": "mixers",
    "nom": "Get Perrier",
    "prix": "7 €"
  },
  {
    "categorie": "mixers",
    "nom": "Vodka au choix",
    "description": "Ginger beer, pomme, ananas, orange ou cranberry",
    "prix": "7 €"
  },
  {
    "categorie": "mixers",
    "nom": "Vodka Energy",
    "prix": "8 €"
  },
  {
    "categorie": "bieres-pression",
    "nom": "Pelforth 5,5°",
    "description": "Blonde de caractère, à la fois ronde et désaltérante",
    "prix": "3,20 / 5,90 / 24 €"
  },
  {
    "categorie": "bieres-pression",
    "nom": "Cap d'Habitude 4,3°",
    "description": "Blonde légère aux notes de malt et de fleurs",
    "prix": "3,20 / 5,90 / 24 €"
  },
  {
    "categorie": "bieres-pression",
    "nom": "Pelican Rouge 7,5°",
    "description": "Bière rouge ronde, gourmande et fruitée",
    "prix": "3,50 / 6,50 / 28 €"
  },
  {
    "categorie": "bieres-pression",
    "nom": "Affligem Blanche 4,8°",
    "description": "Blanche rafraîchissante, notes d'agrumes et d'épices",
    "prix": "3,50 / 6,50 / 28 €"
  },
  {
    "categorie": "bieres-pression",
    "nom": "Gallia Nouveau Western IPA 6°",
    "description": "IPA d'une microbrasserie française, notes d'agrumes et de fruits tropicaux",
    "prix": "3,80 / 7 / 30 €"
  },
  {
    "categorie": "bieres-pression",
    "nom": "Chouffe 8°",
    "description": "Blonde belge épicée, légèrement fruitée",
    "prix": "4 / 7,50 / 33 €"
  },
  {
    "categorie": "bieres-pression",
    "nom": "Bière du moment",
    "description": "Demandez au comptoir"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Mort Subite Kriek 4°",
    "prix": "5 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Chimay Bleue 9°",
    "prix": "5,50 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Chimay Rouge 7°",
    "prix": "5,50 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Desperados 5,9°",
    "prix": "5,50 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Duvel 8,5°",
    "prix": "5,50 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Delirium 8,5°",
    "prix": "5,50 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Cuvée des Trolls 7°",
    "prix": "4,50 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Guinness 6°",
    "prix": "7 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Heineken 0°",
    "description": "Sans alcool",
    "prix": "4,50 €"
  },
  {
    "categorie": "bieres-bouteilles",
    "nom": "Cidre brut",
    "prix": "4 €"
  },
  {
    "categorie": "vins",
    "nom": "Blanc — Moelleux (St Luc)",
    "prix": "3,50 / 20 €"
  },
  {
    "categorie": "vins",
    "nom": "Blanc — Chardonnay",
    "prix": "3,50 / 20 €"
  },
  {
    "categorie": "vins",
    "nom": "Blanc — Viognier",
    "prix": "3,50 / 20 €"
  },
  {
    "categorie": "vins",
    "nom": "Prosecco",
    "prix": "4,80 / 24 €"
  },
  {
    "categorie": "vins",
    "nom": "Rouge — Loup dans la Bergerie",
    "description": "IGP Hérault",
    "prix": "4,60 / 22 €"
  },
  {
    "categorie": "vins",
    "nom": "Rosé — Petit Chaumont",
    "description": "IGP Sables de Camargue",
    "prix": "3,50 / 20 €"
  },
  {
    "categorie": "apero",
    "nom": "Ricard",
    "prix": "2,50 €"
  },
  {
    "categorie": "apero",
    "nom": "Mauresque, Perroquet, Tomate",
    "prix": "2,70 €"
  },
  {
    "categorie": "apero",
    "nom": "Kir",
    "prix": "3,80 €"
  },
  {
    "categorie": "apero",
    "nom": "Martini rouge / blanc",
    "prix": "4,50 €"
  },
  {
    "categorie": "apero",
    "nom": "Baileys",
    "prix": "6 €"
  },
  {
    "categorie": "apero",
    "nom": "Get 27",
    "prix": "6 €"
  },
  {
    "categorie": "rhums-arranges",
    "nom": "Orange / piment",
    "prix": "3,50 €"
  },
  {
    "categorie": "rhums-arranges",
    "nom": "Ananas / basilic / piment",
    "prix": "3,50 €"
  },
  {
    "categorie": "rhums-arranges",
    "nom": "Litchi / gingembre",
    "prix": "3,50 €"
  },
  {
    "categorie": "rhums-arranges",
    "nom": "Banane / café",
    "prix": "3,50 €"
  },
  {
    "categorie": "rhums-arranges",
    "nom": "Ananas / fève tonka",
    "prix": "3,50 €"
  },
  {
    "categorie": "rhums-arranges",
    "nom": "Limoncello",
    "prix": "3,50 €"
  },
  {
    "categorie": "gins-infuses",
    "nom": "Romarin",
    "prix": "7,50 €"
  },
  {
    "categorie": "gins-infuses",
    "nom": "Thym",
    "prix": "7,50 €"
  },
  {
    "categorie": "gins-infuses",
    "nom": "Lavande",
    "prix": "7,50 €"
  },
  {
    "categorie": "gins-infuses",
    "nom": "Jasmin",
    "prix": "7,50 €"
  },
  {
    "categorie": "gins-infuses",
    "nom": "Gin du moment",
    "prix": "7,50 €"
  },
  {
    "categorie": "spiritueux",
    "nom": "Vodka Grey Goose",
    "prix": "9 €"
  },
  {
    "categorie": "spiritueux",
    "nom": "Jack Daniel's",
    "description": "Whiskey",
    "prix": "8 €"
  },
  {
    "categorie": "spiritueux",
    "nom": "Jack Daniel's Single Barrel",
    "description": "Whiskey",
    "prix": "9 €"
  },
  {
    "categorie": "spiritueux",
    "nom": "Bruichladdich",
    "description": "Whisky d'Islay",
    "prix": "12 €"
  },
  {
    "categorie": "spiritueux",
    "nom": "Diplomático",
    "description": "Rhum",
    "prix": "8 €"
  },
  {
    "categorie": "spiritueux",
    "nom": "Bombay Sapphire",
    "description": "Gin",
    "prix": "8 €"
  },
  {
    "categorie": "spiritueux",
    "nom": "Hendrick's",
    "description": "Gin",
    "prix": "9 €"
  },
  {
    "categorie": "shots",
    "nom": "Tequila Paf · Mad Dog · TGV · Kiss Cool",
    "prix": "3 € / 27 €"
  },
  {
    "categorie": "shots",
    "nom": "Orgasme · Chartreuse · Jägermeister · Baby Guinness · Diplomático",
    "prix": "4 € / 36 €"
  },
  {
    "categorie": "les-virgins",
    "nom": "Virgin Mojito",
    "description": "Fraise, pomme, mangue ou cranberry — citron vert, menthe, eau gazeuse, cassonade"
  },
  {
    "categorie": "les-virgins",
    "nom": "Virgin Cucus",
    "description": "Passion, hibiscus, citron vert"
  },
  {
    "categorie": "les-virgins",
    "nom": "Piñata",
    "description": "Jus d'ananas, citron vert, sirop fève de tonka"
  },
  {
    "categorie": "softs",
    "nom": "Pepsi Max · Orangina · Perrier · Ice Tea · Limonade",
    "prix": "3,20 €"
  },
  {
    "categorie": "softs",
    "nom": "Trip CBD",
    "prix": "4,50 €"
  },
  {
    "categorie": "softs",
    "nom": "Jus de fruits",
    "description": "Orange, pomme, ananas, cranberry, abricot, mangue, passion",
    "prix": "3,50 €"
  },
  {
    "categorie": "softs",
    "nom": "Diabolo",
    "prix": "3,40 €"
  },
  {
    "categorie": "softs",
    "nom": "Sirop à l'eau",
    "description": "Grenadine, menthe, fraise, pêche, orgeat, violette",
    "prix": "2 €"
  },
  {
    "categorie": "softs",
    "nom": "Orange pressée",
    "prix": "5 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Café · Déca",
    "prix": "1,80 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Américain",
    "prix": "1,90 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Noisette",
    "prix": "2 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Double · Crème",
    "prix": "3,20 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Thés & infusions",
    "prix": "3,50 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Chocolat maison",
    "prix": "3,70 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Cappuccino",
    "prix": "4,20 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Chocolat viennois · Café viennois",
    "description": "Chantilly",
    "prix": "4,80 €"
  },
  {
    "categorie": "boissons-chaudes",
    "nom": "Grog",
    "prix": "6,80 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Frites maison",
    "prix": "4 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Frites maison au cheddar",
    "prix": "6 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Houmous",
    "prix": "6 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Caponata d'aubergines",
    "prix": "6 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Tapenade d'olives vertes",
    "description": "Câpres et cornichons",
    "prix": "6 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Nachos sauce cheddar",
    "prix": "6 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Pickles croustillants",
    "description": "Sauce yaourt",
    "prix": "7 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Nems de porc",
    "description": "Sauce thaï",
    "prix": "7 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Samossas végétariens",
    "description": "Sauce yaourt & menthe fraîche",
    "prix": "7 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Pélardon rôti",
    "description": "Miel et thym",
    "prix": "7 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Chorizos grillés",
    "description": "Sauce verte",
    "prix": "7 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Burratina",
    "description": "Pesto",
    "prix": "8 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Brochettes de poulet teriyaki (×3)",
    "prix": "8 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Chipirones à la plancha",
    "description": "Aïoli combava",
    "prix": "8 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Porc katsu",
    "description": "Sauce miel soja",
    "prix": "8 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Popcorn de poulet",
    "description": "Spicy mayo",
    "prix": "8 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Brochettes de bœuf teriyaki (×3)",
    "prix": "9 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Nachos al pastor",
    "description": "Effiloché de porc & sauce cheddar",
    "prix": "10 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Tataki de canard",
    "prix": "10 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Camembert rôti au pesto",
    "prix": "12 €"
  },
  {
    "categorie": "tapas-du-black-cat",
    "nom": "Duo de brochettes teriyaki (×6)",
    "prix": "16 €"
  },
  {
    "categorie": "burgers",
    "nom": "Cheese",
    "description": "Steak 100 g, ketchup, cheddar, pickles",
    "prix": "12,90 €"
  },
  {
    "categorie": "burgers",
    "nom": "Chick'n'Sweet",
    "description": "Cream cheese, poulet croustillant, tomate, confiture d'abricot, pickles de chou",
    "prix": "14 €"
  },
  {
    "categorie": "burgers",
    "nom": "Black Cat's",
    "description": "Steak 150 g, lard, burrata, pesto, roquette, oignons rouges",
    "prix": "16 €"
  },
  {
    "categorie": "burgers",
    "nom": "Cajun Burger",
    "description": "Steak 150 g, chorizo, chèvre, mayo cajun, miel, roquette",
    "prix": "16 €"
  },
  {
    "categorie": "plats",
    "nom": "Croque truffé",
    "description": "Pain de campagne, jambon, comté, crème de truffe, mayo truffée, salade, frites",
    "prix": "12,90 €"
  },
  {
    "categorie": "plats",
    "nom": "Wrap végétarien",
    "description": "Galette, sauce yaourt aux herbes, houmous, pickles de chou, concombre, salade, tomate, falafel — salade ou frites",
    "prix": "13 €"
  },
  {
    "categorie": "plats",
    "nom": "Fish and Chips",
    "description": "Cabillaud pané au panko et sésame, sauce thaï",
    "prix": "15,90 €"
  },
  {
    "categorie": "plats",
    "nom": "Bavette à l'échalote",
    "description": "Frites, salade",
    "prix": "17 €"
  },
  {
    "categorie": "desserts",
    "nom": "Café gourmand",
    "prix": "5,90 €"
  },
  {
    "categorie": "desserts",
    "nom": "Fondant au chocolat",
    "prix": "5,90 €"
  },
  {
    "categorie": "desserts",
    "nom": "Brioche perdue",
    "description": "Nutella ou érable",
    "prix": "5,90 €"
  },
  {
    "categorie": "desserts",
    "nom": "Crème brûlée",
    "prix": "5,90 €"
  },
  {
    "categorie": "desserts",
    "nom": "Crêpe sucre",
    "prix": "3 €"
  },
  {
    "categorie": "desserts",
    "nom": "Crêpe sucre-citron · miel · confiture · chocolat",
    "description": "Confiture fraise ou abricot",
    "prix": "3,50 €"
  },
  {
    "categorie": "desserts",
    "nom": "Crêpe sirop d'érable · Nutella · caramel beurre salé",
    "prix": "4 €"
  }
];

export const EVENEMENTS: Record<string, string>[] = [
  {
    "titre": "Tournoi de billard",
    "debut": "2026-10-02T20:00",
    "description": "Inscription au comptoir, lots pour le podium."
  },
  {
    "titre": "DJ Set",
    "debut": "2026-10-04T21:00",
    "description": "Rock, post-punk et new wave toute la soirée."
  },
  {
    "titre": "Blind test",
    "debut": "2026-10-09T20:30",
    "description": "En équipe, jusqu'à 6 joueurs."
  },
  {
    "titre": "Afterwork",
    "debut": "2026-10-16T18:00",
    "description": "Happy hour prolongé sur les pintes."
  },
  {
    "titre": "Tournoi de billard",
    "debut": "2026-10-23T20:00",
    "description": "Édition mensuelle, élimination directe."
  },
  {
    "titre": "Halloween",
    "debut": "2026-10-31T21:00",
    "description": "Soirée costumée, cocktails de saison."
  }
];
