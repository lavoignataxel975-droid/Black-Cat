import { z } from "zod";
import { apertureSchema } from "./aperture";
import { blackcatSchema } from "./blackcat";
import { lacaveSchema } from "./lacave";
import type { ContentSchema, ContentType, Field } from "./types";

export type { ContentSchema, ContentType, Field } from "./types";

const schemas: Record<string, ContentSchema> = {
  [blackcatSchema.key]: blackcatSchema,
  // Schéma du bar Aperture, conservé : cette copie en est issue.
  [apertureSchema.key]: apertureSchema,
  // Schéma du CMS d'origine (La Cave), conservé comme exemple complet : les tests du moteur
  // s'appuient dessus (filtres, badge, contenus datés, images).
  [lacaveSchema.key]: lacaveSchema,
};

/** Types affichés ensemble sous une même entrée du menu (voir `ContentType.nav`). */
export function navGroup(schemaKey: string, type: ContentType): ContentType[] {
  if (!type.nav) return [type];
  return getSchema(schemaKey).types.filter((t) => t.nav?.group === type.nav!.group);
}

export function getSchema(schemaKey: string): ContentSchema {
  const schema = schemas[schemaKey];
  if (!schema) throw new Error(`Jeu de types de contenu inconnu : ${schemaKey}`);
  return schema;
}

export function findType(schemaKey: string, by: { key?: string; slug?: string }) {
  return getSchema(schemaKey).types.find(
    (t) => (by.key !== undefined && t.key === by.key) || (by.slug !== undefined && t.slug === by.slug),
  );
}

/** Le champ est-il affiché pour ces données (condition `showIf`) ? */
export function isFieldVisible(field: Field, data: Record<string, unknown>) {
  return !field.showIf || field.showIf.in.includes(String(data[field.showIf.field] ?? ""));
}

export type SelectField = Extract<Field, { kind: "select" }>;

/**
 * Filtres proposés : le filtre principal et les champs `filter`. Avec `data`, seulement ceux
 * qui s'appliquent (ex. pour la catégorie « vins » : couleur et région).
 */
export function filterFields(type: ContentType, data?: Record<string, unknown>): SelectField[] {
  return type.fields.filter(
    (f): f is SelectField =>
      f.kind === "select" && (f.filter === true || f.name === type.filterField) && (!data || isFieldVisible(f, data)),
  );
}

export type ReferenceField = Extract<Field, { kind: "reference" }>;
export type Option = { value: string; label: string };

export function referenceFields(type: ContentType): ReferenceField[] {
  return type.fields.filter((f): f is ReferenceField => f.kind === "reference");
}

/** Noms des champs sur lesquels on peut filtrer (selects filtres et références filtres). */
export function filterableNames(type: ContentType): Set<string> {
  return new Set(
    type.fields
      .filter((f) => (f.kind === "select" || f.kind === "reference") && (f.filter === true || f.name === type.filterField))
      .map((f) => f.name),
  );
}

/**
 * Type prêt pour l'affichage : chaque champ référence devient un select dont les choix sont
 * les contenus liés (`options`, par nom de champ). Le formulaire, les onglets de filtre et les
 * libellés fonctionnent alors comme pour un select. `defaults` préremplit un nouveau contenu.
 */
export function withReferenceOptions(
  type: ContentType,
  options: Record<string, Option[]>,
  defaults: Record<string, string | undefined> = {},
): ContentType {
  return {
    ...type,
    fields: type.fields.map((f): Field => {
      if (f.kind !== "reference") return f;
      const { to: _to, ...base } = f;
      const opts = options[f.name] ?? [];
      const wanted = defaults[f.name];
      return { ...base, kind: "select", options: opts, default: opts.some((o) => o.value === wanted) ? wanted : opts[0]?.value };
    }),
  };
}

/** Libellé lisible d'une valeur de champ select. */
export function optionLabel(type: ContentType, fieldName: string, value: unknown) {
  const field = type.fields.find((f) => f.name === fieldName);
  if (field?.kind !== "select") return String(value ?? "");
  return field.options.find((o) => o.value === value)?.label ?? String(value ?? "");
}

/** Durée d'affichage d'un événement sans date de fin. */
export const DEFAULT_EVENT_DURATION_MS = 6 * 60 * 60 * 1000;

const empty = (v: unknown) => v === undefined || v === null || v === "";

