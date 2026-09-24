import { filterFields, findType } from "@/content-types";
import { notFound } from "@/server/errors";
import { preflight, publicGet } from "@/lib/public-route";

/**
 * GET /api/v1/schema/:type — description des filtres d'un type de contenu, pour que les sites
 * affichent les libellés (« Bourgogne ») et ne proposent que les filtres utiles.
 */

export const OPTIONS = preflight;

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type: key } = await params;
  return publicGet(
    req,
    async ({ tenant }) => {
      const type = findType(tenant.schemaKey, { key });
      if (!type) throw notFound("Type de contenu");
      return {
        key: type.key,
        labelSingular: type.labelSingular,
        labelPlural: type.labelPlural,
        filters: filterFields(type).map((f) => ({
          name: f.name,
          label: f.label,
          main: f.name === type.filterField,
          showIf: f.showIf ?? null,
          options: f.options,
        })),
      };
    },
    { maxAge: 300 },
  );
}
