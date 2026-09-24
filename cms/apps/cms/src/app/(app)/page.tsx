import Link from "next/link";
import { getSchema } from "@/content-types";
import { listItems } from "@/server/content";
import { isCurrentOrUpcoming } from "@/content-types";
import { requireContext } from "@/lib/session";
import { Flash } from "@/components/Flash";
import { typeIcon } from "@/lib/format";

export const metadata = { title: "Accueil" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { user, actor, tenant, db } = await requireContext();
  const params = await searchParams;
  const types = getSchema(tenant.schemaKey).types;
  const now = new Date();

  const tiles = await Promise.all(
    types.map(async (type) => {
      const items = await listItems(db, actor, tenant.id, type.key);
      const online = items.filter((i) => i.isPublished).length;
      const upcoming = type.schedule
        ? items.filter((i) => i.isPublished && isCurrentOrUpcoming(type, i.publishedData ?? {}, now)).length
        : null;
      return { type, total: items.length, online, upcoming };
    }),
  );

  return (
    <>
      <Flash params={params} messages={{ password: "Votre mot de passe a été modifié." }} />
      <div className="page-head">
        <div>
          <h1>Bonjour {user.displayName} 👋</h1>
          <p>Que souhaitez-vous modifier sur le site de {tenant.name} ?</p>
        </div>
      </div>
      <div className="tiles">
        {tiles.map(({ type, total, online, upcoming }) => (
          <Link key={type.key} href={`/${type.slug}`} className="card tile">
            <div className="icon" aria-hidden>
              {typeIcon(type)}
            </div>
            <h2>Mes {type.labelPlural}</h2>
            <p>
              {upcoming !== null
                ? `${upcoming} à venir sur le site · ${total} au total`
                : `${online} en ligne · ${total} au total`}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
