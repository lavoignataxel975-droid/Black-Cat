import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import os from "node:os";

/**
 * Parcours du bar Aperture : connexion → modification de la carte et des snacks → publication →
 * vérification sur le site. Les tests s'enchaînent et partagent l'état de la base (lancer sur une
 * base fraîchement initialisée).
 */

const SITE = process.env.SITE_URL ?? "http://localhost:5173";
const SEED_PASSWORD = "aperture-a-changer";
const NEW_PASSWORD = "aperture-e2e-2026";
const SHOTS = process.env.SHOTS_DIR ?? path.join(os.tmpdir(), "aperture-e2e");

const CMS = process.env.CMS_URL ?? "http://localhost:3100";

test.describe.configure({ mode: "serial" });

// Le site est configuré pour le CMS de http://localhost:3100. Quand les tests visent un autre
// CMS (base de test séparée), ses appels y sont redirigés.
test.beforeEach(async ({ page }) => {
  if (CMS !== "http://localhost:3100") {
    await page.route("http://localhost:3100/**", (route) =>
      route.continue({ url: route.request().url().replace("http://localhost:3100", CMS) }),
    );
  }
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Identifiant").fill("aperture");
  await page.getByLabel("Mot de passe").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour");
}

async function openCarte(page: Page) {
  const cms = page.waitForResponse((r) => r.url().includes("/api/v1/content/cocktail"));
  await page.goto(`${SITE}/carte.html`);
  await cms;
}

test("première connexion : changement de mot de passe obligatoire", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Identifiant").fill("aperture");
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/mot-de-passe$/);

  await page.getByLabel("Mot de passe actuel").fill(SEED_PASSWORD);
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmer le nouveau mot de passe").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page.getByText("Votre mot de passe a été modifié.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-accueil.png`, fullPage: true });
});

test("le menu propose un espace « Cocktail » et un espace « Snack »", async ({ page }) => {
  await login(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Cocktail", "Snack"]);

  await nav.getByRole("link", { name: "Cocktail" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes cocktails");
  await expect(page.locator(".item")).toHaveCount(46);
  await page.screenshot({ path: `${SHOTS}/02-cocktails.png`, fullPage: true });

  await page.getByRole("link", { name: /Titres des sections/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes sections");
  await expect(page.locator(".item-title")).toHaveText([
    "Signatures — Lab Notes 001",
    "Bottle Aged Old Fashioned",
    "Cocktails Sans Alcool",
    "Classiques",
    "Vins & Boissons",
    "Réserve",
  ]);
  // L'espace Cocktail reste actif dans le menu sur l'onglet des sections.
  await expect(nav.getByRole("link", { name: "Cocktail" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Snack" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes snacks");
  await expect(page.locator(".item")).toHaveCount(7);
});

test("modifier un cocktail (nom, description, prix) : visible sur la carte", async ({ page }) => {
  await login(page);
  await page.goto("/cocktails");
  await page.locator(".toolbar").getByRole("link", { name: "Signatures — Lab Notes 001" }).click();
  await expect(page.locator(".item")).toHaveCount(14);
  await page.locator(".item", { hasText: "Fig Negroni" }).getByRole("link", { name: "Modifier" }).click();
  await page.getByLabel("Nom du cocktail").fill("Fig Negroni Maison");
  await page.getByLabel("Description").fill("Gin au figuier, Campari, vermouth · rond & amer");
  await page.getByLabel("Prix").fill("14 €");
  await page.getByRole("button", { name: "Publier sur le site" }).click();
  await expect(page.getByText("Publié ! La modification est visible sur le site.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/03-cocktail.png`, fullPage: true });

  await openCarte(page);
  const item = page.locator(".cat", { hasText: "Signatures — Lab Notes 001" }).locator(".menu-item").first();
  await expect(item.locator(".menu-item__name")).toHaveText("Fig Negroni Maison");
  await expect(item.locator(".menu-item__desc")).toHaveText("Gin au figuier, Campari, vermouth · rond & amer");
  await expect(item.locator(".menu-item__price")).toHaveText("14 €");
});

