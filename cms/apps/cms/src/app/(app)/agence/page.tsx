import { notFound } from "next/navigation";
import { desc, eq, isNull, or } from "drizzle-orm";
import { auditLog, users } from "@/db/schema";
import { listKeys } from "@/server/public-api";
import { requireContext } from "@/lib/session";
import { formatShortDate } from "@/lib/format";
import {
  createKeyAction,
  createUserAction,
  resetPasswordAction,
  revokeKeyAction,
  toggleUserAction,
} from "@/app/actions";
import { Flash } from "@/components/Flash";

export const metadata = { title: "Agence" };

export default async function AgencyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user, actor, tenant, db } = await requireContext();
  if (user.role !== "admin") notFound();
  const query = await searchParams;

  const [accounts, keys, logs] = await Promise.all([
    db.select().from(users).where(or(eq(users.tenantId, tenant.id), isNull(users.tenantId))).orderBy(users.username),
    listKeys(db, actor, tenant.id),
    db
      .select({ log: auditLog, username: users.username })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .where(eq(auditLog.tenantId, tenant.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(50),
  ]);

  return (
    <>
      <Flash params={query} />
      <div className="page-head">
        <div>
          <h1>Agence · {tenant.name}</h1>
          <p>Comptes, clés d'accès du site et journal d'activité de ce client.</p>
        </div>
      </div>

      <div className="stack">
        <section className="card">
          <h2>Comptes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>État</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.displayName}</td>
                    <td>{u.role === "admin" ? "Administrateur agence" : "Éditeur"}</td>
                    <td>
                      {u.disabled ? "Désactivé" : u.lockedUntil && u.lockedUntil > new Date() ? "Bloqué (tentatives)" : "Actif"}
                      {u.mustChangePassword && " · mot de passe à changer"}
                    </td>
                    <td>
                      <div className="stack" style={{ gap: "0.4rem" }}>
                        <form action={resetPasswordAction} className="inline-form">
                          <input type="hidden" name="userId" value={u.id} />
                          <input name="password" type="text" placeholder="Mot de passe temporaire" minLength={10} required aria-label="Mot de passe temporaire" />
                          <button className="btn btn-small">Réinitialiser</button>
                        </form>
                        {u.id !== user.id && (
                          <form action={toggleUserAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="disabled" value={u.disabled ? "0" : "1"} />
                            <button className="btn btn-small">{u.disabled ? "Réactiver" : "Désactiver"}</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 style={{ marginTop: "1.25rem" }}>Nouveau compte</h2>
          <form action={createUserAction} className="inline-form">
            <input name="username" placeholder="Identifiant" required aria-label="Identifiant" />
            <input name="displayName" placeholder="Nom affiché" aria-label="Nom affiché" />
            <input name="password" type="text" placeholder="Mot de passe temporaire (10 car. min.)" minLength={10} required aria-label="Mot de passe temporaire" />
            <select name="role" aria-label="Rôle" style={{ width: "auto", minHeight: 36, padding: "0.2rem 0.5rem" }}>
              <option value="editor">Éditeur de {tenant.name}</option>
              <option value="admin">Administrateur agence</option>
            </select>
            <button className="btn btn-small btn-primary">Créer</button>
          </form>
        </section>

        <section className="card">
          <h2>Clés d'accès du site (lecture)</h2>
          <p className="help" style={{ color: "var(--muted)", marginTop: 0 }}>
            À placer dans la configuration du site. Une clé de lecture ne donne accès qu'au contenu publié. Origines autorisées :{" "}
            {tenant.allowedOrigins.join(", ") || "aucune"}.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Début de la clé</th>
                  <th>Créée le</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.label}</td>
                    <td>
                      <code>{k.keyPrefix}…</code>
                    </td>
                    <td>{formatShortDate(k.createdAt)}</td>
                    <td>{k.revokedAt ? `Révoquée le ${formatShortDate(k.revokedAt)}` : "Active"}</td>
                    <td>
                      {!k.revokedAt && (
                        <form action={revokeKeyAction}>
                          <input type="hidden" name="keyId" value={k.id} />
                          <button className="btn btn-small btn-danger">Révoquer</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={createKeyAction} className="inline-form" style={{ marginTop: "1rem" }}>
            <input name="label" placeholder="Nom de la clé (ex. Site en ligne)" required aria-label="Nom de la clé" />
            <button className="btn btn-small btn-primary">Créer une clé</button>
          </form>
        </section>

        <section className="card">
          <h2>Journal d'activité (50 dernières actions)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(({ log, username }) => (
                  <tr key={log.id}>
                    <td>{formatShortDate(log.createdAt)}</td>
                    <td>{username ?? "—"}</td>
                    <td>{log.action}</td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{JSON.stringify(log.details)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
