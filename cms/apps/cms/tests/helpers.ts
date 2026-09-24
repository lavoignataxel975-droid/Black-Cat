import { createPgliteDb, type Db } from "@/db/client";
import { tenants, users } from "@/db/schema";
import type { Actor } from "@/server/access";
import { hashPassword } from "@/server/auth";

export interface Fixture {
  db: Db;
  admin: Actor;
  caveId: string;
  otherId: string;
  caveEditor: Actor;
  otherEditor: Actor;
}

/** Base en mémoire avec deux clients (La Cave et un client fictif) et leurs éditeurs. */
export async function setup(): Promise<Fixture> {
  const db = await createPgliteDb();
  const [cave, other] = await db
    .insert(tenants)
    .values([
      { slug: "lacave", name: "La Cave", schemaKey: "lacave", allowedOrigins: ["http://localhost:8777"] },
      { slug: "autre", name: "Client fictif", schemaKey: "lacave" },
    ])
    .returning();
  const passwordHash = await hashPassword("motdepasse-solide");
  const [admin, caveEd, otherEd] = await db
    .insert(users)
    .values([
      { username: "agence", displayName: "Agence", passwordHash, role: "admin" },
      { username: "caviste", displayName: "Caviste", passwordHash, role: "editor", tenantId: cave!.id },
      { username: "autre", displayName: "Autre", passwordHash, role: "editor", tenantId: other!.id },
    ])
    .returning();
  const actor = (u: typeof admin): Actor => ({ id: u!.id, role: u!.role, tenantId: u!.tenantId });
  return {
    db,
    admin: actor(admin),
    caveId: cave!.id,
    otherId: other!.id,
    caveEditor: actor(caveEd),
    otherEditor: actor(otherEd),
  };
}

export const wine = (overrides: Record<string, unknown> = {}) => ({
  nom: "Pommard",
  producteur: "Château de Pommard",
  categorie: "vins",
  type: "rouge",
  millesime: "2023",
  prix: "50,00",
  nouveaute: "on",
  ...overrides,
});
