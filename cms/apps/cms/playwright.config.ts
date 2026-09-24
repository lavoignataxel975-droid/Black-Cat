import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout : CMS (http://localhost:3100) + site Aperture (http://localhost:5173).
 * Prérequis : base fraîchement initialisée (`npm run seed`), le CMS démarré, et le site servi
 * par `node server.cjs` depuis le dossier `aperture-site/`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: process.env.CMS_URL ?? "http://localhost:3100",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
