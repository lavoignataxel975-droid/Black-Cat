import Link from "next/link";
import { asc } from "drizzle-orm";
import { getSchema } from "@/content-types";
import { tenants } from "@/db/schema";
import { requireContext } from "@/lib/session";
import { logoutAction, selectTenantAction } from "@/app/actions";
import { NavLinks } from "./NavLinks";
import { BrandFonts, brandingOf, brandStyle } from "@/lib/branding";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Une entrée par type, ou par groupe de types (`nav.group`), qui s'ouvre sur le premier. */
function navEntries(schemaKey: string) {
  const entries: { href: string; label: string; match: string[] }[] = [];
  const byGroup = new Map<string, (typeof entries)[number]>();
  for (const t of getSchema(schemaKey).types) {
    const group = t.nav?.group;
    const existing = group ? byGroup.get(group) : undefined;
    if (existing) {
      existing.match.push(`/${t.slug}`);
      continue;
    }
    const entry = { href: `/${t.slug}`, label: group ?? `Mes ${t.labelPlural}`, match: [`/${t.slug}`] };
    if (group) byGroup.set(group, entry);
    entries.push(entry);
  }
  return entries;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, db } = await requireContext();
  const links = [
    { href: "/", label: "Accueil" },
    ...navEntries(tenant.schemaKey),
    ...(user.role === "admin" ? [{ href: "/agence", label: "Agence" }] : []),
  ];
  const allTenants = user.role === "admin" ? await db.select().from(tenants).orderBy(asc(tenants.name)) : [];
  const branding = brandingOf(tenant);

  return (
    <div className="brand-scope" style={brandStyle(branding)}>
      <BrandFonts branding={branding} />
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            {branding?.logo && <img src={branding.logo} alt="" className="brand-logo" width={34} height={34} />}
            {tenant.name}
            <small>Mon espace</small>
          </Link>
          <NavLinks links={links} />
          <div className="userbox">
            {allTenants.length > 1 && (
              <form action={selectTenantAction} className="inline-form">
                <label htmlFor="tenant-switch" className="sr-only">
                  Client
                </label>
                <select id="tenant-switch" name="tenantId" defaultValue={tenant.id} style={{ minHeight: 36, padding: "0.2rem 0.5rem" }}>
                  {allTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-small" type="submit">
                  Changer
                </button>
              </form>
            )}
            <Link href="/mot-de-passe" title="Changer de mot de passe">
              {capitalize(user.displayName)}
            </Link>
            <form action={logoutAction}>
              <button className="btn btn-small" type="submit">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
