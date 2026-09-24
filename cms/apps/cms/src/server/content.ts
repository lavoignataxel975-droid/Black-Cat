import { and, asc, desc, eq, isNotNull, isNull, lt, max, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { contentItems, contentVersions, type ContentData, type ContentItem } from "@/db/schema";
import {
  filterableNames,
  findType,
  getSchema,
  referenceFields,
  sortKey,
  validateContent,
  type ContentType,
  type Option,
} from "@/content-types";
import { audit, loadTenantFor, type Actor } from "./access";
import { AppError, conflict, invalid, notFound } from "./errors";

export const TRASH_RETENTION_DAYS = 30;

async function resolveType(db: Db, actor: Actor, tenantId: string, typeKey: string) {
  const tenant = await loadTenantFor(db, actor, tenantId);
  const type = findType(tenant.schemaKey, { key: typeKey });
  if (!type) throw notFound("Type de contenu");
  return { tenant, type };
}

/** Charge un contenu en vérifiant qu'il appartient bien au client de l'utilisateur. */
async function loadItem(db: Db, actor: Actor, tenantId: string, id: string) {
  await loadTenantFor(db, actor, tenantId);
  const [item] = await db
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.id, id), eq(contentItems.tenantId, tenantId)));
  if (!item) throw notFound("Contenu");
  return item;
}

export type ItemStatus = "draft" | "published" | "changed" | "hidden";

/** État présenté à l'éditeur. */
export function itemStatus(item: ContentItem): ItemStatus {
  if (item.isPublished) {
    return JSON.stringify(item.draftData) === JSON.stringify(item.publishedData) ? "published" : "changed";
  }
  return item.publishedData ? "hidden" : "draft";
}

export async function listItems(
  db: Db,
  actor: Actor,
  tenantId: string,
  typeKey: string,
  opts: { trash?: boolean; search?: string; filters?: Record<string, string> } = {},
) {
  const { type } = await resolveType(db, actor, tenantId, typeKey);
  if (opts.trash) await purgeTrash(db, tenantId);
  const rows = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.tenantId, tenantId),
        eq(contentItems.type, typeKey),
        opts.trash ? isNotNull(contentItems.deletedAt) : isNull(contentItems.deletedAt),
      ),
    )
    .orderBy(asc(contentItems.position), desc(contentItems.createdAt));

  const search = opts.search?.trim().toLowerCase();
  return rows
    .filter((r) => matchesFilters(type, r.draftData, opts.filters))
    .filter(
      (r) =>
        !search ||
        type.fields.some(
          (f) => (f.kind === "text" || f.kind === "textarea") &&
            String(r.draftData[f.name] ?? "").toLowerCase().includes(search),
        ),
    )
    .sort((a, b) =>
      type.schedule
        ? sortKey(type, a.draftData, a.position) - sortKey(type, b.draftData, b.position)
        : 0,
    );
}

export async function getItem(db: Db, actor: Actor, tenantId: string, id: string) {
  return loadItem(db, actor, tenantId, id);
}

export async function createItem(
  db: Db,
  actor: Actor,
  tenantId: string,
  typeKey: string,
  input: Record<string, unknown>,
  { publish }: { publish: boolean },
) {
  const { type } = await resolveType(db, actor, tenantId, typeKey);
  const { data, errors } = validateContent(type, input, { forPublish: publish });
  Object.assign(errors, await checkReferences(db, actor, tenantId, type, data));
  if (Object.keys(errors).length) throw invalid(errors);

  // Nouveau contenu placé en tête de liste.
  const [{ minPos } = { minPos: 0 }] = await db
    .select({ minPos: sql<number>`coalesce(min(${contentItems.position}), 0)` })
    .from(contentItems)
    .where(and(eq(contentItems.tenantId, tenantId), eq(contentItems.type, typeKey)));

  const [item] = await db
    .insert(contentItems)
    .values({
      tenantId,
      type: typeKey,
      draftData: data,
      publishedData: publish ? data : null,
      isPublished: publish,
      publishedAt: publish ? new Date() : null,
      position: Number(minPos) - 1,
    })
    .returning();
  if (publish) await addVersion(db, item!, data, actor);
  await audit(db, {
    tenantId,
    userId: actor.id,
    action: publish ? "content.published" : "content.created",
    details: { type: typeKey, id: item!.id, title: data[type.titleField] },
  });
  return item!;
}

/**
 * Enregistre le brouillon, et le publie si demandé. `revision` est la révision lue par
 * l'éditeur : si le contenu a changé entre-temps, l'enregistrement est refusé.
 */
