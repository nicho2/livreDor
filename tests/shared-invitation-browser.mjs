// Isolated fixture --invitation; no real accounts or injected browser sessions.
import assert from "node:assert/strict";
export async function testSharedInvitation(tab, origin = "http://localhost:3100") {
  await tab.goto(`${origin}/`);
  await tab.playwright.getByRole("link", { name: "Se connecter", exact: true }).click();
  await tab.playwright.getByLabel("Email", { exact: true }).fill("recette@example.test");
  await tab.playwright.getByRole("button", { name: "Recevoir mon code", exact: true }).click();
  await tab.playwright.getByLabel("Code reçu").fill("123456");
  await tab.playwright.getByRole("button", { name: "Valider", exact: true }).click();
  await tab.playwright.getByText("Aucun projet pour le moment. Ouvrez le lien d’invitation transmis par votre organisateur.", { exact: true }).waitFor({ state: "visible" });
  await tab.goto(`${origin}/p/other-private`);
  await tab.playwright.getByRole("alert").waitFor({ state: "visible" });
  assert.equal(await tab.playwright.getByText("PROJET À NE PAS AFFICHER", { exact: true }).count(), 0);
  await tab.goto(`${origin}/p/album-test?invitation=${"f".repeat(64)}`);
  await tab.playwright.getByRole("alert").waitFor({ state: "visible" });
  await tab.playwright.getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await tab.goto(`${origin}/p/album-test?invitation=${"a".repeat(64)}`);
  // The account header must preserve the invitation just like the main CTA.
  await tab.playwright.getByRole("link", { name: "Connexion", exact: true }).click();
  await tab.playwright.getByLabel("Email", { exact: true }).fill("recette@example.test");
  await tab.playwright.getByRole("button", { name: "Recevoir mon code", exact: true }).click();
  await tab.playwright.getByLabel("Code reçu").fill("123456");
  await tab.playwright.getByRole("button", { name: "Valider", exact: true }).click();
  await tab.playwright.getByRole("heading", { name: "Une nouvelle aventure", exact: true }).waitFor({ state: "visible" });
  // Await navigation by observing the URL outside the page, not by reading state.
  for (let i = 0; i < 20 && (await tab.url()).includes("invitation="); i++) await tab.playwright.getByRole("heading", { name: "Une nouvelle aventure", exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.url(), `${origin}/p/album-test`);
  await tab.goto(`${origin}/`);
  await tab.playwright.getByRole("heading", { name: "Une nouvelle aventure", exact: true }).waitFor({ state: "visible" });
  assert.equal(await tab.playwright.getByRole("link", { name: "Ouvrir le projet", exact: true }).count(), 1);
  await tab.goto(`${origin}/p/album-test/guestbook`);
  await tab.playwright.getByRole("button", { name: "Feuilleter le livre", exact: true }).waitFor({ state: "visible" });
  return "OTP depuis l’accueil et l’invitation, code invalide, projet tiers refusé, accès mémorisé sans contribution et livre consultable : OK";
}
