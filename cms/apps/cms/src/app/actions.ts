"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { findType } from "@/content-types";
import { AppError } from "@/server/errors";
import { changePassword, createUser, login, logout, resetPassword, setUserDisabled } from "@/server/auth";
import {
  createItem,
  moveItem,
  restoreItem,
  restoreVersion,
  saveItem,
  setPublished,
  trashItem,
} from "@/server/content";
import { uploadImage } from "@/server/media";
import { createReadKey, revokeKey } from "@/server/public-api";
import {
  cookieOptions,
  getCurrentUser,
  requireContext,
  SESSION_COOKIE,
  TENANT_COOKIE,
} from "@/lib/session";

export interface FormState {
  message?: string;
  errors?: Record<string, string>;
  ok?: string;
}

function toState(e: unknown): FormState {
  if (e instanceof AppError) return { message: e.message, errors: e.fieldErrors };
  console.error(e);
  return { message: "Une erreur inattendue est survenue. Réessayez dans un instant." };
}

const str = (fd: FormData, name: string) => String(fd.get(name) ?? "");

/** Champs techniques groupés par préfixe (ex. `$filter.section` → { section }). */
function prefixed(fd: FormData, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith(prefix) && typeof value === "string") out[key.slice(prefix.length)] = value;
  }
  return out;
}

// ---------------------------------------------------------------- Connexion

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  let mustChange = false;
  try {
    const { token, user } = await login(await getDb(), str(fd, "username"), str(fd, "password"));
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions);
    mustChange = user.mustChangePassword;
  } catch (e) {
    return toState(e);
  }
  redirect(mustChange ? "/mot-de-passe" : "/");
}

export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await logout(await getDb(), token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (str(fd, "next") !== str(fd, "confirm")) {
    return { message: "Les deux nouveaux mots de passe ne sont pas identiques.", errors: { confirm: "Ne correspond pas." } };
  }
  try {
    await changePassword(await getDb(), user, str(fd, "current"), str(fd, "next"));
  } catch (e) {
    return toState(e);
  }
  redirect("/?ok=password");
}

// ---------------------------------------------------------------- Contenus

/** Champs du formulaire généré, sans les champs techniques. */
function contentInput(fd: FormData): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("$") && typeof value === "string") input[key] = value;
  }
  return input;
}

export async function saveContentAction(_: FormState, fd: FormData): Promise<FormState> {
  const { db, actor, tenant } = await requireContext();
  const type = findType(tenant.schemaKey, { key: str(fd, "$type") });
  if (!type) return { message: "Type de contenu inconnu." };
  const publish = str(fd, "$intent") === "publish";
  const id = str(fd, "$id");
  let itemId = id;
  try {
    if (id) {
      await saveItem(db, actor, tenant.id, id, contentInput(fd), { publish, revision: Number(str(fd, "$revision")) });
    } else {
      itemId = (await createItem(db, actor, tenant.id, type.key, contentInput(fd), { publish })).id;
    }
  } catch (e) {
    return toState(e);
  }
  revalidatePath(`/${type.slug}`);
  redirect(`/${type.slug}/${itemId}?ok=${publish ? "published" : "saved"}`);
}

async function itemAction(fd: FormData, run: (ctx: Awaited<ReturnType<typeof requireContext>>, id: string) => Promise<unknown>) {
  const ctx = await requireContext();
  const slug = str(fd, "$slug");
  let error: string | undefined;
  try {
    await run(ctx, str(fd, "$id"));
  } catch (e) {
    error = e instanceof AppError ? e.message : "Une erreur inattendue est survenue.";
    if (!(e instanceof AppError)) console.error(e);
  }
  revalidatePath(`/${slug}`);
  const requested = str(fd, "$back");
  // Uniquement des chemins internes, pour éviter toute redirection vers un autre site.
  const back = requested.startsWith("/") && !requested.startsWith("//") ? requested : `/${slug}`;
  const sep = back.includes("?") ? "&" : "?";
  redirect(error ? `${back}${sep}error=${encodeURIComponent(error)}` : `${back}${sep}ok=${str(fd, "$ok") || "done"}`);
}