export async function saveItem(
  db: Db,
  actor: Actor,
  tenantId: string,
  id: string,
  input: Record<string, unknown>,
  { publish, revision }: { publish: boolean; revision: number },
) {
  const item = await loadItem(db, actor, tenantId, id);
  const type = await typeOf(db, actor, item);
  if (item.deletedAt) throw new AppError("Ce contenu est dans la corbeille.", 409);
  const { data, errors } = validateContent(type, input, { forPublish: publish });
  Object.assign(errors, await checkReferences(db, actor, tenantId, type, data));
  if (Object.keys(errors).length) throw invalid(errors);

  const [updated] = await db
    .update(contentItems)
    .set({
      draftData: data,
      ...(publish ? { publishedData: data, isPublished: true, publishedAt: new Date() } : {}),
      revision: item.revision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contentItems.id, id),
        eq(contentItems.tenantId, tenantId),
        eq(contentItems.revision, revision),
      ),
    )
    .returning();
  if (!updated) {
    throw conflict(
      "Ce contenu a été modifié par quelqu'un d'autre pendant votre saisie. " +
        "Rechargez la page pour voir la dernière version (vos modifications n'ont pas été enregistrées).",
    );
  }
  if (publish) await addVersion(db, updated, data, actor);
  await audit(db, {
    tenantId,
    userId: actor.id,
    action: publish ? "content.published" : "content.saved",
    details: { type: item.type, id, title: data[type.titleField] },
  });
  return updated;
}

export async function setPublished(db: Db, actor: Actor, tenantId: string, id: string, visible: boolean) {
  const item = await loadItem(db, actor, tenantId, id);
  if (visible && !item.publishedData) {
    throw new AppError("Ce contenu n'a jamais été publié : ouvrez-le et cliquez sur « Publier ».", 422);
  }
  await db
    .update(contentItems)
    .set({ isPublished: visible, revision: item.revision + 1, updatedAt: new Date() })
    .where(and(eq(contentItems.id, id), eq(contentItems.tenantId, tenantId)));
  await audit(db, {
    tenantId,
    userId: actor.id,
    action: visible ? "content.shown" : "content.hidden",
    details: { type: item.type, id },
  });
}

/** Mise à la corbeille (récupérable pendant 30 jours). */
export async function trashItem(db: Db, actor: Actor, tenantId: string, id: string) {
  const item = await loadItem(db, actor, tenantId, id);
  const type = await typeOf(db, actor, item);
  const users = await referencingItems(db, actor, tenantId, item);
  if (users.length) {
    const n = users.length;
    const other = users[0]!.type;
    throw new AppError(
      `Suppression impossible : ${n} ${n > 1 ? `${other.labelPlural} sont` : `${other.labelSingular} est`} encore ` +
        `dans ${type.feminine ? "cette" : "ce"} ${type.labelSingular}. Déplacez-les ou supprimez-les d'abord.`,
      409,
    );
  }
  await db
    .update(contentItems)
    .set({ deletedAt: new Date(), revision: item.revision + 1 })
    .where(and(eq(contentItems.id, id), eq(contentItems.tenantId, tenantId)));
  await audit(db, { tenantId, userId: actor.id, action: "content.trashed", details: { type: item.type, id } });
}

export async function restoreItem(db: Db, actor: Actor, tenantId: string, id: string) {
  const item = await loadItem(db, actor, tenantId, id);
  await db
    .update(contentItems)
    .set({ deletedAt: null, revision: item.revision + 1 })
    .where(and(eq(contentItems.id, id), eq(contentItems.tenantId, tenantId)));
  await audit(db, { tenantId, userId: actor.id, action: "content.restored", details: { type: item.type, id } });
}

async function purgeTrash(db: Db, tenantId: string) {
  const limit = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db
    .delete(contentItems)
    .where(and(eq(contentItems.tenantId, tenantId), lt(contentItems.deletedAt, limit)));
}

/**
 * Déplace un contenu d'un cran vers le haut ou le bas dans l'ordre d'affichage. Avec `filters`
 * (onglet affiché), il échange sa place avec son voisin dans cet onglet.
 */
export async function moveItem(
  db: Db,
  actor: Actor,
  tenantId: string,
  id: string,
  direction: "up" | "down",
  filters: Record<string, string> = {},
) {
  const item = await loadItem(db, actor, tenantId, id);
  const type = await typeOf(db, actor, item);
  const siblings = await listItems(db, actor, tenantId, item.type);
  const visible = siblings.filter((s) => matchesFilters(type, s.draftData, filters));
  const shown = visible.findIndex((s) => s.id === id);
  const target = visible[direction === "up" ? shown - 1 : shown + 1];
  if (shown < 0 || !target) return;
  // Renumérote toute la liste pour garantir des positions distinctes.
  const ordered = siblings.map((s) => s.id);
  const index = ordered.indexOf(id);
  const targetIndex = ordered.indexOf(target.id);
  ordered[index] = target.id;
  ordered[targetIndex] = id;
  await db.transaction(async (tx) => {
    for (const [position, itemId] of ordered.entries()) {
      await tx
        .update(contentItems)
        .set({ position })
        .where(and(eq(contentItems.id, itemId), eq(contentItems.tenantId, tenantId)));
    }
  });
}

