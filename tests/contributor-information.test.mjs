import { test } from "node:test";
import assert from "node:assert/strict";
import { retentionDeadline, organizerMessageSchema } from "../src/lib/contributor-information.ts";

test("conservation : trois mois calendaires, fin de mois et changement d'année", () => {
  assert.equal(retentionDeadline("2026-10-04"), "2027-01-04");
  assert.equal(retentionDeadline("2026-11-30"), "2027-02-28");
  assert.equal(retentionDeadline("2027-11-30"), "2028-02-29");
  assert.equal(retentionDeadline(null), null);
  assert.equal(retentionDeadline("2026-02-30"), null);
});
test("message privé : texte utile, catégorie bornée, identité et longueur contrôlées", () => {
  const input = { displayName: " Alex ", category: "rights", body: " Retirer ma photo, souvenir Café. " };
  assert.equal(organizerMessageSchema.parse(input).displayName, "Alex");
  assert.equal(organizerMessageSchema.safeParse({ ...input, body: "  " }).success, false);
  assert.equal(organizerMessageSchema.safeParse({ ...input, category: "public" }).success, false);
  assert.equal(organizerMessageSchema.safeParse({ ...input, body: "x".repeat(5001) }).success, false);
  assert.equal(organizerMessageSchema.safeParse({ ...input, authorId: "spoofed" }).success, false);
});
