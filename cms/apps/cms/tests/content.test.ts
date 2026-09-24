import { beforeEach, describe, expect, it } from "vitest";
import { findType, validateContent } from "@/content-types";
import {
  createItem,
  itemStatus,
  listItems,
  listVersions,
  moveItem,
  restoreItem,
  restoreVersion,
  saveItem,
  setPublished,
  trashItem,
} from "@/server/content";
import { listPublished } from "@/server/public-api";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setup, wine, type Fixture } from "./helpers";

const produit = findType("lacave", { key: "produit" })!;

describe("validation", () => {
  it("normalise un prix au format français et un millésime", () => {
    const { data, errors } = validateContent(produit, wine(), { forPublish: true });
    expect(errors).toEqual({});
    expect(data).toMatchObject({ prix: 50, millesime: 2023, nouveaute: true, categorie: "vins" });
  });

  it("bloque la publication si un champ obligatoire est vide, avec un message clair", () => {
    const { errors } = validateContent(produit, wine({ nom: "  ", prix: "" }), { forPublish: true });
    expect(errors.nom).toBe("« Nom du produit » est obligatoire.");
    expect(errors.prix).toBe("« Prix (€) » est obligatoire.");
  });

  it("accepte un brouillon incomplet", () => {
    expect(validateContent(produit, { nom: "" }, { forPublish: false }).errors).toEqual({});
  });

  it("refuse les valeurs invalides", () => {
    const { errors } = validateContent(produit, wine({ prix: "abc", millesime: "12.5" }), { forPublish: true });
    expect(Object.keys(errors).sort()).toEqual(["millesime", "prix"]);
    expect(validateContent(produit, wine({ categorie: "voitures" }), { forPublish: true }).errors.categorie).toBeDefined();
  });

  it("refuse un lien d'inscription non web et une fin avant le début", () => {
    const evenement = findType("lacave", { key: "evenement" })!;
    const { errors } = validateContent(
      evenement,
      { titre: "Atelier", debut: "2026-10-03T18:00:00Z", fin: "2026-10-03T17:00:00Z", lien_inscription: "javascript:alert(1)" },
      { forPublish: true },
    );
    expect(errors.fin).toBeDefined();
    expect(errors.lien_inscription).toBeDefined();
  });
});