test("renommer une section et la déplacer : visible sur la carte", async ({ page }) => {
  await login(page);
  await page.goto("/sections");
  await page.locator(".item", { hasText: "Réserve" }).getByRole("link", { name: "Modifier" }).click();
  await page.getByLabel("Titre de la section").fill("La Réserve du bar");
  await page.getByRole("button", { name: "Publier sur le site" }).click();
  await expect(page.getByText("Publié ! La modification est visible sur le site.")).toBeVisible();

  await page.goto("/sections");
  await page.locator(".item", { hasText: "La Réserve du bar" }).getByRole("button", { name: "Monter" }).click();
  await expect(page.locator(".item-title").nth(4)).toHaveText("La Réserve du bar");

  await openCarte(page);
  await expect(page.locator(".cat__toggle > span:first-child")).toHaveText([
    "Signatures — Lab Notes 001",
    "Bottle Aged Old Fashioned",
    "Cocktails Sans Alcool",
    "Classiques",
    "La Réserve du bar",
    "Vins & Boissons",
  ]);
});

test("réordonner les cocktails dans une section", async ({ page }) => {
  await login(page);
  await page.goto("/cocktails");
  await page.locator(".toolbar").getByRole("link", { name: "Bottle Aged Old Fashioned" }).click();
  await expect(page.locator(".item-title")).toHaveText(["Toasted Pecan", "Rum Steak", "Oaxaca Old Fashioned"]);
  await page.locator(".item", { hasText: "Oaxaca Old Fashioned" }).getByRole("button", { name: "Monter" }).click();
  await expect(page.locator(".item-title")).toHaveText(["Toasted Pecan", "Oaxaca Old Fashioned", "Rum Steak"]);

  await openCarte(page);
  await expect(page.locator(".cat", { hasText: "Bottle Aged Old Fashioned" }).locator(".menu-item__name")).toHaveText([
    "Toasted Pecan",
    "Oaxaca Old Fashioned",
    "Rum Steak",
  ]);
});

