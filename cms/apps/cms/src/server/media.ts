import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Db } from "@/db/client";
import { media } from "@/db/schema";
import { audit, loadTenantFor, type Actor } from "./access";
import { AppError } from "./errors";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);
export const UPLOAD_RULES = "Formats acceptés : JPEG, PNG ou WebP, 10 Mo maximum.";

/** Variantes générées pour chaque image (largeur maximale en pixels). */
const VARIANTS = { lg: 1600, sm: 480 } as const;
export type Variant = keyof typeof VARIANTS;

// turbopackIgnore : dossier de données à l'exécution, à ne pas inclure dans le build.
export const storageDir = () =>
  process.env.STORAGE_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "storage");

// Stockage sur disque, un dossier par client. Remplaçable par un stockage objet (S3) en
// changeant uniquement ces deux fonctions.
async function putFile(tenantId: string, name: string, data: Buffer) {
  const dir = path.join(/*turbopackIgnore: true*/ storageDir(), tenantId);
  await mkdir(dir, { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ path.join(dir, name), data);
}

export async function readMediaFile(tenantId: string, name: string): Promise<Buffer | null> {
  // Noms strictement contrôlés : pas de traversée de dossiers possible.
  if (!/^[0-9a-f-]{36}$/.test(tenantId) || !/^[0-9a-f-]{36}-(lg|sm)\.webp$/.test(name)) return null;
  return readFile(/*turbopackIgnore: true*/ path.join(storageDir(), tenantId, name)).catch(() => null);
}

export async function uploadImage(
  db: Db,
  actor: Actor,
  tenantId: string,
  file: { name: string; bytes: Buffer },
) {
  await loadTenantFor(db, actor, tenantId);
  if (file.bytes.length > MAX_UPLOAD_BYTES) {
    throw new AppError(`L'image est trop lourde. ${UPLOAD_RULES}`, 422);
  }
  // Le format est lu dans le contenu du fichier, pas déduit de son nom.
  const meta = await sharp(file.bytes).metadata().catch(() => null);
  if (!meta?.format || !ACCEPTED_FORMATS.has(meta.format) || !meta.width || !meta.height) {
    throw new AppError(`Ce fichier n'est pas une image valide. ${UPLOAD_RULES}`, 422);
  }

  const [row] = await db
    .insert(media)
    .values({
      tenantId,
      originalName: file.name.slice(0, 200),
      width: meta.width,
      height: meta.height,
      createdBy: actor.id,
    })
    .returning();

  for (const [variant, width] of Object.entries(VARIANTS)) {
    const out = await sharp(file.bytes)
      .rotate() // applique l'orientation EXIF des photos de téléphone
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await putFile(tenantId, `${row!.id}-${variant}.webp`, out);
  }
  await audit(db, { tenantId, userId: actor.id, action: "media.uploaded", details: { id: row!.id, name: row!.originalName } });
  return row!;
}
