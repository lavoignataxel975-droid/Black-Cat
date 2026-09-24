import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { apiKeys, contentItems, tenants, type Tenant } from "@/db/schema";
import { findType, isCurrentOrUpcoming, sortKey, type ContentType } from "@/content-types";
import { audit, requireAdmin, type Actor } from "./access";
import { AppError, notFound } from "./errors";
import { sha256 } from "./auth";
import { matchesFilters } from "./content";

const KEY_PREFIX = "sgt_pk_";

/** Crée une clé de lecture. La clé en clair n'est retournée qu'une seule fois. */
export async function createReadKey(db: Db, actor: Actor, tenantId: string, label: string, plainKey?: string) {
  requireAdmin(actor);
  const key = plainKey ?? KEY_PREFIX + randomBytes(24).toString("base64url");
  const [row] = await db
    .insert(apiKeys)
    .values({ tenantId, label: label.trim() || "Site", keyHash: sha256(key), keyPrefix: key.slice(0, 14) })
    .returning();
  await audit(db, { tenantId, userId: actor.id, action: "apikey.created", details: { label: row!.label } });
  return { key, row: row! };
}

export async function revokeKey(db: Db, actor: Actor, keyId: string) {
  requireAdmin(actor);
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)))
    .returning();
  if (!row) throw notFound("Clé");
  await audit(db, { tenantId: row.tenantId, userId: actor.id, action: "apikey.revoked", details: { label: row.label } });
}

export async function listKeys(db: Db, actor: Actor, tenantId: string) {
  requireAdmin(actor);
  return db.select().from(apiKeys).where(eq(apiKeys.tenantId, tenantId)).orderBy(desc(apiKeys.createdAt));
}

/** Retrouve le client correspondant à une clé de lecture valide. */
export async function tenantForKey(db: Db, key: string | null): Promise<Tenant> {
  if (!key) throw new AppError("Clé d'accès manquante (en-tête Authorization: Bearer <clé>).", 401);
  const [row] = await db
    .select({ tenant: tenants })
    .from(apiKeys)
    .innerJoin(tenants, eq(tenants.id, apiKeys.tenantId))
    .where(and(eq(apiKeys.keyHash, sha256(key)), isNull(apiKeys.revokedAt)));
  if (!row) throw new AppError("Clé d'accès invalide ou révoquée.", 401);
  return row.tenant;
}

export interface PublicQuery {
  /** Filtres sur les champs déclarés comme filtres (ex. categorie=vins, region=bourgogne). */
  filter?: Record<string, string>;
  /** Filtre sur le champ `badgeField` (ex. nouveaute=true). */
  badge?: boolean;
  limit?: number;
  offset?: number;
}

export interface PublicItem {
  id: string;
  type: string;
  publishedAt: string | null;
  data: Record<string, unknown>;
}

export const MAX_LIMIT = 100;

/**
 * Contenu publié d'un client, tel qu'exposé aux sites. Les images sont remplacées par leurs
 * URL publiques ; les contenus datés passés sont exclus.
 */
export async function listPublished(
  db: Db,
  tenant: Tenant,
  typeKey: string,
  query: PublicQuery,
  opts: { baseUrl: string; now?: Date },
) {
  const type = findType(tenant.schemaKey, { key: typeKey });
  if (!type) throw notFound("Type de contenu");
  const now = opts.now ?? new Date();

  const rows = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.tenantId, tenant.id),
        eq(contentItems.type, typeKey),
        eq(contentItems.isPublished, true),
        isNull(contentItems.deletedAt),
      ),
    );

  const items = rows
    .filter((r) => r.publishedData && isCurrentOrUpcoming(type, r.publishedData, now))
    .filter((r) => matchesFilters(type, r.publishedData!, query.filter))
    .filter((r) => query.badge === undefined || !type.badgeField || r.publishedData![type.badgeField] === query.badge)
    .sort((a, b) => sortKey(type, a.publishedData!, a.position) - sortKey(type, b.publishedData!, b.position));

  const limit = Math.min(Math.max(query.limit ?? 50, 1), MAX_LIMIT);
  const offset = Math.max(query.offset ?? 0, 0);
  return {
    total: items.length,
    limit,
    offset,
    items: items.slice(offset, offset + limit).map(
      (r): PublicItem => ({
        id: r.id,
        type: r.type,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        data: withImageUrls(type, tenant, r.publishedData!, opts.baseUrl),
      }),
    ),
  };
}

function withImageUrls(type: ContentType, tenant: Tenant, data: Record<string, unknown>, baseUrl: string) {
  const out: Record<string, unknown> = { ...data };
  for (const field of type.fields) {
    if (field.kind !== "image") continue;
    const id = data[field.name];
    out[field.name] =
      typeof id === "string"
        ? {
            url: `${baseUrl}/media/${tenant.id}/${id}-lg.webp`,
            thumbnailUrl: `${baseUrl}/media/${tenant.id}/${id}-sm.webp`,
          }
        : null;
  }
  return out;
}
