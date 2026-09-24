import Link from "next/link";
import { notFound } from "next/navigation";
import { findType, withReferenceOptions } from "@/content-types";
import { referenceOptions } from "@/server/content";
import { requireContext } from "@/lib/session";
import { article } from "@/lib/format";
import { ContentForm } from "@/components/ContentForm";

export const metadata = { title: "Ajouter" };

export default async function NewPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { collection } = await params;
  const { actor, tenant, db } = await requireContext();
  const baseType = findType(tenant.schemaKey, { slug: collection });
  if (!baseType) notFound();
  // Ajout depuis un onglet (ex. une section) : ce choix est prérempli.
  const type = withReferenceOptions(baseType, await referenceOptions(db, actor, tenant.id, baseType), await searchParams);
  return (
    <>
      <div className="breadcrumb">
        <Link href={`/${type.slug}`}>← Mes {type.labelPlural}</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>
            Ajouter {article(type)} {type.labelSingular}
          </h1>
          <p>Les champs marqués d'une étoile (*) sont obligatoires pour publier.</p>
        </div>
      </div>
      <div style={{ maxWidth: 760 }}>
        <ContentForm type={type} tenantId={tenant.id} />
      </div>
    </>
  );
}
