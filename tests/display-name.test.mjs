import test from "node:test";
import assert from "node:assert/strict";
import { resolveDisplayName, suggestDisplayName } from "../src/lib/display-name.ts";

test("nom du dernier souvenir, puis message et profil en repli", () => {
  assert.equal(suggestDisplayName(" Alice ", "Bob", "Charles"), "Alice");
  assert.equal(suggestDisplayName(null, "Bob", "Charles"), "Bob");
  assert.equal(suggestDisplayName(" ", null, "Charles"), "Charles");
  assert.equal(suggestDisplayName(null, undefined), "");
});
test("préremplissage sans écraser un nom existant ou saisi", () => {
  assert.equal(resolveDisplayName("", false, "Alice"), "Alice");
  assert.equal(resolveDisplayName("Bob", false, "Alice"), "Bob");
  assert.equal(resolveDisplayName("Bob", true, "Alice"), "Bob");
  assert.equal(resolveDisplayName("", true, "Alice"), "");
});