test("ajouter une section puis un cocktail dedans : visible sur la carte", async ({ page }) => {
  await login(page);
  await page.goto("/sections");
  await page.getByRole("link", { name: "+ Ajouter une section" }).first().click();
  await page.getByLabel("Titre de la section").fill("Nouveautés d'automne");
  await page.getByRole("button", { name: "Publier sur le site" }).click();
  await expect(page.getByText("Publié ! La modification est visible sur le site.")).toBeVisible();

  // Nouvelle section en tête de liste : un onglet apparaît côté cocktails.
  await page.goto("/cocktails");
  await page.locator(".toolbar").getByRole("link", { name: "Nouveautés d'automne" }).click();
  await expect(page.locator(".item")).toHaveCount(0);
  // Ajout depuis l'onglet : la section est préremplie.
  await page.locator(".page-head").getByRole("link", { name: "+ Ajouter un cocktail" }).click();
  await expect(page.getByLabel("Section de la carte").locator("option:checked")).toHaveText("Nouveautés d'automne");
  await page.getByLabel("Nom du cocktail").fill("Apple & Smoke");
  await page.getByLabel("Description").fill("Calvados, cidre brut, sirop d'érable fumé");
  await page.getByLabel("Prix").fill("14 €");
  await page.getByRole("button", { name: "Publier sur le site" }).click();
  await expect(page.getByText("Publié ! La modification est visible sur le site.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/04-nouveau-cocktail.png`, fullPage: true });

  await openCarte(page);
  await expect(page.locator(".cat__toggle > span:first-child").first()).toHaveText("Nouveautés d'automne");
  const cat = page.locator(".cat").first();
  await cat.locator(".cat__toggle").click();
  await expect(cat.locator(".menu-item__name")).toHaveText(["Apple & Smoke"]);
  await expect(cat.locator(".menu-item__price")).toHaveText(["14 €"]);
  await expect(page.locator(".cat")).toHaveCount(7);
});

test("une section qui contient des cocktails ne peut pas être supprimée", async ({ page }) => {
  await login(page);
  await page.goto("/sections");
  await page.locator(".item", { hasText: "Classiques" }).getByRole("link", { name: "Modifier" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.locator(".alert-error")).toContainText("Suppression impossible : 15 cocktails sont encore dans cette section.");
  await page.goto("/sections");
  await expect(page.locator(".item", { hasText: "Classiques" })).toHaveCount(1);
});

test("l'accordéon de la carte fonctionne avec le contenu du CMS", async ({ page }) => {
  await openCarte(page);
  const cats = page.locator(".cat");
  await cats.nth(1).locator(".cat__toggle").click();
  await expect(cats.nth(1)).toHaveClass(/is-open/);
  await expect(cats.nth(1).locator(".cat__toggle")).toHaveAttribute("aria-expanded", "true");
  // Une seule section ouverte à la fois, un second clic referme.
  await cats.nth(3).locator(".cat__toggle").click();
  await expect(cats.nth(1)).not.toHaveClass(/is-open/);
  await expect(cats.nth(3)).toHaveClass(/is-open/);
  await cats.nth(3).locator(".cat__toggle").click();
  await expect(page.locator(".cat.is-open")).toHaveCount(0);
});

test("modifier un snack (titre, prix) : visible sur la page Snack", async ({ page }) => {
  await login(page);
  await page.goto("/snacks");
  await page.locator(".item", { hasText: "Tarama maison" }).getByRole("link", { name: "Modifier" }).click();
  await page.getByLabel("Titre du snack").fill("Tarama maison, œufs de truite, blinis");
  await page.getByLabel("Prix").fill("9 €");
  await page.getByRole("button", { name: "Publier sur le site" }).click();
  await expect(page.getByText("Publié ! La modification est visible sur le site.")).toBeVisible();

  const cms = page.waitForResponse((r) => r.url().includes("/api/v1/content/snack"));
  await page.goto(`${SITE}/snack.html`);
  await cms;
  const first = page.locator(".snack-item").first();
  await expect(first.locator(".snack-item__label")).toHaveText("Tarama maison, œufs de truite, blinis");
  await expect(first.locator(".snack-item__price")).toHaveText("9 €");
  await expect(page.locator(".snack-item")).toHaveCount(7);
});

test("un brouillon ou un contenu masqué n'apparaît pas sur le site", async ({ page }) => {
  await login(page);
  await page.goto("/snacks");
  await page.locator(".item", { hasText: "Churros" }).getByRole("link", { name: "Modifier" }).click();
  await page.getByLabel("Titre du snack").fill("Churros BROUILLON");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByText("modifications non publiées")).toBeVisible();

  await page.goto("/snacks");
  await page.locator(".item", { hasText: "Burrata" }).getByRole("button", { name: "Masquer" }).click();

  const cms = page.waitForResponse((r) => r.url().includes("/api/v1/content/snack"));
  await page.goto(`${SITE}/snack.html`);
  await cms;
  await expect(page.locator(".snack-item")).toHaveCount(6);
  await expect(page.getByText("Churros BROUILLON")).toHaveCount(0);
  await expect(page.getByText(/Burrata/)).toHaveCount(0);
});

test("si le CMS ne répond pas, la carte d'origine reste affichée", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto(`${SITE}/carte.html`);
  await expect(page.locator(".cat")).toHaveCount(6);
  await expect(page.locator(".menu-item__name").first()).toHaveText("Fig Negroni");
  await page.locator(".cat").first().locator(".cat__toggle").click();
  await expect(page.locator(".cat").first()).toHaveClass(/is-open/);
});
