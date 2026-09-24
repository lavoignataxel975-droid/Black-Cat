import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { findType, navGroup, validateContent, withReferenceOptions } from "@/content-types";
import { createItem, listItems, moveItem, referenceOptions, saveItem, setPublished, trashItem } from "@/server/content";
import { listPublished } from "@/server/public-api";
import { tenants, users, type Tenant } from "@/db/schema";
import { createPgliteDb, type Db } from "@/db/client";
import type { Actor } from "@/server/access";
import { hashPassword } from "@/server/auth";
import { CATEGORIES, PRODUITS, EVENEMENTS } from "../scripts/seed-data";

const produit = findType("blackcat", { key: "produit" })!;
const categorie = findType("blackcat", { key: "categorie" })!;
const evenement = findType("blackcat", { key: "evenement" })!;
const SOME_ID = randomUUID();

describe("types de contenu The Black Cat", () => {
  it("garde les prix tels qu'ils sont écrits sur la carte", () => {
    for (const prix of ["8,50 €", "3,20 / 5,90 / 24 €", "3 € / 27 €", "4 / 7,50 / 33 €"]) {
      const { data, errors } = validateContent(produit, { nom: "Mojito", categorie: SOME_ID, prix }, { forPublish: true });
      expect(errors).toEqual({});
      expect(data.prix).toBe(prix);
    }
    // Prix facultatif : « Bière du moment », « Virgin Mojito »…
    expect(validateContent(produit, { nom: "Bière du moment", categorie: SOME_ID }, { forPublish: true }).errors).toEqual({});
  });

  it("exige un nom et une catégorie pour un produit", () => {
    const { errors } = validateContent(produit, { nom: " ", categorie: "" }, { forPublish: true });
    expect(Object.keys(errors).sort()).toEqual(["categorie", "nom"]);
  });

  it("range chaque catégorie dans « Pour boire » ou « Pour manger »", () => {
    expect(validateContent(categorie, { nom: "Cocktails", groupe: "boire" }, { forPublish: true }).errors).toEqual({});
    expect(validateContent(categorie, { nom: "Burgers", groupe: "manger" }, { forPublish: true }).errors).toEqual({});
    expect(validateContent(categorie, { nom: "X", groupe: "digestif" }, { forPublish: true }).errors.groupe).toBeDefined();
  });

  it("exige un titre et une date pour un événement", () => {
    const { errors } = validateContent(evenement, { titre: "", debut: "" }, { forPublish: true });
    expect(Object.keys(errors).sort()).toEqual(["debut", "titre"]);
    expect(validateContent(evenement, { titre: "Blind test", debut: "2026-10-09T20:30" }, { forPublish: true }).errors).toEqual({});
  });

  it("regroupe produits et catégories sous « La Carte », les événements à part", () => {
    expect(navGroup("blackcat", produit).map((t) => t.key)).toEqual(["produit", "categorie"]);
    expect(navGroup("blackcat", categorie).map((t) => t.key)).toEqual(["produit", "categorie"]);
    expect(navGroup("blackcat", evenement).map((t) => t.key)).toEqual(["evenement"]);
  });

  it("présente la catégorie d'un produit comme une liste de choix, préremplie si demandé", () => {
    const options = { categorie: [{ value: "a", label: "Cocktails" }, { value: "b", label: "Burgers" }] };
    const field = withReferenceOptions(produit, options).fields.find((f) => f.name === "categorie")!;
    expect(field).toMatchObject({ kind: "select", options: options.categorie, default: "a" });
    const prefilled = withReferenceOptions(produit, options, { categorie: "b" }).fields.find((f) => f.name === "categorie")!;
    expect(prefilled).toMatchObject({ default: "b" });
  });

  it("le contenu de départ, repris de data.js, est valide", () => {
    for (const row of CATEGORIES) {
      expect(validateContent(categorie, { nom: row.nom, groupe: row.groupe, note: row.note }, { forPublish: true }).errors).toEqual({});
    }
    for (const row of EVENEMENTS) {
      expect(validateContent(evenement, row, { forPublish: true }).errors).toEqual({});
    }
    const cles = new Set(CATEGORIES.map((c) => c.cle));
    for (const row of PRODUITS) {
      expect(cles.has(row.categorie!)).toBe(true);
      expect(validateContent(produit, { ...row, categorie: SOME_ID }, { forPublish: true }).errors).toEqual({});
    }
    expect([CATEGORIES.length, PRODUITS.length, EVENEMENTS.length]).toEqual([17, 124, 6]);
  });
});

