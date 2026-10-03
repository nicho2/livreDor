import test from "node:test";
import assert from "node:assert/strict";
import { getAuthReturnPath, getAuthHref } from "../src/lib/auth-navigation.ts";

test("retour aux routes locales du projet", () => {
  for (const path of ["/nouveau", "/p/depart-demo", "/p/depart-demo/contribute", "/p/autre-projet/guestbook", "/p/autre-projet/wall", "/p/autre-projet/timeline", "/p/autre-projet/memories/30000000-0000-4000-8000-000000000001"]) {
    assert.equal(getAuthReturnPath(path), path);
  }
});
test("refus des redirections externes, encodées ou ambiguës", () => {
  for (const path of ["https://example.com", "//example.com", "javascript:alert(1)", "/p/demo/../../auth", "/p/demo/%2f%2fexample.com", "/auth", "/p/demo?next=evil", "/p/demo/memories/not-an-id", "/p/demo/memories/30000000-0000-4000-8000-000000000001?next=evil", "/p/demo\\evil", "/p/demo\n", ["/p/demo"], null, undefined]) {
    assert.equal(getAuthReturnPath(path), "/");
  }
});
test("repli sûr et conservation du projet dans le lien de connexion", () => {
  assert.equal(getAuthReturnPath(undefined, "/p/depart-demo/contribute"), "/p/depart-demo/contribute");
  assert.equal(getAuthReturnPath(undefined, "//evil.com"), "/");
  assert.equal(getAuthHref("/p/depart-demo/contribute"), "/auth?next=%2Fp%2Fdepart-demo%2Fcontribute");
  assert.equal(getAuthHref("/"), "/auth");
  assert.equal(getAuthHref("/nouveau"), "/auth?next=%2Fnouveau");
  assert.equal(getAuthReturnPath("/nouveau?next=//evil.test"), "/");
});
