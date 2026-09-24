/**
 * Définition déclarative des types de contenu d'un client (Principe II de la constitution) :
 * le formulaire du back-office, la validation et l'API sont générés à partir de ces objets.
 */

interface BaseField {
  name: string;
  label: string;
  /** Obligatoire pour publier (seulement quand le champ est affiché, voir `showIf`). */
  required?: boolean;
  help?: string;
  /**
   * N'affiche le champ que si un autre champ (select) a l'une des valeurs indiquées.
   * Ex. « Région » seulement pour la catégorie « vins ». Masqué, il n'est pas enregistré.
   */
  showIf?: { field: string; in: string[] };
  /** Champ select proposé comme filtre (back-office, API et site). */
  filter?: boolean;
}

export type Field =
  | (BaseField & { kind: "text"; maxLength?: number; placeholder?: string })
  | (BaseField & { kind: "textarea"; maxLength?: number })
  | (BaseField & { kind: "select"; options: { value: string; label: string }[]; default?: string })
  | (BaseField & { kind: "price" })
  | (BaseField & { kind: "integer"; min?: number; max?: number })
  | (BaseField & { kind: "boolean"; default?: boolean })
  | (BaseField & { kind: "datetime" })
  | (BaseField & { kind: "url" })
  | (BaseField & { kind: "image" })
  /**
   * Lien vers un contenu d'un autre type du même client (ex. la section d'un cocktail). Les
   * choix proposés sont les contenus de ce type, présentés par leur titre (`titleField`).
   */
  | (BaseField & { kind: "reference"; to: string });

export type FieldKind = Field["kind"];

export interface ContentType {
  /** Identifiant technique, utilisé dans l'API : /api/v1/content/<key>. */
  key: string;
  /** Segment d'URL du back-office : /<slug>. */
  slug: string;
  labelSingular: string;
  labelPlural: string;
  /** Genre grammatical, pour les libellés (« un produit », « une actualité »). */
  feminine?: boolean;
  /** Pictogramme des tuiles et des listes (par défaut 📄, ou 📅 pour un contenu daté). */
  icon?: string;
  /**
   * Regroupe plusieurs types sous une seule entrée du menu (`group`), avec un onglet par type
   * (`tab`). Ex. « Cocktail » : les cocktails et les titres des sections.
   */
  nav?: { group: string; tab: string };
  /** Champ utilisé comme titre dans les listes. */
  titleField: string;
  /** Champ affiché sous le titre dans les listes. */
  subtitleField?: string;
  imageField?: string;
  fields: Field[];
  /** Filtre principal (ex. la catégorie), présenté en onglets ; les autres filtres en dépendent. */
  filterField?: string;
  /** Champ booléen mis en avant par un badge (ex. « Nouveauté »). */
  badgeField?: string;
  /**
   * Contenus datés : triés par date, et ceux dont la fin (ou le début) est passée ne sont
   * plus exposés publiquement.
   */
  schedule?: { startField: string; endField?: string };
}

/**
 * Habillage du back-office aux couleurs du client. Tout est facultatif : sans habillage,
 * le CMS garde ses couleurs neutres.
 */
export interface Branding {
  /** Couleur principale : boutons, liens, onglet actif. */
  primary: string;
  primaryHover: string;
  /** Fond clair associé à la couleur principale (onglet actif, badges). */
  primarySoft: string;
  /** Couleur d'accent, utilisée avec parcimonie (badge « Nouveauté », détails). */
  accent: string;
  /** Fond des pages. */
  background: string;
  /** Couleur du texte. */
  text: string;
  /** Logo (chemin dans /public), affiché en petit dans l'en-tête et sur la page de connexion. */
  logo?: string;
  /** Police des titres (doit être chargée par `fontsHref`). */
  fontTitle?: string;
  /** Feuille de style Google Fonts pour les polices ci-dessus. */
  fontsHref?: string;
}

export interface ContentSchema {
  key: string;
  branding?: Branding;
  types: ContentType[];
}
