import assert from "node:assert/strict";

export async function testMemoryAudioVideo(tab, baseUrl, files) {
  const title = `RECETTE — Audio et vidéo ${Date.now()}`;
  await tab.goto(`${baseUrl}/p/album-test/contribute`);
  const editor = tab.playwright.locator("form").filter({ has: tab.playwright.getByRole("heading", { name: "Nouveau souvenir", exact: true }) });
  await editor.getByLabel("Titre (facultatif)").fill(title);
  await editor.getByLabel("Anecdote", { exact: true }).fill("Médias synthétiques pour la recette.");
  const chooserPromise = tab.playwright.waitForEvent("filechooser");
  await editor.locator('input[type="file"]').click();
  await (await chooserPromise).setFiles(files);
  await editor.getByRole("button", { name: "Publier ce souvenir", exact: true }).click();
  const card = tab.playwright.locator(".memory-summary").filter({ hasText: title });
  await card.getByText("Publié", { exact: true }).waitFor({ state: "visible" });
  assert.equal(await card.locator("audio").count(), 1);
  assert.equal(await card.locator("video").count(), 1);
  return title;
}

// Run with the isolated UI fixture. Uploads remain in memory, never in real R2.
export async function testMemoryEditor(tab, baseUrl, photoPath) {
  const title = `RECETTE — Photo à la création ${Date.now()}`;
  await tab.goto(`${baseUrl}/p/album-test/contribute`);
  const editor = tab.playwright.locator("form").filter({ has: tab.playwright.getByRole("heading", { name: "Nouveau souvenir", exact: true }) });
  await editor.getByLabel("Titre (facultatif)").fill(title);
  await editor.getByLabel("Anecdote", { exact: true }).fill("Souvenir synthétique avec photo.");
  const chooserPromise = tab.playwright.waitForEvent("filechooser");
  await editor.locator('input[type="file"]').click();
  const chooser = await chooserPromise;
  assert.equal(chooser.isMultiple(), true);
  await chooser.setFiles([photoPath]);
  assert.match(await editor.innerText(), /cafe\.png/);
  await editor.getByRole("button", { name: "Enregistrer en brouillon", exact: true }).click();
  const card = tab.playwright.locator(".memory-summary").filter({ hasText: title });
  await card.getByRole("button", { name: "Publier", exact: true }).waitFor({ state: "visible" });
  assert.match(await card.innerText(), /Brouillon/);
  assert.equal(await card.locator("img").count(), 1);
  await card.getByRole("button", { name: "Publier", exact: true }).click();
  await card.getByText("Publié", { exact: true }).waitFor({ state: "visible" });
  await card.getByRole("button", { name: "Modifier", exact: true }).click();
  await tab.playwright.getByRole("heading", { name: "Modifier le souvenir", exact: true }).waitFor({ state: "visible" });
  const focus = await tab.playwright.evaluate(() => ({ text: document.activeElement?.textContent, top: document.activeElement?.getBoundingClientRect().top, height: innerHeight }));
  assert.equal(focus.text, "Modifier le souvenir");
  assert.ok(focus.top >= 0 && focus.top < focus.height);
  assert.equal(await tab.playwright.evaluate(() => document.querySelector(".memory-editor-fields textarea")?.value), "Souvenir synthétique avec photo.");
  await tab.playwright.getByRole("button", { name: "Annuler", exact: true }).click();
  return "Média dès la création, brouillon avec photo, publication directe et focus du formulaire OK";
}

export async function testMemoryUploadFailure(tab, baseUrl, refusedPhotoPath, photoPath) {
  await tab.goto(`${baseUrl}/p/album-test/contribute`);
  const editor = tab.playwright.locator("form").filter({ has: tab.playwright.getByRole("heading", { name: "Nouveau souvenir", exact: true }) });
  await editor.getByLabel("Titre (facultatif)").fill("RECETTE — Envoi interrompu");
  await editor.getByLabel("Anecdote", { exact: true }).fill("Le texte doit rester disponible après un échec.");
  const chooserPromise = tab.playwright.waitForEvent("filechooser");
  await editor.locator('input[type="file"]').click();
  await (await chooserPromise).setFiles(photoPath ? [photoPath, refusedPhotoPath] : [refusedPhotoPath]);
  await editor.getByRole("button", { name: "Publier ce souvenir", exact: true }).click();
  await tab.playwright.getByText(/Souvenir conservé en brouillon\./).waitFor({ state: "visible" });
  const card = tab.playwright.locator(".memory-summary").filter({ hasText: "RECETTE — Envoi interrompu" });
  assert.match(await card.innerText(), /Brouillon/);
  const editing = tab.playwright.locator("form").filter({ has: tab.playwright.getByRole("heading", { name: "Modifier le souvenir", exact: true }) });
  assert.match(await editing.innerText(), /refuse\.png/);
  if (photoPath) {
    assert.equal(await editing.getByRole("button", { name: "Retirer", exact: true }).count(), 1);
    assert.equal(await editing.locator("img").count(), 2);
  }
  await editing.getByRole("button", { name: "Retirer", exact: true }).click();
  await editing.getByRole("button", { name: "Mettre à jour et publier", exact: true }).click();
  await card.getByText("Publié", { exact: true }).waitFor({ state: "visible" });
  assert.equal(await card.count(), 1);
  return "Échec upload : brouillon et sélection conservés, reprise sans doublon OK";
}
