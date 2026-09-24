import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tenants, type Tenant, type User } from "@/db/schema";
import { getSessionUser } from "@/server/auth";
import type { Actor } from "@/server/access";

export const SESSION_COOKIE = "sgt_session";
/** Client sélectionné par un administrateur de l'agence. */
export const TENANT_COOKIE = "sgt_tenant";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(await getDb(), token);
});

export const actorOf = (user: User): Actor => ({ id: user.id, role: user.role, tenantId: user.tenantId });

/** Utilisateur connecté, sinon redirection vers la page de connexion. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/mot-de-passe");
  return user;
}

/** Client sur lequel travaille l'utilisateur : le sien pour un éditeur, le client choisi pour l'agence. */
export const getActiveTenant = cache(async (user: User): Promise<Tenant | null> => {
  const db = await getDb();
  if (user.role !== "admin") {
    const [t] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId!));
    return t ?? null;
  }
  const chosen = (await cookies()).get(TENANT_COOKIE)?.value;
  const all = await db.select().from(tenants).orderBy(asc(tenants.name));
  return all.find((t) => t.id === chosen) ?? all[0] ?? null;
});

/**
 * Client dont l'habillage est montré avant la connexion : celui de LOGIN_TENANT (slug) ou,
 * s'il n'y a qu'un seul client, celui-ci. Sinon, le CMS garde ses couleurs neutres.
 */
export const getLoginTenant = cache(async (): Promise<Tenant | null> => {
  const db = await getDb();
  const all = await db.select().from(tenants).orderBy(asc(tenants.name));
  const slug = process.env.LOGIN_TENANT;
  if (slug) return all.find((t) => t.slug === slug) ?? null;
  return all.length === 1 ? all[0]! : null;
});

export async function requireContext() {
  const user = await requireUser();
  const tenant = await getActiveTenant(user);
  if (!tenant) redirect(user.role === "admin" ? "/agence" : "/login");
  return { user, actor: actorOf(user), tenant, db: await getDb() };
}
