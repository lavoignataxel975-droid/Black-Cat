/**
 * Jeu de départ pour le site « The Black Cat » (bar · billard · cuisine, Montpellier) :
 * la carte et les événements actuellement présents sur le site.
 * Usage : npm run seed            (ne fait rien si le client existe déjà)
 *
 * ⚠️ Avec la base embarquée (PGlite), arrêter `npm run dev` avant de lancer ce script.
 */
import { eq } from "drizzle-orm";
import { createPgliteDb, pgliteDir, type Db } from "../src/db/client";
import { tenants, users } from "../src/db/schema";
import { hashPassword } from "../src/server/auth";
import { createItem } from "../src/server/content";
import { createReadKey } from "../src/server/public-api";
import type { Actor } from "../src/server/access";
import { CATEGORIES, PRODUITS, EVENEMENTS } from "./seed-data";

/** Clé de lecture fixe en local, pour que la configuration du site reste valable après un nouveau seed. */
const DEV_READ_KEY = "sgt_pk_dev_blackcat_local_only";

/** Le site tourne sur le port 5174 (server.cjs). */
const SITE_ORIGINS = ["http://localhost:5174", "http://127.0.0.1:5174"];

async function openDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { getDb } = await import("../src/db/client");
    return getDb();
  }
  return createPgliteDb(pgliteDir());
}

async function main() {
  const db = await openDb();
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, "blackcat"));
  if (existing) {
    console.log("Le client « blackcat » existe déjà : rien à faire. (Supprimez apps/cms/data/ pour repartir de zéro.)");
    return;
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      slug: "blackcat",
      name: "The Black Cat",
      schemaKey: "blackcat",
      allowedOrigins: SITE_ORIGINS,
    })
    .returning();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "agence-a-changer";
  const editorPassword = process.env.SEED_EDITOR_PASSWORD ?? "blackcat-a-changer";
  const [admin] = await db
    .insert(users)
    .values([
      {
        username: "agence",
        displayName: "Agence",
        passwordHash: await hashPassword(adminPassword),
        role: "admin",
        mustChangePassword: true,
      },
      {
        username: "blackcat",
        displayName: "l'équipe du Black Cat",
        passwordHash: await hashPassword(editorPassword),
        role: "editor",
        tenantId: tenant!.id,
        mustChangePassword: true,
      },
    ])
    .returning();
  const actor: Actor = { id: admin!.id, role: "admin", tenantId: null };

  const readKey = process.env.NODE_ENV === "production" ? undefined : DEV_READ_KEY;
  const { key } = await createReadKey(db, actor, tenant!.id, "Site local", readKey);

  // Chaque création place le contenu en tête de liste : on insère donc dans l'ordre inverse.
  const seed = async (type: string, rows: Record<string, string>[]) => {
    const ids: string[] = [];
    for (const row of [...rows].reverse()) ids.unshift((await createItem(db, actor, tenant!.id, type, row, { publish: true })).id);
    return ids;
  };

  // Les produits désignent leur catégorie par sa clé dans seed-data ; en base, par son identifiant.
  const categorieIds = await seed(
    "categorie",
    CATEGORIES.map(({ nom, groupe, note }) => ({ nom: nom!, groupe: groupe!, ...(note ? { note } : {}) })),
  );
  const idOfKey = Object.fromEntries(CATEGORIES.map((c, i) => [c.cle, categorieIds[i]!]));
  await seed(
    "produit",
    PRODUITS.map(({ categorie, ...rest }) => ({ ...rest, categorie: idOfKey[categorie!]! })),
  );
  await seed("evenement", EVENEMENTS);

  console.log(`
✅ Jeu de départ créé pour « ${tenant!.name} »
  ${CATEGORIES.length} catégories, ${PRODUITS.length} produits, ${EVENEMENTS.length} événements

  Administrateur agence : agence / ${adminPassword}
  Éditeur (le bar)      : blackcat / ${editorPassword}
  (un nouveau mot de passe sera demandé à la première connexion)

  Clé de lecture du site : ${key}
`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
