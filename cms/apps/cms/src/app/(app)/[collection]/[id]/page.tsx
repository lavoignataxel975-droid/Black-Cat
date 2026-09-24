import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { findType, withReferenceOptions } from "@/content-types";
import { users } from "@/db/schema";
import { AppError } from "@/server/errors";
import { getItem, itemStatus, listVersions, referenceOptions } from "@/server/content";
import { requireContext } from "@/lib/session";
import { formatShortDate, STATUS_LABELS } from "@/lib/format";
import { restoreVersionAction, setVisibilityAction, trashAction } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ContentForm } from "@/components/ContentForm";
import { Flash } from "@/components/Flash";

export const metadata = { title: "Modifier" };

type Params = Promise<{ collection: string; id: string }>;

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { collection, id } = await params;
  const query = await searchParams;
  const { actor, tenant, db } = await requireContext();
  const baseType = findType(tenant.schemaKey, { slug: collection });
  if (!baseType || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const type = withReferenceOptions(baseType, await referenceOptions(db, actor, tenant.id, baseType));

  const item = await getItem(db, actor, tenant.id, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  if (item.type !== type.key) notFound();

  const versions = await listVersions(db, actor, tenant.id, id);
  const authorIds = [...new Set(versions.map((v) => v.authorId).filter((a): a is string => Boolean(a)))];
  const authors = authorIds.length
    ? new Map((await db.select().from(users).where(inArray(users.id, authorIds))).map((u) => [u.id, u.displayName]))
    : new Map<string, string>();
  const status = STATUS_LABELS[itemStatus(item)];
  const self = `/${type.slug}/${id}`;
  const hidden = (ok: string) => (
    <>
      <input type="hidden" name="$slug" value={type.slug} />
      <input type="hidden" name="$id" value={id} />
      <input type="hidden" name="$back" value={self} />
      <input type="hidden" name="$ok" value={ok} />
    </>
  );

  return (
    <>
      <div className="breadcrumb">
        <Link href={`/${type.slug}`}>← Mes {type.labelPlural}</Link>
      </div>
      <Flash params={query} />
      {item.deletedAt && <div className="alert alert-error">Ce contenu est dans la corbeille.</div>}
      <div className="page-head">
        <div>
          <h1>{String(item.draftData[type.titleField] || `Modifier le ${type.labelSingular}`)}</h1>
          <p>
            <span className={status.className}>{status.label}</span>
          </p>
        </div>
      </div>

      <div className="layout-edit">
        {/* key : recharge le formulaire après chaque enregistrement ou restauration. */}
        <ContentForm
          key={item.revision}
          type={type}
          tenantId={tenant.id}
          item={{ id: item.id, revision: item.revision, data: item.draftData }}
        />

        <aside className="stack side">
          <div className="card">
            <h2>Sur le site</h2>
            <div className="stack" style={{ gap: "0.5rem" }}>
              {item.publishedData && (
                <form action={setVisibilityAction}>
                  {hidden(item.isPublished ? "hidden" : "shown")}
                  <input type="hidden" name="$visible" value={item.isPublished ? "0" : "1"} />
                  <button className="btn" style={{ width: "100%" }}>
                    {item.isPublished ? "Masquer du site" : "Afficher sur le site"}
                  </button>
                </form>
              )}
              <form action={trashAction}>
                <input type="hidden" name="$slug" value={type.slug} />
                <input type="hidden" name="$id" value={id} />
                <input type="hidden" name="$ok" value="trashed" />
                <ConfirmButton label="Supprimer" message={`Mettre ce ${type.labelSingular} à la corbeille ? Vous pourrez le restaurer pendant 30 jours.`} />
              </form>
            </div>
          </div>

          <div className="card">
            <h2>Historique des publications</h2>
            {versions.length === 0 ? (
              <p className="help" style={{ color: "var(--muted)", margin: 0 }}>
                Pas encore publié.
              </p>
            ) : (
              <ul className="versions">
                {versions.map((v, i) => (
                  <li key={v.id}>
                    <span>
                      {formatShortDate(v.createdAt)}
                      <br />
                      <small style={{ color: "var(--muted)" }}>
                        {authors.get(v.authorId ?? "") ?? "—"}
                        {i === 0 && " · actuelle"}
                      </small>
                    </span>
                    {i > 0 && (
                      <form action={restoreVersionAction}>
                        {hidden("version")}
                        <input type="hidden" name="$version" value={v.id} />
                        <button className="btn btn-small">Restaurer</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
