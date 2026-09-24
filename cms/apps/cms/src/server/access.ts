import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { auditLog, tenants, type Role, type Tenant } from "@/db/schema";
import { forbidden, notFound } from "./errors";

/** L'utilisateur qui effectue une action. */
export interface Actor {
  id: string;
  role: Role;
  /** null pour un administrateur de l'agence. */
  tenantId: string | null;
}

/**
 * Point de contrôle unique de l'isolation entre clients (Principe III) : un éditeur n'accède
 * qu'à son propre client, un administrateur de l'agence à tous.
 */
export async function loadTenantFor(db: Db, actor: Actor, tenantId: string): Promise<Tenant> {
  if (actor.role !== "admin" && actor.tenantId !== tenantId) throw forbidden();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) throw notFound("Client");
  return tenant;
}

export function requireAdmin(actor: Actor) {
  if (actor.role !== "admin") throw forbidden();
}

export async function audit(
  db: Db,
  entry: { tenantId: string | null; userId: string | null; action: string; details?: Record<string, unknown> },
) {
  await db.insert(auditLog).values({ ...entry, details: entry.details ?? {} });
}
