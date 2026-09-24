import Link from "next/link";
import { notFound } from "next/navigation";
import { filterFields, findType, isCurrentOrUpcoming, navGroup, withReferenceOptions } from "@/content-types";
import { itemStatus, listItems, referenceOptions } from "@/server/content";
import { requireContext } from "@/lib/session";
import { article, formatDateTime, formatPrice, optionLabel, STATUS_LABELS, typeIcon } from "@/lib/format";
import { moveAction, setVisibilityAction } from "@/app/actions";
import { Flash } from "@/components/Flash";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";

type Params = Promise<{ collection: string }>;
type Search = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Params }) {
  return { title: `Mes ${(await params).collection}` };
}

export default async function ListPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { collection } = await params;
  const query = await searchParams;
  const { actor, tenant, db } = await requireContext();
  const baseType = findType(tenant.schemaKey, { slug: collection });
  if (!baseType) notFound();
  // Les champs référence (ex. la section d'un cocktail) deviennent des selects : onglets et libellés.
  const type = withReferenceOptions(baseType, await referenceOptions(db, actor, tenant.id, baseType));

  const mainFilter = filterFields(type).find((f) => f.name === type.filterField);
  const mainValue = mainFilter ? query[mainFilter.name] : undefined;
  // Filtres secondaires : ceux qui s'appliquent à la catégorie choisie (ex. couleur, région).
  const subFilters = mainValue
    ? filterFields(type, { [mainFilter!.name]: mainValue }).filter((f) => f.name !== type.filterField)
    : [];
  const filters: Record<string, string> = {};
  for (const f of [...(mainFilter ? [mainFilter] : []), ...subFilters]) {
    const v = query[f.name];
    if (v) filters[f.name] = v;
  }
  const hasFilters = Object.keys(filters).length > 0;
  const now = new Date();
  const tab = type.schedule ? (query.tab === "passes" ? "passes" : "avenir") : undefined;

  let items = await listItems(db, actor, tenant.id, type.key, { search: query.q, filters });
  if (tab) {
    items = items.filter((i) => isCurrentOrUpcoming(type, i.draftData, now) === (tab === "avenir"));
    if (tab === "passes") items.reverse();
  }
  // L'ordre se règle aussi dans un onglet du filtre principal (ex. une section de la carte) :
  // le contenu est alors déplacé par rapport à ses voisins de l'onglet.
  const canReorder = !type.schedule && !query.q && !subFilters.some((f) => filters[f.name]);
  const group = navGroup(tenant.schemaKey, type);
  const back = `/${type.slug}?${new URLSearchParams(Object.entries(query).filter(([k, v]) => v && k !== "ok" && k !== "error") as [string, string][])}`;

  return (
    <>
      <Flash params={query} />
      {group.length > 1 && (
        <div className="chips" role="tablist" aria-label={type.nav!.group} style={{ marginBottom: "1rem" }}>
          {group.map((t) => (
            <Link key={t.key} className="chip" href={`/${t.slug}`} aria-current={t.key === type.key}>
              {typeIcon(t)} {t.nav!.tab}
            </Link>
          ))}
        </div>
      )}
      <div className="page-head">
        <div>
          <h1>Mes {type.labelPlural}</h1>
          <p>
            {items.length} {items.length > 1 ? type.labelPlural : type.labelSingular}
            {canReorder && items.length > 1 && " · l'ordre de la liste est celui du site"}
          </p>
        </div>
        <Link href={`/${type.slug}/nouveau${mainValue ? `?${mainFilter!.name}=${mainValue}` : ""}`} className="btn btn-primary">
          + Ajouter {article(type)} {type.labelSingular}
        </Link>
      </div>

      <div className="toolbar">
        {tab && (
          <div className="chips" role="tablist">
            <Link className="chip" href={`/${type.slug}`} aria-current={tab === "avenir"}>
              À venir
            </Link>
            <Link className="chip" href={`/${type.slug}?tab=passes`} aria-current={tab === "passes"}>
              Passés
            </Link>
          </div>
        )}
        {mainFilter && (
          <div className="chips">
            <Link className="chip" href={`/${type.slug}${query.q ? `?q=${encodeURIComponent(query.q)}` : ""}`} aria-current={!mainValue}>
              Tous
            </Link>
            {mainFilter.options.map((o) => (
              <Link
                key={o.value}
                className="chip"
                href={`/${type.slug}?${mainFilter.name}=${o.value}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`}
                aria-current={mainValue === o.value}
              >
                {o.label}
              </Link>
            ))}
          </div>
        )}
        <form role="search" className="inline-form" style={{ flex: 1 }}>
          {Object.entries(filters).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {tab === "passes" && <input type="hidden" name="tab" value="passes" />}
          <label htmlFor="q" className="sr-only">
            Rechercher
          </label>
          <input id="q" type="search" name="q" defaultValue={query.q} placeholder="Rechercher…" style={{ flex: 1 }} />
        </form>
        <Link href={`/${type.slug}/corbeille`} className="btn btn-small">
          🗑 Corbeille
        </Link>
      </div>

      {subFilters.length > 0 && (
        <form className="filters" aria-label="Filtres">
          <input type="hidden" name={mainFilter!.name} value={mainValue} />
          {query.q && <input type="hidden" name="q" value={query.q} />}
          <span className="label">Affiner :</span>
          {subFilters.map((f) => (
            <AutoSubmitSelect
              key={f.name}
              name={f.name}
              label={f.label}
              value={query[f.name] ?? ""}
              options={[{ value: "", label: `${f.label} : toutes` }, ...f.options]}
            />
          ))}
          {subFilters.some((f) => query[f.name]) && (
            <Link className="btn btn-small" href={`/${type.slug}?${mainFilter!.name}=${mainValue}`}>
              Effacer les filtres
            </Link>
          )}
        </form>
      )}

      {items.length === 0 ? (
        <div className="card empty">
          <p>
            {query.q || hasFilters
              ? "Aucun résultat pour cette recherche."
              : tab === "passes"
                ? `Aucun ${type.labelSingular} passé.`
                : `Aucun ${type.labelSingular} pour le moment.`}
          </p>
          <Link href={`/${type.slug}/nouveau${mainValue ? `?${mainFilter!.name}=${mainValue}` : ""}`} className="btn btn-primary">
            + Ajouter {article(type)} {type.labelSingular}
          </Link>
        </div>
      ) : (
        <ul className="item-list">
          {items.map((item, index) => {
            const d = item.draftData;
            const status = STATUS_LABELS[itemStatus(item)];
            const imageId = type.imageField ? d[type.imageField] : undefined;
            return (
              <li key={item.id} className={`item${item.isPublished ? "" : " is-hidden"}`}>
                {typeof imageId === "string" ? (
                  <img className="thumb" src={`/media/${tenant.id}/${imageId}-sm.webp`} alt="" />
                ) : (
                  <div className="thumb" aria-hidden>
                    {typeIcon(type)}
                  </div>
                )}
                <div>
                  <Link className="item-title" href={`/${type.slug}/${item.id}`}>
                    {String(d[type.titleField] || "(sans titre)")}
                  </Link>
                  <div className="item-meta">
                    {type.schedule && <span>{formatDateTime(d[type.schedule.startField])}</span>}
                    {type.subtitleField && d[type.subtitleField] ? <span>{String(d[type.subtitleField])}</span> : null}
                    {filterFields(type, d)
                      .filter((f) => d[f.name])
                      .map((f) => (
                        <span key={f.name}>· {optionLabel(type, f.name, d[f.name])}</span>
                      ))}
                    {"prix" in d && <strong>{formatPrice(d.prix)}</strong>}
                  </div>
                  <div className="item-meta">
                    <span className={status.className}>{status.label}</span>
                    {type.badgeField && d[type.badgeField] === true && <span className="badge badge-accent">Nouveauté</span>}
                  </div>
                </div>
                <div className="item-actions">
                  {canReorder && (
                    <>
                      <form action={moveAction}>
                        <Hidden slug={type.slug} id={item.id} back={back} ok="moved" />
                        <input type="hidden" name="$direction" value="up" />
                        <FilterInputs filters={filters} />
                        <button className="btn btn-small" disabled={index === 0} aria-label="Monter" title="Monter">
                          ↑
                        </button>
                      </form>
                      <form action={moveAction}>
                        <Hidden slug={type.slug} id={item.id} back={back} ok="moved" />
                        <input type="hidden" name="$direction" value="down" />
                        <FilterInputs filters={filters} />
                        <button className="btn btn-small" disabled={index === items.length - 1} aria-label="Descendre" title="Descendre">
                          ↓
                        </button>
                      </form>
                    </>
                  )}
                  {item.publishedData && (
                    <form action={setVisibilityAction}>
                      <Hidden slug={type.slug} id={item.id} back={back} ok={item.isPublished ? "hidden" : "shown"} />
                      <input type="hidden" name="$visible" value={item.isPublished ? "0" : "1"} />
                      <button className="btn btn-small">{item.isPublished ? "Masquer" : "Afficher"}</button>
                    </form>
                  )}
                  <Link className="btn btn-small btn-primary" href={`/${type.slug}/${item.id}`}>
                    Modifier
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Hidden({ slug, id, back, ok }: { slug: string; id: string; back: string; ok: string }) {
  return (
    <>
      <input type="hidden" name="$slug" value={slug} />
      <input type="hidden" name="$id" value={id} />
      <input type="hidden" name="$back" value={back} />
      <input type="hidden" name="$ok" value={ok} />
    </>
  );
}

/** Filtres de l'onglet affiché, pour déplacer un contenu parmi ses voisins visibles. */
function FilterInputs({ filters }: { filters: Record<string, string> }) {
  return (
    <>
      {Object.entries(filters).map(([k, v]) => (
        <input key={k} type="hidden" name={`$filter.${k}`} value={v} />
      ))}
    </>
  );
}
