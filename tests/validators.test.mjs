import assert from "node:assert/strict";
import test from "node:test";
import { memorySchema, guestbookEntrySchema } from "../src/lib/validators.ts";

const memory = { displayName: " Test ", title: "", body: " Souvenir ", occurredOn: "", yearFrom: null, yearTo: null };

test("souvenir sans date et normalisation du texte", () => {
  const result = memorySchema.parse(memory);
  assert.equal(result.displayName, "Test");
  assert.equal(result.body, "Souvenir");
});
test("dates réelles et années bissextiles", () => {
  for (const occurredOn of ["2015-06-12", "2024-02-29"]) {
    assert.equal(memorySchema.safeParse({ ...memory, occurredOn }).success, true);
  }
  for (const occurredOn of ["2023-02-29", "2024-02-30", "2024-13-01", "12/06/2015", "demain"]) {
    assert.equal(memorySchema.safeParse({ ...memory, occurredOn }).success, false, occurredOn);
  }
});
test("périodes ordonnées, bornes et années seules", () => {
  for (const [yearFrom, yearTo] of [[1998, 2002], [2000, 2000], [1998, null], [null, 2002]]) {
    assert.equal(memorySchema.safeParse({ ...memory, yearFrom, yearTo }).success, true);
  }
  for (const [yearFrom, yearTo] of [[2002, 1998], [1899, null], [null, 2201], [1998.5, null]]) {
    assert.equal(memorySchema.safeParse({ ...memory, yearFrom, yearTo }).success, false);
  }
});
test("date exacte et période sont exclusives", () => {
  assert.equal(memorySchema.safeParse({ ...memory, occurredOn: "2015-06-12", yearFrom: 2015 }).success, false);
});
test("contenu vide ou trop long refusé", () => {
  for (const changes of [{ displayName: " " }, { body: " " }, { title: "x".repeat(121) }, { body: "x".repeat(8001) }]) {
    assert.equal(memorySchema.safeParse({ ...memory, ...changes }).success, false);
  }
});
test("mise en forme bornée, sans CSS arbitraire", () => {
  const entry = { displayName: "Test", message: "Bonjour", formatting: { font: "sans", size: "md", align: "left", color: "ink", bold: false, italic: false } };
  assert.equal(guestbookEntrySchema.safeParse(entry).success, true);
  assert.equal(guestbookEntrySchema.safeParse({ ...entry, formatting: { ...entry.formatting, color: "red; background:url(...)" } }).success, false);
});
