import test from "node:test";
import assert from "node:assert/strict";
import { projectLimit } from "../src/lib/project-quota.ts";
test("quota global : trois par défaut, zéro suspend, entier borné", () => {
  assert.equal(projectLimit(undefined), 3);
  assert.equal(projectLimit("3"), 3);
  assert.equal(projectLimit(" 5 "), 5);
  assert.equal(projectLimit("0"), 0);
  assert.equal(projectLimit("10000"), 10000);
  for (const value of ["", "-1", "3.5", "Infinity", "abc", "10001", "03", "3e2"]) assert.throws(() => projectLimit(value));
});
