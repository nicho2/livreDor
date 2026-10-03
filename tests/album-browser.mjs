// Browser-client Playwright regression suite, run against scripts/ui-fixture.mjs.
// Accepts the documented tab + viewport handles; no cookies/session injection.
import assert from "node:assert/strict";
export async function loginFixture(tab) {
  await tab.goto("http://localhost:3100/auth?next=/p/album-test/guestbook");
  await tab.playwright.getByLabel("Email", { exact: true }).fill("recette@example.test");
  await tab.playwright.getByRole("button", { name: "Recevoir mon code" }).click();
  await tab.playwright.getByLabel("Code reçu").fill("123456");
  await tab.playwright.getByRole("button", { name: "Valider", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Feuilleter le livre" }).waitFor({ state: "visible" });
}
export async function testBook(tab, viewport, width) {
  await viewport.set({ width, height: 900 });
  await tab.goto("http://localhost:3100/p/album-test/guestbook");
  await tab.playwright.getByRole("button", { name: "Feuilleter le livre" }).click();
  const pages = width < 768 ? 1 : 2;
  assert.equal(await tab.playwright.locator(".open-book .book-page").count(), pages);
  assert.equal(await tab.playwright.getByRole("button", { name: "← Précédent" }).isEnabled(), false);
  await tab.playwright.getByRole("button", { name: "Suivant →", exact: true }).click();
  assert.match(await tab.playwright.locator(".book-controls").innerText(), new RegExp(`Page ${pages + 1}`));
  await tab.playwright.getByRole("button", { name: "← Précédent" }).click();
  assert.match(await tab.playwright.locator(".book-controls").innerText(), /Page 1/);
  assert.equal(await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  return `Livre ${width}px : pages, navigation, absence de débordement OK`;
}
export async function testEditor(tab, viewport, width) {
  await viewport.set({ width, height: 900 });
  await tab.goto("http://localhost:3100/p/album-test/contribute");
  await tab.playwright.getByPlaceholder("Écrivez votre message…").fill("Merci Camille 🌻\nUne belle histoire ensemble.");
  const bold = tab.playwright.getByRole("button", { name: "Gras", exact: true });
  if (await bold.getAttribute("aria-pressed") !== "true") await bold.click();
  await tab.playwright.getByLabel("Police", { exact: true }).selectOption("hand");
  await tab.playwright.getByLabel("Alignement").selectOption("center");
  if (width < 768) await tab.playwright.getByRole("button", { name: "Aperçu", exact: true }).click();
  const preview = tab.playwright.getByRole("region", { name: "Aperçu du message" });
  assert.equal(await preview.isVisible(), true);
  assert.match(await preview.innerText(), /Merci Camille 🌻/);
  assert.match(await preview.locator(".message").getAttribute("class"), /font-hand.*align-center.*weight-bold/);
  assert.equal(await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  if (width < 768) await tab.playwright.getByRole("button", { name: "Écrire", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Enregistrer en brouillon", exact: true }).first().click();
  await tab.playwright.getByText("Votre brouillon est enregistré.", { exact: true }).waitFor({ state: "visible" });
  await tab.playwright.getByRole("button", { name: "Mettre à jour et publier", exact: true }).click();
  await tab.playwright.getByText("Votre message est publié.", { exact: true }).waitFor({ state: "visible" });
  return `Éditeur ${width}px : aperçu, formatage et enregistrement OK`;
}
export async function testWall(tab, viewport, width) {
  await viewport.set({ width, height: 900 });
  await tab.goto("http://localhost:3100/p/album-test/wall");
  await tab.playwright.getByRole("button", { name: "Un bel instant 1", exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.locator(".memory-card").count(), 24);
  await tab.playwright.getByRole("button", { name: "Un bel instant 1", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Photo suivante →" }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.getByRole("dialog").isVisible(), true);
  await tab.playwright.getByRole("button", { name: "Photo suivante →" }).click();
  assert.match(await tab.playwright.locator(".media-gallery").innerText(), /Photo 2 sur 2/);
  await tab.playwright.getByRole("button", { name: "Zoomer", exact: true }).click();
  assert.equal(await tab.playwright.locator(".image-stage.zoomed").count(), 1);
  assert.equal(await tab.playwright.locator("audio").count(), 1);
  await tab.playwright.getByRole("button", { name: "Fermer ✕" }).press("Escape");
  assert.equal(await tab.playwright.getByRole("dialog").count(), 0);
  assert.equal(await tab.playwright.evaluate(() => document.activeElement?.textContent), "Un bel instant 1");
  await tab.playwright.getByRole("button", { name: "Afficher davantage de souvenirs" }).click();
  assert.equal(await tab.playwright.locator(".memory-card").count(), 30);
  assert.equal(await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  return `Mur ${width}px : galerie, zoom, audio, Échap, focus et lots OK`;
}
export async function testTimeline(tab, viewport, width) {
  await viewport.set({ width, height: 900 });
  await tab.goto("http://localhost:3100/p/album-test/timeline");
  await tab.playwright.getByRole("button", { name: "Un bel instant 1", exact: true }).waitFor({ state: "visible" });
  const columns = await tab.playwright.locator(".album-timeline").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  assert.equal(columns, width < 768 ? 1 : 2);
  await tab.playwright.getByRole("button", { name: "Afficher davantage de souvenirs" }).click();
  assert.equal(await tab.playwright.locator(".memory-card").count(), 29);
  await tab.playwright.getByRole("button", { name: "Un bel instant 1", exact: true }).click();
  await tab.playwright.getByRole("dialog").waitFor({ state: "visible" });
  await tab.playwright.getByRole("button", { name: "Fermer ✕" }).click();
  return `Chronologie ${width}px : disposition, dates et lecteur commun OK`;
}

export async function testThemeAndAccess(tab) {
  await tab.playwright.getByLabel("Ambiance").selectOption("classic");
  await tab.playwright.locator('[data-theme="classic"]').waitFor({ state: "visible" });
  await tab.reload();
  await tab.playwright.locator('[data-theme="classic"]').waitFor({ state: "visible" });
  await tab.playwright.getByLabel("Ambiance").selectOption("album");
  await tab.goto("http://localhost:3100/p/album-test/guestbook");
  await tab.playwright.getByRole("button", { name: "Feuilleter le livre" }).click();
  await tab.playwright.locator(".open-book").press("ArrowRight");
  assert.equal(await tab.playwright.getByRole("button", { name: "← Précédent" }).isEnabled(), true);
  await tab.playwright.getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await tab.playwright.getByText("Connectez-vous pour consulter les projets et souvenirs").waitFor({ state: "visible" });
  assert.equal(await tab.playwright.locator(".book-page").count(), 0);
  assert.equal(await tab.playwright.locator(".project-nav").count(), 0);
  return "Thèmes persistants, clavier et retrait des contenus à la déconnexion OK";
}
