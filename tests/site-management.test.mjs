import test from "node:test";
import assert from "node:assert/strict";
import { isSiteManager } from "../src/lib/site-manager.ts";
import { getAuthReturnPath } from "../src/lib/auth-navigation.ts";
import { themes, themeIds, themeSchema, resolveTheme } from "../src/lib/themes.ts";
import { deleteProjectSchema, projectDeletionAllowed, purgeProjectObjects } from "../src/lib/project-deletion.ts";
import { renderStaticSite } from "../src/lib/archive-render.ts";

test("gestionnaire : adresse confirmée, correspondance exacte, refus par défaut", () => {
  const user = { email: "Manager@Example.test", email_confirmed_at: "2026-10-04" };
  assert.equal(isSiteManager(user, " manager@example.test , second@example.test "), true);
  for (const allowlist of [undefined, "", "other@example.test", "Manager@Example.test.evil"]) assert.equal(isSiteManager(user, allowlist), false);
  assert.equal(isSiteManager({ ...user, email_confirmed_at: undefined }, "manager@example.test"), false);
  assert.equal(isSiteManager({ ...user, email: undefined }, "manager@example.test"), false);
  assert.equal(getAuthReturnPath("/all"), "/all");
  assert.equal(getAuthReturnPath("/all?admin=true"), "/");
});
test("skins : huit choix bornés, thème partagé conservé dans l'archive sans injection", () => {
  assert.equal(themeIds.length, 8);
  for (const theme of themeIds) {
    assert.equal(themeSchema.parse(theme), theme);
    const html = renderStaticSite({ project: { title: "TEST", theme }, entries: [], memories: [], media: [] }, new Set());
    assert.ok(html.includes(`data-theme="${theme}"`));
    assert.ok(html.includes(`--accent:${themes[theme].accent}`));
  }
  assert.equal(resolveTheme('" onclick="evil()'), "album");
  assert.equal(themeSchema.safeParse("custom").success, false);
});
test("suppression : archive obligatoire, preuve et confirmations non falsifiables par JSON", () => {
  for (const status of ["draft", "open", "closed"]) assert.equal(projectDeletionAllowed({ status, archive_exported_at: "now" }), false);
  assert.equal(projectDeletionAllowed({ status: "archived" }), false);
  assert.equal(projectDeletionAllowed({ status: "archived", archive_exported_at: "now" }), true);
  assert.equal(deleteProjectSchema.safeParse({ confirmation: "test", archiveSaved: true }).success, true);
  for (const input of [{ confirmation: "test", archiveSaved: false }, { confirmation: "test", archiveSaved: true, projectId: "other" }, { confirmation: "test", archiveSaved: "true" }]) assert.equal(deleteProjectSchema.safeParse(input).success, false);
});
const id = "10000000-0000-4000-8000-000000000001";
test("purge : plusieurs lots, temporaires et orphelins, aucun objet d'un autre projet", async () => {
  const keys = new Set(Array.from({ length: 2005 }, (_, i) => `${id}/${i < 1000 ? "uploads/" : ""}${i}`));
  keys.add("other-project/keep");
  let batches = 0;
  await purgeProjectObjects(id, { list: async prefix => [...keys].filter(key => key.startsWith(prefix)).slice(0, 1000), remove: async page => { batches++; for (const key of page) keys.delete(key); } });
  assert.equal(batches, 3);
  assert.deepEqual([...keys], ["other-project/keep"]);
});
test("purge : échec partiel repris et refus d'une page sortant du préfixe", async () => {
  const keys = new Set([`${id}/a`, `${id}/b`]);
  await assert.rejects(purgeProjectObjects(id, { list: async () => [...keys], remove: async page => { keys.delete(page[0]); throw new Error("Storage unavailable"); } }));
  assert.equal(keys.size, 1);
  await purgeProjectObjects(id, { list: async () => [...keys], remove: async page => { for (const key of page) keys.delete(key); } });
  assert.equal(keys.size, 0);
  await assert.rejects(purgeProjectObjects(id, { list: async () => ["other/keep"], remove: async () => assert.fail("must not delete") }));
  await assert.rejects(purgeProjectObjects("../bucket", { list: async () => assert.fail("must not list"), remove: async () => {} }));
});
