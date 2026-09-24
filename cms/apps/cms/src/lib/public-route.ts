import { createHash } from "node:crypto";
import { getDb, type Db } from "@/db/client";
import type { Tenant } from "@/db/schema";
import { AppError } from "@/server/errors";
import { tenantForKey } from "@/server/public-api";

/**
 * Socle commun des routes de l'API publique : authentification par clé de lecture,
 * vérification de l'origine (CORS), cache HTTP (ETag) et erreurs en JSON.
 */

function corsHeaders(req: Request, tenant?: Tenant): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin, Authorization" };
  // Sans client identifié (pré-requête), l'origine est renvoyée ; la vraie requête sera
  // ensuite vérifiée contre la liste des origines du client.
  if (origin && (!tenant || tenant.allowedOrigins.includes(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

export function preflight(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

const json = (body: string, status: number, headers: Record<string, string>) =>
  new Response(body, { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

export async function publicGet(
  req: Request,
  handler: (ctx: { db: Db; tenant: Tenant; url: URL }) => Promise<unknown>,
  { maxAge }: { maxAge: number },
) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  let tenant: Tenant | undefined;
  try {
    const db = await getDb();
    tenant = await tenantForKey(db, bearer);
    const origin = req.headers.get("origin");
    if (origin && !tenant.allowedOrigins.includes(origin)) {
      throw new AppError(`Origine non autorisée pour ce client : ${origin}`, 403);
    }

    const body = JSON.stringify(await handler({ db, tenant, url: new URL(req.url) }));
    const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
    const headers = {
      ...corsHeaders(req, tenant),
      ETag: etag,
      "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=60`,
    };
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return json(body, 200, headers);
  } catch (e) {
    if (e instanceof AppError) return json(JSON.stringify({ error: e.message }), e.status, corsHeaders(req, tenant));
    console.error(e);
    return json(JSON.stringify({ error: "Erreur interne." }), 500, corsHeaders(req, tenant));
  }
}
