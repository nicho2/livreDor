import test from "node:test";
import assert from "node:assert/strict";
import config from "../next.config.ts";

test("la recette redirige son port interne, sans changer les routes normales", async () => {
  const previous = process.env.LIVREDOR_UI_FIXTURE;
  try {
    delete process.env.LIVREDOR_UI_FIXTURE;
    assert.deepEqual(await config.redirects(), []);
    process.env.LIVREDOR_UI_FIXTURE = "1";
    const [redirect] = await config.redirects();
    assert.equal(redirect.destination, "http://localhost:3100/:path*");
    assert.equal(redirect.source, "/:path*");
    assert.equal(redirect.permanent, false);
    const condition = redirect.has[0];
    assert.equal(condition.type, "header");
    assert.equal(condition.key, "host");
    const matcher = new RegExp(`^${condition.value}$`);
    assert.equal(matcher.test("localhost:3101"), true);
    assert.equal(matcher.test("127.0.0.1:3101"), true);
    assert.equal(matcher.test("localhost:3100"), false);
    assert.equal(matcher.test("localhost:3000"), false);
  } finally {
    if (previous === undefined) delete process.env.LIVREDOR_UI_FIXTURE;
    else process.env.LIVREDOR_UI_FIXTURE = previous;
  }
});
