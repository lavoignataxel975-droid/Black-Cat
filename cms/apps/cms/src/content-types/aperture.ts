import type { ContentSchema } from "./types";

// Les prix restent du texte : la carte affiche aussi « 7 € / 30 € » ou « 15 – 26 € ».
const PRICE_HELP = "Tel qu'affiché sur le site. Ex. : 13 €, 7 € / 30 €, 15 – 26 €.";

/** Types de contenu du site « Aperture » (bar à cocktails, Montpellier). */
export const apertureSchema: ContentSchema = {
  key: "aperture",
  // Couleurs et polices du site (assets/styles.css : --c1, --c2, --c3). Le rouge néon est
  // assombri pour rester lisible en texte blanc sur les boutons.
  branding: {
    primary: "#c62a17",
    primaryHover: "#a32010",
    primarySoft: "#f9e2dd",
    accent: "#c62a17",
    background: "#f4efe3",
    text: "#17160f",
    logo: "/clients/aperture/logo.png",
    fontTitle: "'Kanit', system-ui, sans-serif",
    fontsHref: "https://fonts.googleapis.com/css2?family=Kanit:wght@600&display=swap",
  },
  types: [
    {
      key: "cocktail",
      slug: "cocktails",
      labelSingular: "cocktail",
      labelPlural: "cocktails",
      icon: "🍸",
      nav: { group: "Cocktail", tab: "Cocktails" },
      titleField: "nom",
      filterField: "section",
      fields: [
        { name: "nom", label: "Nom du cocktail", kind: "text", required: true, maxLength: 120,
          placeholder: "Ex. : Fig Negroni" },
        { name: "section", label: "Section de la carte", kind: "reference", to: "section", required: true,
          help: "Les sections s'ajoutent et se renomment dans l'onglet « Titres des sections »." },
        { name: "description", label: "Description", kind: "textarea", maxLength: 600 },
        { name: "prix", label: "Prix", kind: "text", maxLength: 40, placeholder: "13 €", help: PRICE_HELP },
      ],
    },
    {
      // Sections de la carte : l'ordre de la liste est celui du site. Toute section publiée
      // apparaît sur la carte, même sans cocktail.
      key: "section",
      slug: "sections",
      labelSingular: "section",
      labelPlural: "sections",
      feminine: true,
      icon: "🏷️",
      nav: { group: "Cocktail", tab: "Titres des sections" },
      titleField: "titre",
      fields: [
        { name: "titre", label: "Titre de la section", kind: "text", required: true, maxLength: 120,
          placeholder: "Ex. : Signatures — Lab Notes 001",
          help: "Affiché sur la carte du site. Ajoutez ensuite les cocktails de la section dans l'onglet « Cocktails »." },
      ],
    },
    {
      key: "snack",
      slug: "snacks",
      labelSingular: "snack",
      labelPlural: "snacks",
      icon: "🍽️",
      nav: { group: "Snack", tab: "Snacks" },
      titleField: "titre",
      fields: [
        { name: "titre", label: "Titre du snack", kind: "text", required: true, maxLength: 200,
          placeholder: "Ex. : Tarama maison, œufs de truite" },
        { name: "prix", label: "Prix", kind: "text", maxLength: 40, placeholder: "8 €", help: PRICE_HELP },
      ],
    },
  ],
};
