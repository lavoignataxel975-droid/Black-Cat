import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sessions, users, type Role, type User } from "@/db/schema";
import { audit, requireAdmin, type Actor } from "./access";
import { AppError, conflict, notFound } from "./errors";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;
export const SESSION_IDLE_MS = 8 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 10;

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const hashPassword = (password: string) => hash(password);

export function checkPasswordStrength(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`, 422);
  }
}

// Empreinte factice : vérifiée quand l'identifiant n'existe pas, pour que la durée de réponse
// ne révèle pas quels identifiants existent.
const dummyHash = hash("dummy-password-for-timing");

const GENERIC_LOGIN_ERROR = "Identifiant ou mot de passe incorrect.";

export async function login(
  db: Db,
  username: string,
  password: string,
  now = new Date(),
): Promise<{ token: string; user: User }> {
  const [user] = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase()));
  if (!user || user.disabled) {
    await verify(await dummyHash, password).catch(() => false);
    throw new AppError(GENERIC_LOGIN_ERROR, 401);
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
    throw new AppError(
      `Trop de tentatives échouées. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      429,
    );
  }

  if (!(await verify(user.passwordHash, password))) {
    const failed = user.failedAttempts + 1;
    const locked = failed >= MAX_FAILED_ATTEMPTS;
    await db
      .update(users)
      .set({
        failedAttempts: locked ? 0 : failed,
        lockedUntil: locked ? new Date(now.getTime() + LOCK_DURATION_MS) : null,
      })
      .where(eq(users.id, user.id));
    await audit(db, {
      tenantId: user.tenantId,
      userId: user.id,
      action: locked ? "auth.locked" : "auth.failed",
    });
    throw new AppError(
      locked ? "Trop de tentatives échouées. Compte bloqué pendant 15 minutes." : GENERIC_LOGIN_ERROR,
      locked ? 429 : 401,
    );
  }

  await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({ tokenHash: sha256(token), userId: user.id });
  await audit(db, { tenantId: user.tenantId, userId: user.id, action: "auth.login" });
  return { token, user };
}

/** Retourne l'utilisateur de la session, ou null si elle est absente ou expirée (inactivité). */
export async function getSessionUser(db: Db, token: string, now = new Date()): Promise<User | null> {
  const tokenHash = sha256(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash));
  if (!row || row.user.disabled) return null;
  if (now.getTime() - row.session.lastSeenAt.getTime() > SESSION_IDLE_MS) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }
  // Évite une écriture à chaque requête : rafraîchi au plus une fois par minute.
  if (now.getTime() - row.session.lastSeenAt.getTime() > 60_000) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.tokenHash, tokenHash));
  }
  return row.user;
}

export async function logout(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function purgeExpiredSessions(db: Db, now = new Date()) {
  await db.delete(sessions).where(lt(sessions.lastSeenAt, new Date(now.getTime() - SESSION_IDLE_MS)));
}

export async function changePassword(db: Db, user: User, current: string, next: string) {
  if (!(await verify(user.passwordHash, current))) {
    throw new AppError("Le mot de passe actuel est incorrect.", 422, {
      current: "Le mot de passe actuel est incorrect.",
    });
  }
  checkPasswordStrength(next);
  if (next === current) throw new AppError("Choisissez un mot de passe différent de l'actuel.", 422);
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false })
    .where(eq(users.id, user.id));
  await audit(db, { tenantId: user.tenantId, userId: user.id, action: "auth.password_changed" });
}

export async function createUser(
  db: Db,
  actor: Actor,
  input: { username: string; displayName: string; password: string; role: Role; tenantId: string | null },
) {
  requireAdmin(actor);
  checkPasswordStrength(input.password);
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new AppError("L'identifiant doit contenir 3 à 40 lettres, chiffres, points ou tirets.", 422);
  }
  if (input.role === "editor" && !input.tenantId) {
    throw new AppError("Un éditeur doit être rattaché à un client.", 422);
  }
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (existing) throw conflict("Cet identifiant est déjà utilisé.");
  const [user] = await db
    .insert(users)
    .values({
      username,
      displayName: input.displayName.trim() || username,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      tenantId: input.role === "admin" ? null : input.tenantId,
      mustChangePassword: true,
    })
    .returning();
  await audit(db, {
    tenantId: user!.tenantId,
    userId: actor.id,
    action: "user.created",
    details: { username, role: input.role },
  });
  return user!;
}

/** Réinitialisation par l'administrateur : l'utilisateur devra changer le mot de passe. */
export async function resetPassword(db: Db, actor: Actor, userId: string, temporaryPassword: string) {
  requireAdmin(actor);
  checkPasswordStrength(temporaryPassword);
  const [user] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw notFound("Utilisateur");
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit(db, {
    tenantId: user.tenantId,
    userId: actor.id,
    action: "user.password_reset",
    details: { username: user.username },
  });
}

export async function setUserDisabled(db: Db, actor: Actor, userId: string, disabled: boolean) {
  requireAdmin(actor);
  if (userId === actor.id) throw new AppError("Vous ne pouvez pas désactiver votre propre compte.", 422);
  const [user] = await db.update(users).set({ disabled }).where(eq(users.id, userId)).returning();
  if (!user) throw notFound("Utilisateur");
  if (disabled) await db.delete(sessions).where(and(eq(sessions.userId, userId)));
  await audit(db, {
    tenantId: user.tenantId,
    userId: actor.id,
    action: disabled ? "user.disabled" : "user.enabled",
    details: { username: user.username },
  });
}
