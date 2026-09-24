import Link from "next/link";
import { notFound } from "next/navigation";
import { findType } from "@/content-types";
import { listItems, TRASH_RETENTION_DAYS } from "@/server/content";
import { requireContext } from "@/lib/session";
import { restoreAction } from "@/app/actions";
import { Flash } from "@/components/Flash";

export const metadata = { title: "Corbeille" };

export default async function TrashPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { collection } = await params;
  const query = await searchParams;
  const { actor, tenant, db } = await requireContext();
  const type = findType(tenant.schemaKey, { slug: collection });
  if (!type) notFound();
  const items = await listItems(db, actor, tenant.id, type.key, { trash: true });
  const day = 24 * 60 * 60 * 1000;

  return (
    <>
      <div className="breadcrumb">
        <Link href={`/${type.slug}`}>← Mes {type.labelPlural}</Link>
      </div>
      <Flash params={query} />
      <div className="page-head">
        <div>
          <h1>Corbeille · {type.labelPlural}</h1>
          <p>Les éléments sont définitivement supprimés {TRASH_RETENTION_DAYS} jours après leur mise à la corbeille.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="card empty">La corbeille est vide.</div>
      ) : (
        <ul className="item-list">
          {items.map((item) => {
            const left = Math.max(
              0,
              Math.ceil((item.deletedAt!.getTime() + TRASH_RETENTION_DAYS * day - Date.now()) / day),
            );
            return (
              <li key={item.id} className="item is-hidden">
                <div className="thumb" aria-hidden>
                  🗑
                </div>
                <div>
                  <span className="item-title">{String(item.draftData[type.titleField] || "(sans titre)")}</span>
                  <div className="item-meta">Suppression définitive dans {left} jour{left > 1 ? "s" : ""}</div>
                </div>
                <div className="item-actions">
                  <form action={restoreAction}>
                    <input type="hidden" name="$slug" value={type.slug} />
                    <input type="hidden" name="$id" value={item.id} />
                    <input type="hidden" name="$ok" value="restored" />
                    <button className="btn btn-small btn-primary">Restaurer</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