describe("brouillon, publication et site", () => {
  let f: Fixture;
  const pub = async () =>
    listPublished(f.db, (await f.db.select().from(tenants).where(eq(tenants.id, f.caveId)))[0]!, "produit", {}, {
      baseUrl: "http://cms",
    });

  beforeEach(async () => {
    f = await setup();
  });

  it("un brouillon n'est jamais visible sur le site", async () => {
    await createItem(f.db, f.caveEditor, f.caveId, "produit", wine(), { publish: false });
    expect((await pub()).items).toHaveLength(0);
  });

  it("modifier sans publier laisse la version publiée en ligne", async () => {
    const item = await createItem(f.db, f.caveEditor, f.caveId, "produit", wine(), { publish: true });
    const saved = await saveItem(f.db, f.caveEditor, f.caveId, item.id, wine({ prix: "55" }), {
      publish: false,
      revision: item.revision,
    });
    expect(itemStatus(saved)).toBe("changed");
    expect((await pub()).items[0]!.data.prix).toBe(50);

    await saveItem(f.db, f.caveEditor, f.caveId, item.id, wine({ prix: "55" }), { publish: true, revision: saved.revision });
    expect((await pub()).items[0]!.data.prix).toBe(55);
  });

  it("refuse d'écraser une modification concurrente", async () => {
    const item = await createItem(f.db, f.caveEditor, f.caveId, "produit", wine(), { publish: true });
    await saveItem(f.db, f.caveEditor, f.caveId, item.id, wine({ nom: "A" }), { publish: false, revision: item.revision });
    await expect(
      saveItem(f.db, f.caveEditor, f.caveId, item.id, wine({ nom: "B" }), { publish: false, revision: item.revision }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("masquer, mettre à la corbeille et restaurer", async () => {
    const item = await createItem(f.db, f.caveEditor, f.caveId, "produit", wine(), { publish: true });
    await setPublished(f.db, f.caveEditor, f.caveId, item.id, false);
    expect((await pub()).items).toHaveLength(0);
    await setPublished(f.db, f.caveEditor, f.caveId, item.id, true);
    expect((await pub()).items).toHaveLength(1);

    await trashItem(f.db, f.caveEditor, f.caveId, item.id);
    expect((await pub()).items).toHaveLength(0);
    expect(await listItems(f.db, f.caveEditor, f.caveId, "produit")).toHaveLength(0);
    expect(await listItems(f.db, f.caveEditor, f.caveId, "produit", { trash: true })).toHaveLength(1);

    await restoreItem(f.db, f.caveEditor, f.caveId, item.id);
    expect((await pub()).items).toHaveLength(1);
  });

  it("restaure une version précédente", async () => {
    const item = await createItem(f.db, f.caveEditor, f.caveId, "produit", wine(), { publish: true });
    const v2 = await saveItem(f.db, f.caveEditor, f.caveId, item.id, wine({ nom: "Erreur" }), {
      publish: true,
      revision: item.revision,
    });
    const versions = await listVersions(f.db, f.caveEditor, f.caveId, item.id);
    expect(versions.map((v) => v.number)).toEqual([2, 1]);
    await restoreVersion(f.db, f.caveEditor, f.caveId, item.id, versions[1]!.id);
    const restored = (await listItems(f.db, f.caveEditor, f.caveId, "produit"))[0]!;
    expect(restored.draftData.nom).toBe("Pommard");
    await saveItem(f.db, f.caveEditor, f.caveId, item.id, restored.draftData, { publish: true, revision: restored.revision });
    expect((await pub()).items[0]!.data.nom).toBe("Pommard");
    expect(v2.revision).toBeGreaterThan(item.revision);
  });

  it("filtre par catégorie et par nouveauté, et respecte l'ordre choisi", async () => {
    const a = await createItem(f.db, f.caveEditor, f.caveId, "produit", wine({ nom: "A" }), { publish: true });
    await createItem(f.db, f.caveEditor, f.caveId, "produit", wine({ nom: "B", categorie: "bieres", nouveaute: "" }), {
      publish: true,
    });
    const tenant = (await f.db.select().from(tenants).where(eq(tenants.id, f.caveId)))[0]!;
    const vins = await listPublished(f.db, tenant, "produit", { filter: { categorie: "vins" } }, { baseUrl: "" });
    expect(vins.items.map((i) => i.data.nom)).toEqual(["A"]);
    const news = await listPublished(f.db, tenant, "produit", { badge: true }, { baseUrl: "" });
    expect(news.items.map((i) => i.data.nom)).toEqual(["A"]);

    expect((await pub()).items.map((i) => i.data.nom)).toEqual(["B", "A"]);
    await moveItem(f.db, f.caveEditor, f.caveId, a.id, "up");
    expect((await pub()).items.map((i) => i.data.nom)).toEqual(["A", "B"]);
  });
});

describe("critères par catégorie", () => {
  it("n'enregistre que les critères de la catégorie choisie", () => {
    const { data, errors } = validateContent(
      produit,
      wine({ categorie: "spiritueux", type: "rouge", region: "bourgogne", type_spiritueux: "whisky", style: "ipa" }),
      { forPublish: true },
    );
    expect(errors).toEqual({});
    expect(data.type_spiritueux).toBe("whisky");
    expect(data).not.toHaveProperty("type");
    expect(data).not.toHaveProperty("region");
    expect(data).not.toHaveProperty("style");
  });

  it("la couleur n'est obligatoire que pour les vins", () => {
    expect(validateContent(produit, wine({ type: "" }), { forPublish: true }).errors.type).toBeDefined();
    expect(validateContent(produit, wine({ categorie: "bieres", type: "" }), { forPublish: true }).errors).toEqual({});
  });

  it("filtre par région et par couleur, et ignore les filtres inconnus", async () => {
    const f = await setup();
    await createItem(f.db, f.caveEditor, f.caveId, "produit", wine({ nom: "Pic", region: "languedoc" }), { publish: true });
    await createItem(f.db, f.caveEditor, f.caveId, "produit", wine({ nom: "Pommard", region: "bourgogne" }), { publish: true });
    await createItem(f.db, f.caveEditor, f.caveId, "produit", wine({ nom: "Meursault", type: "blanc", region: "bourgogne" }), {
      publish: true,
    });
    await createItem(f.db, f.caveEditor, f.caveId, "produit", wine({ nom: "Islay", categorie: "spiritueux", type_spiritueux: "whisky" }), {
      publish: true,
    });
    const tenant = (await f.db.select().from(tenants).where(eq(tenants.id, f.caveId)))[0]!;
    const names = async (filter: Record<string, string>) =>
      (await listPublished(f.db, tenant, "produit", { filter }, { baseUrl: "" })).items.map((i) => i.data.nom).sort();

    expect(await names({ categorie: "vins", region: "bourgogne" })).toEqual(["Meursault", "Pommard"]);
    expect(await names({ categorie: "vins", region: "bourgogne", type: "rouge" })).toEqual(["Pommard"]);
    expect(await names({ type_spiritueux: "whisky" })).toEqual(["Islay"]);
    expect(await names({ _: "123", nom: "Pic" })).toHaveLength(4);

    const listed = await listItems(f.db, f.caveEditor, f.caveId, "produit", { filters: { categorie: "vins", region: "languedoc" } });
    expect(listed.map((i) => i.draftData.nom)).toEqual(["Pic"]);
  });
});

describe("événements", () => {
  it("n'expose que les événements à venir ou en cours, triés par date", async () => {
    const f = await setup();
    const now = new Date("2026-10-01T12:00:00Z");
    const ev = (titre: string, debut: string, fin?: string) =>
      createItem(f.db, f.caveEditor, f.caveId, "evenement", { titre, debut, fin }, { publish: true });
    await ev("Passé", "2026-09-20T18:00:00Z", "2026-09-20T20:00:00Z");
    await ev("Plus tard", "2026-11-05T18:00:00Z");
    await ev("En cours", "2026-10-01T10:00:00Z", "2026-10-01T14:00:00Z");
    await ev("Sans fin, commencé il y a 2 h", "2026-10-01T10:00:00Z");
    await ev("Sans fin, commencé hier", "2026-09-30T10:00:00Z");
    const tenant = (await f.db.select().from(tenants).where(eq(tenants.id, f.caveId)))[0]!;
    const res = await listPublished(f.db, tenant, "evenement", {}, { baseUrl: "", now });
    expect(res.items.map((i) => i.data.titre)).toEqual(["En cours", "Sans fin, commencé il y a 2 h", "Plus tard"]);
  });
});
