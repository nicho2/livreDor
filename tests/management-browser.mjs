import assert from "node:assert/strict";
export async function testCreateFixture(tab, slug) {
  await tab.goto("http://localhost:3100/nouveau");
  await tab.playwright.getByLabel("Titre du LivreDor", { exact: true }).fill("Projet de recette création");
  await tab.playwright.getByLabel("Prénom et nom, ou nom de l'événement", { exact: true }).fill("Événement fictif");
  await tab.playwright.getByLabel("Lien du projet", { exact: true }).fill(slug);
  await tab.playwright.getByRole("button", { name: "Créer mon LivreDor", exact: true }).click();
  await tab.playwright.getByRole("heading", { name: "Projet de recette création", exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.url(), `http://localhost:3100/p/${slug}/admin`);
  await tab.reload();
  await tab.playwright.getByRole("heading", { name: "Collecte et sauvegarde", exact: true }).waitFor({ state: "visible" });
  await tab.goto("http://localhost:3100/nouveau");
  await tab.playwright.getByLabel("Titre du LivreDor", { exact: true }).fill("Ne doit pas remplacer le projet");
  await tab.playwright.getByLabel("Prénom et nom, ou nom de l'événement", { exact: true }).fill("Autre événement fictif");
  await tab.playwright.getByLabel("Lien du projet", { exact: true }).fill(slug);
  await tab.playwright.getByRole("button", { name: "Créer mon LivreDor", exact: true }).click();
  await tab.playwright.getByText("Ce lien existe déjà. Choisissez un autre lien ; aucun projet existant n'a été modifié.", { exact: true }).waitFor({ state: "visible" });
  await tab.goto(`http://localhost:3100/p/${slug}/admin`);
  await tab.playwright.getByRole("heading", { name: "Projet de recette création", exact: true }).waitFor({ state: "visible" });
  return "Création, rôle organisateur, persistance et doublon de lien vérifiés";
}
export async function testManagerAndThemes(tab, viewport, width) {
  await viewport.set({ width, height: 950 });
  await tab.goto("http://localhost:3100/");
  assert.equal(await tab.playwright.getByRole("link", { name: "Créer un LivreDor", exact: true }).count(), 0);
  await tab.playwright.getByText("LivreDor · v0.1.1", { exact: true }).waitFor({ state: "visible", timeoutMs: 20000 });
  await tab.goto("http://localhost:3100/all");
  await tab.playwright.getByRole("link", { name: "Créer un LivreDor", exact: true }).waitFor({ state: "visible", timeoutMs: 20000 });
  await tab.goto("http://localhost:3100/p/album-test/admin");
  const selector = tab.playwright.getByRole("combobox", { name: "Thème du projet", exact: true });
  await selector.waitFor({ state: "visible", timeoutMs: 20000 });
  assert.equal(await selector.locator("option").count(), 8);
  for (const theme of ["classic", "retirement", "birthday", "wedding", "departure", "birth", "memory", "album"]) {
    await selector.selectOption(theme);
    await tab.playwright.getByRole("button", { name: "Enregistrer le thème", exact: true }).click();
    await tab.playwright.locator(`.project-theme[data-theme="${theme}"]`).first().waitFor({ state: "visible", timeoutMs: 20000 });
    await tab.playwright.locator(`.theme-root[data-theme="${theme}"]`).waitFor({ state: "visible", timeoutMs: 20000 });
  }
  await tab.reload();
  await selector.waitFor({ state: "visible", timeoutMs: 20000 });
  assert.equal(await selector.evaluate(el => el.value), "album");
  assert.equal(await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await tab.playwright.evaluate(() => innerWidth), width);
  return `Gestionnaire et 8 thèmes persistants à ${width}px OK`;
}
export async function testDangerZone(tab) {
  await tab.goto("http://localhost:3100/p/album-test/admin");
  const danger = tab.playwright.getByRole("region", { name: "Zone de danger" });
  await danger.waitFor({ state: "visible", timeoutMs: 20000 });
  const remove = tab.playwright.getByRole("button", { name: "Supprimer définitivement le projet", exact: true });
  assert.equal(await remove.isEnabled(), false);
  assert.equal(await tab.playwright.getByRole("button", { name: "Archiver le projet", exact: true }).isEnabled(), false);
  await tab.playwright.getByRole("button", { name: "Clôturer", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Confirmer", exact: true }).click();
  // The organizer fixture supplies a synthetic UX blob, not a real ZIP.
  const exportButton = tab.playwright.getByRole("button", { name: "Préparer et télécharger le ZIP", exact: true });
  await exportButton.click();
  await tab.playwright.getByRole("link", { name: "Télécharger à nouveau le même ZIP", exact: true }).waitFor({ state: "visible", timeoutMs: 20000 });
  await tab.playwright.getByRole("button", { name: "Archiver le projet", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Confirmer", exact: true }).click();
  await danger.getByRole("checkbox").check();
  await danger.getByRole("textbox").fill("wrong-slug");
  assert.equal(await remove.isEnabled(), false);
  await danger.getByRole("textbox").fill("album-test");
  assert.equal(await remove.isEnabled(), true);
  await danger.getByRole("checkbox").uncheck();
  assert.equal(await remove.isEnabled(), false);
  return "Zone de danger : états, ZIP, archivage et double confirmation OK";
}

// Only run against the disposable organizer fixture, after testDangerZone.
export async function testDeleteFixture(tab) {
  assert.equal(new URL(await tab.url()).origin, "http://localhost:3100");
  const danger = tab.playwright.getByRole("region", { name: "Zone de danger" });
  await danger.getByRole("checkbox").check();
  await danger.getByRole("textbox").fill("album-test");
  await tab.playwright.getByRole("button", { name: "Supprimer définitivement le projet", exact: true }).click();
  await tab.playwright.getByRole("heading", { name: "Construire ensemble une histoire à transmettre.", exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.getByRole("link", { name: "Une nouvelle aventure" }).count(), 0);
  await tab.reload();
  assert.equal(await tab.playwright.getByRole("link", { name: "Une nouvelle aventure" }).count(), 0);
  return "Suppression du projet fictif et retour accueil vérifiés";
}

export async function testManagerDenied(tab) {
  for (const path of ["/all", "/nouveau"]) {
    await tab.goto(`http://localhost:3100${path}`);
    await tab.playwright.getByText("Cet espace est réservé aux gestionnaires du site.", { exact: true }).waitFor({ state: "visible" });
    assert.equal(await tab.playwright.getByRole("link", { name: "Créer un LivreDor", exact: true }).count(), 0);
  }
  await tab.playwright.getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await tab.goto("http://localhost:3100/all");
  await tab.playwright.getByRole("link", { name: "Recevoir mon code", exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.getByRole("link", { name: "Créer un LivreDor", exact: true }).count(), 0);
  return "Gestion refusée au contributeur et connexion requise après déconnexion OK";
}
