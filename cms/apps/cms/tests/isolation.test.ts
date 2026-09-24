import { beforeEach, describe, expect, it } from "vitest";
import {
  createItem,
  getItem,
  listItems,
  saveItem,
  setPublished,
  trashItem,
} from "@/server/content";
import { createReadKey, listPublished, tenantForKey } from "@/server/public-api";
import { AppError } from "@/server/errors";
import { setup, wine, type Fixture } from "./helpers";

// Principe III (NON NÉGOCIABLE) : aucun accès aux données d'un client depuis un autre (SC-005).
describe("isolation entre clients", () => {
  let f: Fixture;
  let caveItemId: string;

  beforeEach(async () => {
    f = await setup();
    caveItemId = (await createItem(f.db, f.caveEditor, f.caveId, "produit", wine(), { publish: true })).id;
  });

  const expectForbidden = async (p: Promise<unknown>) => {
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect([403, 404]).toContain((err as AppError).status);
  };

  it("un éditeur ne peut ni lister ni lire le contenu d'un autre client", async () => {
    await expectForbidden(listItems(f.db, f.otherEditor, f.caveId, "produit"));
    await expectForbidden(getItem(f.db, f.otherEditor, f.caveId, caveItemId));
    // Même en passant son propre client avec l'identifiant d'un contenu étranger.
    await expectForbidden(getItem(f.db, f.otherEditor, f.otherId, caveItemId));
  });

  it("un éditeur ne peut ni créer, ni modifier, ni masquer, ni supprimer chez un autre client", async () => {
    await expectForbidden(createItem(f.db, f.otherEditor, f.caveId, "produit", wine(), { publish: true }));
    await expectForbidden(
      saveItem(f.db, f.otherEditor, f.otherId, caveItemId, wine({ nom: "Piraté" }), { publish: true, revision: 1 }),
    );
    await expectForbidden(setPublished(f.db, f.otherEditor, f.otherId, caveItemId, false));
    await expectForbidden(trashItem(f.db, f.otherEditor, f.otherId, caveItemId));
    const item = await getItem(f.db, f.caveEditor, f.caveId, caveItemId);
    expect(item.draftData.nom).toBe("Pommard");
    expect(item.isPublished).toBe(true);
    expect(item.deletedAt).toBeNull();
  });

  it("la clé de lecture d'un client ne donne accès qu'à son contenu", async () => {
    const { key: otherKey } = await createReadKey(f.db, f.admin, f.otherId, "Site autre");
    const tenant = await tenantForKey(f.db, otherKey);
    expect(tenant.id).toBe(f.otherId);
    const res = await listPublished(f.db, tenant, "produit", {}, { baseUrl: "" });
    expect(res.items).toHaveLength(0);
  });

  it("une clé révoquée ou inconnue est refusée", async () => {
    await expect(tenantForKey(f.db, "sgt_pk_inconnue")).rejects.toMatchObject({ status: 401 });
    await expect(tenantForKey(f.db, null)).rejects.toMatchObject({ status: 401 });
  });

  it("l'administrateur de l'agence accède à tous les clients", async () => {
    expect(await listItems(f.db, f.admin, f.caveId, "produit")).toHaveLength(1);
    expect(await listItems(f.db, f.admin, f.otherId, "produit")).toHaveLength(0);
  });
});
