import { listPublished } from "@/server/public-api";
import { preflight, publicGet } from "@/lib/public-route";

/**
 * API publique de lecture : GET /api/v1/content/:type
 * Authentification : en-tête `Authorization: Bearer <clé de lecture>`.
 * Paramètres : un paramètre par champ filtre (ex. categorie=vins&region=bourgogne),
 * nouveaute=true|false (champ mis en avant), limit, offset.
 */

export const OPTIONS = preflight;

const RESERVED = new Set(["nouveaute", "limit", "offset"]);

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return publicGet(
    req,
    ({ db, tenant, url }) => {
      const filter: Record<string, string> = {};
      for (const [k, v] of url.searchParams) if (!RESERVED.has(k)) filter[k] = v;
      const nouveaute = url.searchParams.get("nouveaute");
      return listPublished(
        db,
        tenant,
        type,
        {
          filter,
          badge: nouveaute === null ? undefined : nouveaute === "true",
          limit: Number(url.searchParams.get("limit") ?? 50) || 50,
          offset: Number(url.searchParams.get("offset") ?? 0) || 0,
        },
        { baseUrl: process.env.PUBLIC_URL ?? url.origin },
      );
    },
    // Court : une publication doit apparaître sur le site en moins d'une minute.
    { maxAge: 15 },
  );
}
