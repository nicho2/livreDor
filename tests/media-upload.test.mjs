import test from "node:test";
import assert from "node:assert/strict";
import { uploadMemoryMedia } from "../src/lib/media-upload.ts";

const file = new File(["synthetic"], "photo.png", { type: "image/png" });

test("envoi média : progression, finalisation et nettoyage limité à la réservation en échec", async () => {
  const original = globalThis.XMLHttpRequest;
  const calls = [];
  let status = 200;
  globalThis.XMLHttpRequest = class {
    upload = {};
    open(method, url) { calls.push([method, url]); }
    setRequestHeader(name, value) { assert.equal(name, "Content-Type"); assert.equal(value, "image/png"); }
    send(input) {
      assert.equal(input, file);
      this.status = status;
      this.upload.onprogress({ lengthComputable: true, loaded: file.size, total: file.size });
      this.onload();
    }
  };
  let finalizationFails = false;
  const request = async (url, init) => {
    calls.push([init.method, url]);
    if (url.endsWith("presign")) {
      assert.equal(JSON.parse(init.body).memoryId, "memory");
      return Response.json({ mediaId: "reservation", uploadUrl: "https://storage.example.test/upload" });
    }
    if (finalizationFails && init.method === "POST") throw new Error("Finalisation refusée");
    return Response.json({});
  };
  try {
    let progress;
    await uploadMemoryMedia("project", "memory", file, value => { progress = value; }, request);
    assert.equal(progress, 100);
    assert.deepEqual(calls.map(call => call[0]), ["POST", "PUT", "POST"]);
    calls.length = 0;
    status = 503;
    await assert.rejects(uploadMemoryMedia("project", "memory", file, () => {}, request), /stockage/);
    assert.deepEqual(calls.map(call => call[0]), ["POST", "PUT", "DELETE"]);
    assert.equal(calls.at(-1)[1], "/api/media/reservation");
    calls.length = 0;
    status = 200;
    finalizationFails = true;
    await assert.rejects(uploadMemoryMedia("project", "memory", file, () => {}, request), /Finalisation/);
    assert.deepEqual(calls.map(call => call[0]), ["POST", "PUT", "POST", "DELETE"]);
  } finally {
    if (original === undefined) delete globalThis.XMLHttpRequest;
    else globalThis.XMLHttpRequest = original;
  }
});

test("envoi média : fichier invalide refusé avant toute réservation", async () => {
  await assert.rejects(uploadMemoryMedia("project", "memory", new File(["x"], "photo.html", { type: "image/png" }), () => {}, async () => assert.fail("aucune requête")), /extension/);
});
