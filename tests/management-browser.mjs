import assert from "node:assert/strict";
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
  assert.equal(await tab.playwright.getByRole("button", { name: "Archiver", exact: true }).isEnabled(), false);
  await tab.playwright.getByRole("button", { name: "Clôturer", exact: true }).click();
  await tab.playwright.getByRole("button", { name: "Confirmer", exact: true }).click();
  // The organizer fixture supplies a synthetic UX blob, not a real ZIP.
  const exportButton = tab.playwright.getByRole("button", { name: "Télécharger l'archive ZIP", exact: true });
  await exportButton.click();
  await tab.playwright.getByRole("link", { name: "Enregistrer le ZIP préparé", exact: true }).waitFor({ state: "visible", timeoutMs: 20000 });
  await tab.playwright.getByRole("button", { name: "Archiver", exact: true }).click();
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
