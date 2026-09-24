import { describe, expect, it } from "vitest";
import {
  changePassword,
  createUser,
  getSessionUser,
  login,
  LOCK_DURATION_MS,
  resetPassword,
  SESSION_IDLE_MS,
} from "@/server/auth";
import { createReadKey } from "@/server/public-api";
import { auditLog } from "@/db/schema";
import { setup } from "./helpers";

describe("connexion", () => {
  it("connecte avec le bon mot de passe et crée une session", async () => {
    const f = await setup();
    const { token, user } = await login(f.db, "Caviste", "motdepasse-solide");
    expect(user.username).toBe("caviste");
    expect((await getSessionUser(f.db, token))?.id).toBe(user.id);
  });

  it("donne le même message pour un identifiant inconnu et un mauvais mot de passe", async () => {
    const f = await setup();
    const a = await login(f.db, "inconnu", "x").catch((e: Error) => e.message);
    const b = await login(f.db, "caviste", "mauvais").catch((e: Error) => e.message);
    expect(a).toBe(b);
  });

  it("bloque le compte 15 minutes après 5 échecs", async () => {
    const f = await setup();
    const t0 = new Date("2026-10-01T10:00:00Z");
    for (let i = 0; i < 4; i++) {
      await expect(login(f.db, "caviste", "mauvais", t0)).rejects.toMatchObject({ status: 401 });
    }
    await expect(login(f.db, "caviste", "mauvais", t0)).rejects.toMatchObject({ status: 429 });
    // Même le bon mot de passe est refusé pendant le blocage.
    await expect(login(f.db, "caviste", "motdepasse-solide", t0)).rejects.toMatchObject({ status: 429 });
    const later = new Date(t0.getTime() + LOCK_DURATION_MS + 1000);
    await expect(login(f.db, "caviste", "motdepasse-solide", later)).resolves.toBeTruthy();
  });

  it("expire une session inactive depuis plus de 8 heures", async () => {
    const f = await setup();
    const { token } = await login(f.db, "caviste", "motdepasse-solide");
    const later = new Date(Date.now() + SESSION_IDLE_MS + 60_000);
    expect(await getSessionUser(f.db, token, later)).toBeNull();
  });

  it("journalise les connexions", async () => {
    const f = await setup();
    await login(f.db, "caviste", "motdepasse-solide");
    const logs = await f.db.select().from(auditLog);
    expect(logs.map((l) => l.action)).toContain("auth.login");
  });
});

describe("gestion des comptes", () => {
  it("seul l'administrateur crée des comptes ou des clés", async () => {
    const f = await setup();
    const input = { username: "nouveau", displayName: "N", password: "motdepasse-long", role: "editor" as const, tenantId: f.caveId };
    await expect(createUser(f.db, f.caveEditor, input)).rejects.toMatchObject({ status: 403 });
    await expect(createReadKey(f.db, f.caveEditor, f.caveId, "x")).rejects.toMatchObject({ status: 403 });
    const user = await createUser(f.db, f.admin, input);
    expect(user.mustChangePassword).toBe(true);
  });

  it("après réinitialisation, l'ancien mot de passe ne marche plus et le changement est exigé", async () => {
    const f = await setup();
    const { token, user } = await login(f.db, "caviste", "motdepasse-solide");
    await resetPassword(f.db, f.admin, user.id, "temporaire-123");
    expect(await getSessionUser(f.db, token)).toBeNull();
    await expect(login(f.db, "caviste", "motdepasse-solide")).rejects.toMatchObject({ status: 401 });
    const { user: again } = await login(f.db, "caviste", "temporaire-123");
    expect(again.mustChangePassword).toBe(true);
    await expect(changePassword(f.db, again, "temporaire-123", "court")).rejects.toMatchObject({ status: 422 });
    await changePassword(f.db, again, "temporaire-123", "nouveau-mot-de-passe");
    const { user: final } = await login(f.db, "caviste", "nouveau-mot-de-passe");
    expect(final.mustChangePassword).toBe(false);
  });
});