async function addVersion(db: Db, item: ContentItem, data: ContentData, actor: Actor) {
  const [{ last } = { last: 0 }] = await db
    .select({ last: max(contentVersions.number) })
    .from(contentVersions)
    .where(eq(contentVersions.itemId, item.id));
  await db.insert(contentVersions).values({
    tenantId: item.tenantId,
    itemId: item.id,
    number: (last ?? 0) + 1,
    data,
    authorId: actor.id,
  });
}

export async function listVersions(db: Db, actor: Actor, tenantId: string, id: string) {
  await loadItem(db, actor, tenantId, id);
  return db
    .select()
    .from(contentVersions)
    .where(and(eq(contentVersions.itemId, id), eq(contentVersions.tenantId, tenantId)))
    .orderBy(desc(contentVersions.number));
}

/** Recopie une version publiée dans le brouillon ; l'éditeur la publie ensuite. */
export async function restoreVersion(db: Db, actor: Actor, tenantId: string, id: string, versionId: string) {
  const item = await loadItem(db, actor, tenantId, id);
  const [version] = await db
    .select()
    .from(contentVersions)
    .where(
      and(
        eq(contentVersions.id, versionId),
        eq(contentVersions.itemId, id),
        eq(contentVersions.tenantId, tenantId),
      ),
    );
  if (!version) throw notFound("Version");
  await db
    .update(contentItems)
    .set({ draftData: version.data, revision: item.revision + 1, updatedAt: new Date() })
    .where(and(eq(contentItems.id, id), eq(contentItems.tenantId, tenantId)));
  await audit(db, {
    tenantId,
    userId: actor.id,
    action: "content.version_restored",
    details: { type: item.type, id, version: version.number },
  });
}

/**
 * Le contenu correspond-il aux filtres (champ → valeur) ? Seuls les champs déclarés comme
 * filtres sont pris en compte ; les autres paramètres sont ignorés.
 */
export function matchesFilters(type: ContentType, data: Record<string, unknown>, filters: Record<string, string> = {}) {
  const allowed = filterableNames(type);
  return Object.entries(filters).every(([field, value]) => !allowed.has(field) || !value || data[field] === value);
}

async function typeOf(db: Db, actor: Actor, item: ContentItem): Promise<ContentType> {
  return (await resolveType(db, actor, item.tenantId, item.type)).type;
}

// ---------------------------------------------------------------- Références

/**
 * Choix proposés pour chaque champ référence d'un type : les contenus liés (hors corbeille),
 * dans l'ordre de leur liste, présentés par leur titre.
 */
export async function referenceOptions(db: Db, actor: Actor, tenantId: string, type: ContentType) {
  const { tenant } = await resolveType(db, actor, tenantId, type.key);
  const out: Record<string, Option[]> = {};
  for (const field of referenceFields(type)) {
    const target = findType(tenant.schemaKey, { key: field.to });
    if (!target) continue;
    const rows = await listItems(db, actor, tenantId, field.to);
    out[field.name] = rows.map((r) => ({
      value: r.id,
      label: String(r.draftData[target.titleField] || "(sans titre)") + (r.isPublished ? "" : " (pas sur le site)"),
    }));
  }
  return out;
}

/** Erreurs pour les références qui ne désignent pas un contenu existant du bon type. */
async function checkReferences(db: Db, actor: Actor, tenantId: string, type: ContentType, data: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  for (const field of referenceFields(type)) {
    const id = data[field.name];
    if (typeof id !== "string") continue;
    const rows = await listItems(db, actor, tenantId, field.to);
    if (!rows.some((r) => r.id === id)) {
      errors[field.name] = `« ${field.label} » : ce choix n'existe plus. Choisissez-en un autre.`;
    }
  }
  return errors;
}

/** Contenus (hors corbeille) dont un champ référence désigne `item`. */
async function referencingItems(db: Db, actor: Actor, tenantId: string, item: ContentItem) {
  const { tenant } = await resolveType(db, actor, tenantId, item.type);
  const found: { type: ContentType; id: string }[] = [];
  for (const type of getSchema(tenant.schemaKey).types) {
    const fields = referenceFields(type).filter((f) => f.to === item.type);
    if (!fields.length) continue;
    for (const row of await listItems(db, actor, tenantId, type.key)) {
      if (fields.some((f) => row.draftData[f.name] === item.id || row.publishedData?.[f.name] === item.id)) {
        found.push({ type, id: row.id });
      }
    }
  }
  return found;
}
