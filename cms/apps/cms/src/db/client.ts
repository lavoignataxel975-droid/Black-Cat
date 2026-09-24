import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = path.join(process.cwd(), "drizzle");

/**
 * Crée une base PGlite (PostgreSQL embarqué). `dataDir` absent = base en mémoire (tests).
 */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return db as unknown as Db;
}

/** Dossier de la base embarquée (PGLITE_DIR permet par ex. une base séparée pour les tests). */
export const pgliteDir = () => process.env.PGLITE_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "pglite");

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new pg.Pool({ connectionString: url });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder });
    return db as unknown as Db;
  }
  return createPgliteDb(pgliteDir());
}

// Conservé sur globalThis pour survivre au rechargement à chaud de Next.js en développement.
const globalForDb = globalThis as unknown as { sgtDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.sgtDb ??= createDb();
  return globalForDb.sgtDb;
}
