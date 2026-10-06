import assert from "node:assert/strict";

// Isolated --organizer UI fixture only: no real email, Supabase or R2 access.
export async function testOrganizerContact(tab, baseUrl) {
  await tab.goto(`${baseUrl}/p/album-test/information`);
  await tab.playwright.getByRole("heading", { name: "Votre contribution, jusqu’au souvenir final", exact: true }).waitFor({ state: "visible" });
  assert.match(await tab.playwright.locator("main").innerText(), /1 mars 2027/);
  await tab.playwright.getByLabel("Votre nom affiché", { exact: true }).fill("RECETTE — Alex");
  await tab.playwright.getByRole("combobox", { name: "Objet de votre demande", exact: true }).selectOption("rights");
  await tab.playwright.getByLabel("Votre message privé", { exact: true }).fill("ÉCHEC EMAIL — Retirer une photo synthétique.");
  await tab.playwright.getByRole("button", { name: "Envoyer à l’organisateur", exact: true }).click();
  await tab.playwright.getByText("Envoi email simulé refusé. Votre texte reste dans le formulaire.", { exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.evaluate(() => document.querySelector('textarea[name="body"]')?.value), "ÉCHEC EMAIL — Retirer une photo synthétique.");
  await tab.playwright.getByLabel("Votre message privé", { exact: true }).fill("Retirer une photo synthétique. RECETTE contact privé.");
  await tab.playwright.getByRole("button", { name: "Envoyer à l’organisateur", exact: true }).click();
  await tab.playwright.getByText("Votre message est enregistré et la notification email a été acceptée pour les organisateurs.", { exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.getByText("Retirer une photo synthétique. RECETTE contact privé.", { exact: true }).count(), 1);
  assert.ok(!(await tab.playwright.locator("main").innerText()).includes("recette@example.test"));
  await tab.goto(`${baseUrl}/p/album-test/admin`);
  await tab.playwright.getByRole("heading", { name: "Messages privés des contributeurs", exact: true }).waitFor({ state: "visible" });
  await tab.playwright.getByRole("button", { name: "Marquer comme lu", exact: true }).click();
  await tab.playwright.getByText("Message marqué comme lu. Cela ne signifie pas que la demande a été traitée.", { exact: true }).waitFor({ state: "visible" });
  return "Étapes, date limite, échec email avec texte conservé, notification simulée et lecture organisateur OK";
}
