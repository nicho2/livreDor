import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";

test("documentation : tous les liens Markdown locaux désignent des fichiers existants", async () => {
  const root = new URL("../", import.meta.url);
  const files = ["README.md", "CODEX-START-HERE.md", ...(await readdir(new URL("docs/", root))).filter((name) => name.endsWith(".md")).map((name) => `docs/${name}`)];
  let checked = 0;
  for (const name of files) {
    const file = new URL(name, root);
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|#|mailto:)/.test(target)) continue;
      await assert.doesNotReject(access(new URL(target.split("#")[0], file)), `${name} : lien absent ${target}`);
      checked++;
    }
  }
  assert.ok(checked >= 20);
});
