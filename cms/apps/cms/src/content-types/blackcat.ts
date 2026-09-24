import type { ContentSchema } from "./types";

// Les prix restent du texte libre : la carte affiche aussi « 3,20 / 5,90 / 24 € »,
// « 3 € / 27 € » ou rien du tout (Les Virgins, bière du moment).
const PRICE_HELP = "Tel qu'affiché sur le site. Ex. : 8,50 €, 3,20 / 5,90 / 24 €, 3 € / 27 €. Laissez vide pour ne pas afficher de prix.";

/** Types de contenu du site « The Black Cat » (bar · billard · cuisine, Montpellier). */
export const blackcatSchema: ContentSchema = {
  key: "blackcat",
  // Identité du site (assets/css/style.css) : --c1 noir, --c2 blanc os, --c3 or.
  // Le back-office est sur fond clair : l'or est assombri pour rester lisible
  // en texte blanc sur les boutons, et le noir du site sert de couleur de texte.
  branding: {
    primary: "#8a6a2f",
    primaryHover: "#6d5322",
    primarySoft: "#f3ead8",
    accent: "#c9a468",
    background: "#f6f2e8",
    text: "#17150f",
    logo: "/clients/blackcat/logo.png",
    fontTitle: "'Anton', system-ui, sans-serif",
    fontsHref: "https://fonts.googleapis.com/css2?family=Anton&display=swap",
  },
  types: [
    {
      // Les produits de la carte : cocktails, bières, tapas, burgers, desserts…
      // Tous vivent dans le même type, c'est la catégorie qui les range.
      key: "produit",
      slug: "produits",
      labelSingular: "produit",
      labelPlural: "produits",
      icon: "🍸",
      nav: { group: "La Carte", tab: "Produits" },
      titleField: "nom",
      subtitleField: "prix",
      filterField: "categorie",
      fields: [
        {
          name: "nom",
          label: "Nom du produit",
          kind: "text",
          required: true,
          maxLength: 160,
          placeholder: "Ex. : Espresso Martini",
        },
        {
          name: "categorie",
          label: "Catégorie",
          kind: "reference",
          to: "categorie",
          required: true,
          help: "Les catégories s'ajoutent et se renomment dans l'onglet « Catégories ».",
        },
        {
          name: "description",
          label: "Description",
          kind: "textarea",
          maxLength: 600,
          help: "Facultative. Les ingrédients, l'accompagnement, une précision de service.",
        },
        {
          name: "prix",
          label: "Prix",
          kind: "text",
          maxLength: 60,
          placeholder: "8,50 €",
          help: PRICE_HELP,
        },
      ],
    },
    {
      // Catégories de la carte. L'ordre de cette liste est celui du site :
      // les flèches ↑ ↓ règlent la position. Une catégorie publiée apparaît sur
      // la carte même si elle ne contient encore aucun produit.
      key: "categorie",
      slug: "categories",
      labelSingular: "catégorie",
      labelPlural: "catégories",
      feminine: true,
      icon: "🏷️",
      nav: { group: "La Carte", tab: "Catégories" },
      titleField: "nom",
      subtitleField: "note",
      filterField: "groupe",
      fields: [
        {
          name: "nom",
          label: "Nom de la catégorie",
          kind: "text",
          required: true,
          maxLength: 120,
          placeholder: "Ex. : Bières pression",
          help: "Affiché sur la carte du site. Ajoutez ensuite ses produits dans l'onglet « Produits ».",
        },
        {
          name: "groupe",
          label: "Partie de la carte",
          kind: "select",
          required: true,
          filter: true,
          default: "boire",
          options: [
            { value: "boire", label: "Pour boire" },
            { value: "manger", label: "Pour manger" },
          ],
          help: "Les deux grands titres de la page « La Carte ».",
        },
        {
          name: "note",
          label: "Précision",
          kind: "text",
          maxLength: 160,
          placeholder: "Ex. : 25 cl / 50 cl / girafe 2,5 L",
          help: "Facultative. Affichée en pastille or à côté du nom de la catégorie.",
        },
      ],
    },
    {
      // Événements : la page du site affiche le prochain en grand, puis les
      // suivants dans un rail horizontal. Les dates passées disparaissent seules.
      key: "evenement",
      slug: "evenements",
      labelSingular: "événement",
      labelPlural: "événements",
      icon: "📅",
      nav: { group: "Événements", tab: "Événements" },
      titleField: "titre",
      subtitleField: "description",
      schedule: { startField: "debut" },
      fields: [
        {
          name: "titre",
          label: "Titre",
          kind: "text",
          required: true,
          maxLength: 120,
          placeholder: "Ex. : Tournoi de billard",
        },
        {
          name: "debut",
          label: "Date et heure",
          kind: "datetime",
          required: true,
          help: "L'événement disparaît du site tout seul une fois la date passée.",
        },
        {
          name: "description",
          label: "Description",
          kind: "textarea",
          maxLength: 600,
          help: "Ex. : Inscription au comptoir, lots pour le podium.",
        },
      ],
    },
  ],
};