function fieldSchema(field: Field): z.ZodType {
  const req = `« ${field.label} » est obligatoire.`;
  switch (field.kind) {
    case "text":
    case "textarea": {
      const max = field.maxLength ?? 5000;
      return z
        .string({ error: req })
        .trim()
        .max(max, `« ${field.label} » ne doit pas dépasser ${max} caractères.`);
    }
    case "select":
      return z.enum(field.options.map((o) => o.value) as [string, ...string[]], {
        error: `Choisissez une valeur pour « ${field.label} ».`,
      });
    case "price":
      return z.coerce
        .number({ error: `« ${field.label} » doit être un nombre, par exemple 12,50.` })
        .min(0, `« ${field.label} » ne peut pas être négatif.`)
        .max(1_000_000, `« ${field.label} » est trop élevé.`)
        .transform((n) => Math.round(n * 100) / 100);
    case "integer":
      return z.coerce
        .number({ error: `« ${field.label} » doit être un nombre entier.` })
        .int(`« ${field.label} » doit être un nombre entier.`)
        .min(field.min ?? -1e9, `« ${field.label} » doit être au moins ${field.min}.`)
        .max(field.max ?? 1e9, `« ${field.label} » doit être au plus ${field.max}.`);
    case "boolean":
      return z.boolean();
    case "datetime":
      return z
        .string({ error: req })
        .refine((s) => !Number.isNaN(Date.parse(s)), `« ${field.label} » n'est pas une date valide.`)
        .transform((s) => new Date(s).toISOString());
    case "url":
      return z
        .url({ error: `« ${field.label} » doit être une adresse web commençant par https://` })
        .refine((u) => /^https?:\/\//i.test(u), `« ${field.label} » doit commencer par https://`);
    case "image":
      return z.uuid({ error: `« ${field.label} » : image invalide.` });
    case "reference":
      return z.uuid({ error: `Choisissez une valeur pour « ${field.label} ».` });
  }
}

export interface ValidationResult {
  data: Record<string, unknown>;
  /** Erreurs par nom de champ, en français, prêtes à afficher. */
  errors: Record<string, string>;
}

/**
 * Valide et normalise les données d'un contenu. Avec `forPublish`, les champs obligatoires
 * vides sont des erreurs ; un brouillon peut être enregistré incomplet.
 */
export function validateContent(
  type: ContentType,
  input: Record<string, unknown>,
  { forPublish }: { forPublish: boolean },
): ValidationResult {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of type.fields) {
    // Les conditions portent sur des champs placés avant : `data` est déjà validé pour eux.
    if (!isFieldVisible(field, data)) continue;
    const raw = input[field.name];
    if (field.kind === "boolean") {
      data[field.name] = raw === true || raw === "true" || raw === "on";
      continue;
    }
    if (empty(raw)) {
      if (field.required && forPublish) errors[field.name] = `« ${field.label} » est obligatoire.`;
      continue;
    }
    const value = typeof raw === "string" && field.kind === "price" ? raw.replace(",", ".") : raw;
    const parsed = fieldSchema(field).safeParse(value);
    if (parsed.success) {
      if (!empty(parsed.data)) data[field.name] = parsed.data;
      else if (field.required && forPublish) errors[field.name] = `« ${field.label} » est obligatoire.`;
    } else {
      errors[field.name] = parsed.error.issues[0]?.message ?? `« ${field.label} » est invalide.`;
    }
  }

  const sched = type.schedule;
  if (sched?.endField && typeof data[sched.startField] === "string" && typeof data[sched.endField] === "string") {
    if (Date.parse(data[sched.endField] as string) < Date.parse(data[sched.startField] as string)) {
      errors[sched.endField] = "La fin doit être après le début.";
    }
  }

  return { data, errors };
}

/** Un contenu daté est-il encore à venir ou en cours à l'instant `now` ? */
export function isCurrentOrUpcoming(type: ContentType, data: Record<string, unknown>, now: Date) {
  if (!type.schedule) return true;
  const start = Date.parse(String(data[type.schedule.startField] ?? ""));
  if (Number.isNaN(start)) return false;
  const endRaw = type.schedule.endField ? data[type.schedule.endField] : undefined;
  const end = endRaw ? Date.parse(String(endRaw)) : start + DEFAULT_EVENT_DURATION_MS;
  return end >= now.getTime();
}

export function sortKey(type: ContentType, data: Record<string, unknown>, position: number) {
  return type.schedule ? Date.parse(String(data[type.schedule.startField] ?? "")) || 0 : position;
}