describe("carte : catégories, ordre et publication", () => {
  let db: Db;
  let tenant: Tenant;
  let editor: Actor;
  let cocktails: string;
  let burgers: string;

  beforeEach(async () => {
    db = await createPgliteDb();
    [tenant] = (await db
      .insert(tenants)
      .values({ slug: "blackcat", name: "The Black Cat", schemaKey: "blackcat" })
      .returning()) as [Tenant];
    const [u] = await db
      .insert(users)
      .values({
        username: "blackcat",
        displayName: "Black Cat",
        passwordHash: await hashPassword("motdepasse-solide"),
        role: "editor",
        tenantId: tenant.id,
      })
      .returning();
    editor = { id: u!.id, role: "editor", tenantId: tenant.id };
    burgers = (await createItem(db, editor, tenant.id, "categorie", { nom: "Burgers", groupe: "manger" }, { publish: true })).id;
    cocktails = (await createItem(db, editor, tenant.id, "categorie", { nom: "Cocktails", groupe: "boire" }, { publish: true })).id;
    // Ordre final : A1, B1, A2, B2 (chaque création passe en tête).
    for (const [nom, c] of [["B2", burgers], ["A2", cocktails], ["B1", burgers], ["A1", cocktails]]) {
      await createItem(db, editor, tenant.id, "produit", { nom, categorie: c, prix: "8,50 €" }, { publish: true });
    }
  });

  const names = async () => (await listItems(db, editor, tenant.id, "produit")).map((i) => i.draftData.nom);
  const idOf = async (nom: string) => (await listItems(db, editor, tenant.id, "produit")).find((i) => i.draftData.nom === nom)!.id;

  it("propose les catégories existantes, dans l'ordre, y compris une catégorie ajoutée", async () => {
    await createItem(db, editor, tenant.id, "categorie", { nom: "Rhums arrangés", groupe: "boire" }, { publish: false });
    expect(await referenceOptions(db, editor, tenant.id, produit)).toEqual({
      categorie: [
        { value: expect.any(String), label: "Rhums arrangés (pas sur le site)" },
        { value: cocktails, label: "Cocktails" },
        { value: burgers, label: "Burgers" },
      ],
    });
  });

  it("refuse une catégorie qui n'existe pas (ou d'un autre type)", async () => {
    const eventId = (await createItem(db, editor, tenant.id, "evenement", { titre: "DJ Set", debut: "2030-10-04T21:00" }, { publish: true })).id;
    for (const bad of [randomUUID(), eventId]) {
      await expect(createItem(db, editor, tenant.id, "produit", { nom: "X", categorie: bad }, { publish: true })).rejects.toMatchObject({
        fieldErrors: { categorie: expect.stringContaining("n'existe plus") },
      });
    }
  });

  it("ne supprime pas une catégorie qui contient encore des produits", async () => {
    await expect(trashItem(db, editor, tenant.id, cocktails)).rejects.toThrow(
      "Suppression impossible : 2 produits sont encore dans cette catégorie.",
    );
    for (const nom of ["A1", "A2"]) {
      const id = await idOf(nom);
      const item = (await listItems(db, editor, tenant.id, "produit")).find((i) => i.id === id)!;
      await saveItem(db, editor, tenant.id, id, { ...item.draftData, categorie: burgers }, { publish: true, revision: item.revision });
    }
    await trashItem(db, editor, tenant.id, cocktails);
    expect((await referenceOptions(db, editor, tenant.id, produit)).categorie!.map((o) => o.label)).toEqual(["Burgers"]);
  });

  it("déplace un produit parmi ceux de sa catégorie, sans toucher aux autres", async () => {
    await moveItem(db, editor, tenant.id, await idOf("A2"), "up", { categorie: cocktails });
    expect(await names()).toEqual(["A2", "B1", "A1", "B2"]);
    await moveItem(db, editor, tenant.id, await idOf("B2"), "up");
    expect(await names()).toEqual(["A2", "B1", "B2", "A1"]);
    await moveItem(db, editor, tenant.id, await idOf("A2"), "up", { categorie: cocktails });
    expect(await names()).toEqual(["A2", "B1", "B2", "A1"]);
  });

  it("expose sur le site les catégories et produits publiés, prix en texte compris", async () => {
    const res = await listPublished(db, tenant, "produit", {}, { baseUrl: "" });
    expect(res.items.map((i) => i.data.nom)).toEqual(["A1", "B1", "A2", "B2"]);
    expect(res.items[0]!.data).toEqual({ nom: "A1", categorie: cocktails, prix: "8,50 €" });

    const onlyCocktails = await listPublished(db, tenant, "produit", { filter: { categorie: cocktails } }, { baseUrl: "" });
    expect(onlyCocktails.items.map((i) => i.data.nom)).toEqual(["A1", "A2"]);

    await setPublished(db, editor, tenant.id, burgers, false);
    const cats = await listPublished(db, tenant, "categorie", {}, { baseUrl: "" });
    expect(cats.items.map((i) => [i.id, i.data.nom])).toEqual([[cocktails, "Cocktails"]]);
  });

  it("retire du site les événements dont la date est passée", async () => {
    await createItem(db, editor, tenant.id, "evenement", { titre: "Halloween passé", debut: "2020-10-31T21:00" }, { publish: true });
    await createItem(db, editor, tenant.id, "evenement", { titre: "Tournoi à venir", debut: "2035-10-02T20:00" }, { publish: true });
    const res = await listPublished(db, tenant, "evenement", {}, { baseUrl: "" });
    expect(res.items.map((i) => i.data.titre)).toEqual(["Tournoi à venir"]);
  });
});
