// Browser-client Playwright regression suite, run against scripts/ui-fixture.mjs.
// Accepts the documented tab + viewport handles; no cookies/session injection.
import assert from "node:assert/strict";
export async function loginFixture(tab, entryUrl = "http://localhost:3100/auth?next=/p/album-test/guestbook") {
  await tab.goto(entryUrl);
  await tab.playwright.getByLabel("Email", { exact: true }).fill("recette@example.test");
  await tab.playwright.getByRole("button", { name: "Recevoir mon code" }).click();
  await tab.playwright.getByLabel("Code reçu").fill("123456");
  await tab.playwright.getByRole("button", { name: "Valider", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Feuilleter le livre" }).waitFor({ state: "visible" });
}

export async function testInternalPortLogin(tab) {
  await loginFixture(tab, "http://localhost:3101/auth?next=/p/album-test/guestbook");
  assert.equal(await tab.url(), "http://localhost:3100/p/album-test/guestbook");
  return "Accès par 3101 : redirection vers 3100, OTP et livre chargés OK";
}
export async function testBook(tab, viewport, width) {
  await tab.goto("http://localhost:3100/p/album-test/guestbook");
  await viewport.set({ width, height: 900 });
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
  await tab.playwright.getByRole("button", { name: "Feuilleter le livre" }).click();
  const pages = width < 768 ? 1 : 2;
  await tab.playwright.locator(".open-book > .book-page").nth(1).waitFor({ state: pages === 1 ? "hidden" : "visible" });
  assert.equal(await tab.playwright.locator(".open-book > .book-page").count(), pages);
  assert.equal(await tab.playwright.getByRole("button", { name: "← Précédent" }).isEnabled(), false);
  await tab.playwright.getByRole("button", { name: "Suivant →", exact: true }).click();
  assert.match(await tab.playwright.locator(".book-controls").innerText(), new RegExp(`Page ${pages + 1}`));
  await tab.playwright.getByRole("button", { name: "← Précédent" }).click();
  assert.match(await tab.playwright.locator(".book-controls").innerText(), /Page 1/);
  assert.equal(await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  return `Livre ${width}px : pages, navigation, absence de débordement OK`;
}
export async function testEditor(tab, viewport, width) {
  await tab.goto("http://localhost:3100/p/album-test/contribute");
  await viewport.set({ width, height: 900 });
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
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
  await tab.goto("http://localhost:3100/p/album-test/wall");
  await viewport.set({ width, height: 900 });
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
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
  await tab.goto("http://localhost:3100/p/album-test/timeline");
  await viewport.set({ width, height: 900 });
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
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
  await tab.playwright.locator(".turning-sheet").waitFor({ state: "hidden" });
  assert.equal(await tab.playwright.getByRole("button", { name: "← Précédent" }).isEnabled(), true);
  await tab.playwright.getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await tab.playwright.getByText("Connectez-vous pour consulter les projets et souvenirs").waitFor({ state: "visible" });
  assert.equal(await tab.playwright.locator(".book-page").count(), 0);
  assert.equal(await tab.playwright.locator(".project-nav").count(), 0);
  return "Thèmes persistants, clavier et retrait des contenus à la déconnexion OK";
}

export async function testPageTurn(tab, viewport, width) {
  await tab.goto("http://localhost:3100/p/album-test/guestbook");
  await viewport.set({ width, height: 900 });
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
  await tab.playwright.getByRole("button", { name: "Feuilleter le livre" }).click();
  const previous = tab.playwright.getByRole("button", { name: "← Précédent" });
  const next = tab.playwright.getByRole("button", { name: "Suivant →", exact: true });
  assert.equal(await previous.evaluate(el => getComputedStyle(el).cursor), "default");
  await next.click();
  const reduced = await tab.playwright.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (!reduced) {
    await tab.playwright.locator(".turn-next").waitFor({ state: "visible" });
    assert.notEqual(await tab.playwright.locator(".turn-next").evaluate(el => getComputedStyle(el).transform), "none");
    assert.equal(await next.isEnabled(), false);
  }
  await tab.playwright.locator(".turning-sheet").waitFor({ state: "hidden" });
  await previous.click();
  if (!reduced) await tab.playwright.locator(".turn-previous").waitFor({ state: "visible" });
  await tab.playwright.locator(".turning-sheet").waitFor({ state: "hidden" });
  assert.match(await tab.playwright.locator(".book-controls").innerText(), /Page 1/);
  while (await next.isEnabled()) {
    await next.click();
    await tab.playwright.locator(".turning-sheet").waitFor({ state: "hidden" });
  }
  const lastPage = await tab.playwright.locator(".book-controls").innerText();
  await tab.playwright.locator(".open-book").press("ArrowRight");
  assert.equal(await tab.playwright.locator(".book-controls").innerText(), lastPage);
  assert.equal(await next.evaluate(el => getComputedStyle(el).cursor), "default");
  return `Livre ${width}px : feuille tournée dans les deux sens, limites et curseurs OK`;
}

export async function testLargeAlbum(tab, viewport, width) {
  await tab.goto("http://localhost:3100/p/album-test/wall");
  await viewport.set({ width, height: 900 });
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
  await tab.playwright.getByRole("button", { name: "Un bel instant 1", exact: true }).waitFor({ state: "visible" });
  await tab.playwright.getByRole("button", { name: "Ouvrir le souvenir · 20 médias", exact: true }).first().waitFor({ state: "visible" });
  while (await tab.playwright.getByRole("button", { name: "Afficher davantage de souvenirs" }).count()) {
    const previousCount = await tab.playwright.locator(".memory-card").count();
    await tab.playwright.getByRole("button", { name: "Afficher davantage de souvenirs" }).press("Enter");
    await tab.playwright.locator(".memory-card").nth(previousCount).waitFor({ state: "attached", timeoutMs: 4000 });
  }
  await tab.playwright.locator(".memory-card").last().getByRole("button", { name: "Ouvrir le souvenir · 20 médias", exact: true }).waitFor({ state: "visible", timeoutMs: 10000 });
  assert.equal(await tab.playwright.locator(".memory-card").count(), 300);
  assert.equal(await tab.playwright.getByRole("button", { name: "Ouvrir le souvenir · 20 médias", exact: true }).count(), 300);
  assert.equal(await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  return `Album ${width}px : 300 souvenirs et 6000 métadonnées sans troncature ni débordement OK`;
}

export async function testStaticArchive(tab, viewport, width) {
  await tab.goto("http://localhost:3102");
  await viewport.set({ width, height: 900 });
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
  await tab.playwright.getByRole("heading", { name: "TEST V1", exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.locator("img").evaluate(el => el.complete && el.naturalWidth > 0), true);
  assert.equal(await tab.playwright.locator("script").count(), 0);
  assert.equal(await tab.playwright.getByText("SECRET BROUILLON", { exact: true }).count(), 0);
  assert.equal(await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await tab.playwright.getByRole("link", { name: "Mur des souvenirs", exact: true }).click();
  assert.ok((await tab.url()).endsWith("#mur"));
  return `Archive ${width}px : photo locale, navigation et confidentialité OK`;
}