export async function setVisibilityAction(fd: FormData) {
  await itemAction(fd, ({ db, actor, tenant }, id) => setPublished(db, actor, tenant.id, id, str(fd, "$visible") === "1"));
}

export async function trashAction(fd: FormData) {
  await itemAction(fd, ({ db, actor, tenant }, id) => trashItem(db, actor, tenant.id, id));
}

export async function restoreAction(fd: FormData) {
  await itemAction(fd, ({ db, actor, tenant }, id) => restoreItem(db, actor, tenant.id, id));
}

export async function moveAction(fd: FormData) {
  await itemAction(fd, ({ db, actor, tenant }, id) =>
    moveItem(db, actor, tenant.id, id, str(fd, "$direction") === "up" ? "up" : "down", prefixed(fd, "$filter.")),
  );
}

export async function restoreVersionAction(fd: FormData) {
  await itemAction(fd, ({ db, actor, tenant }, id) => restoreVersion(db, actor, tenant.id, id, str(fd, "$version")));
}

export async function uploadImageAction(
  fd: FormData,
): Promise<{ id: string; thumbnailUrl: string } | { error: string }> {
  const { db, actor, tenant } = await requireContext();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier reçu." };
  try {
    const row = await uploadImage(db, actor, tenant.id, {
      name: file.name,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return { id: row.id, thumbnailUrl: `/media/${tenant.id}/${row.id}-sm.webp` };
  } catch (e) {
    return { error: toState(e).message ?? "Échec de l'envoi." };
  }
}

// ---------------------------------------------------------------- Agence

export async function selectTenantAction(fd: FormData) {
  const { user } = await requireContext();
  if (user.role === "admin") (await cookies()).set(TENANT_COOKIE, str(fd, "tenantId"), cookieOptions);
  redirect("/");
}

async function adminAction(run: (ctx: Awaited<ReturnType<typeof requireContext>>) => Promise<string | void>) {
  const ctx = await requireContext();
  let query: string;
  try {
    const info = await run(ctx);
    query = info ? `ok=${encodeURIComponent(info)}` : "ok=done";
  } catch (e) {
    query = `error=${encodeURIComponent(e instanceof AppError ? e.message : "Erreur inattendue.")}`;
    if (!(e instanceof AppError)) console.error(e);
  }
  revalidatePath("/agence");
  redirect(`/agence?${query}`);
}

export async function createUserAction(fd: FormData) {
  await adminAction(async ({ db, actor, tenant }) => {
    const role = str(fd, "role") === "admin" ? "admin" : "editor";
    await createUser(db, actor, {
      username: str(fd, "username"),
      displayName: str(fd, "displayName"),
      password: str(fd, "password"),
      role,
      tenantId: role === "admin" ? null : tenant.id,
    });
    return "Compte créé. L'utilisateur devra changer son mot de passe à la première connexion.";
  });
}

export async function resetPasswordAction(fd: FormData) {
  await adminAction(async ({ db, actor }) => {
    await resetPassword(db, actor, str(fd, "userId"), str(fd, "password"));
    return "Mot de passe réinitialisé. L'utilisateur devra le changer à sa prochaine connexion.";
  });
}

export async function toggleUserAction(fd: FormData) {
  await adminAction(({ db, actor }) => setUserDisabled(db, actor, str(fd, "userId"), str(fd, "disabled") === "1"));
}

export async function createKeyAction(fd: FormData) {
  await adminAction(async ({ db, actor, tenant }) => {
    const { key } = await createReadKey(db, actor, tenant.id, str(fd, "label"));
    return `Nouvelle clé de lecture (copiez-la maintenant, elle ne sera plus affichée) : ${key}`;
  });
}

export async function revokeKeyAction(fd: FormData) {
  await adminAction(({ db, actor }) => revokeKey(db, actor, str(fd, "keyId")));
}
