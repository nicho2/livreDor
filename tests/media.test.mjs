import assert from "node:assert/strict";
import test from "node:test";
import { MEDIA_LIMITS, safeFilename, validateMediaFile } from "../src/lib/media.ts";
import { presignSchema } from "../src/lib/validators.ts";
test("MIME, extension et tailles bornées pour les quatre familles", () => {
  for (const [name, mime, kind] of [["Photo.JPG", "image/jpeg", "image"], ["film.mp4", "video/mp4", "video"], ["son.m4a", "audio/mp4", "audio"], ["texte.pdf", "application/pdf", "document"]]) {
    assert.equal(validateMediaFile(name, mime, MEDIA_LIMITS[kind]).ok, true);
    for (const size of [0, -1, NaN, Infinity, 1.5, MEDIA_LIMITS[kind] + 1]) assert.equal(validateMediaFile(name, mime, size).ok, false);
  }
  assert.equal(validateMediaFile("evil.html", "image/jpeg", 10).ok, false);
  assert.equal(validateMediaFile("photo.svg", "image/svg+xml", 10).ok, false);
  assert.equal(validateMediaFile("evil.jpg", "text/html", 10).ok, false);
});
test("noms sûrs et rattachement obligatoire à un souvenir", () => {
  assert.equal(safeFilename("../../Été photo.png").includes("/"), false);
  assert.equal(safeFilename("..."), "media");
  const input = { projectId: "11111111-1111-4111-8111-111111111111", filename: "photo.png", mimeType: "image/png", sizeBytes: 1 };
  assert.equal(presignSchema.safeParse(input).success, false);
  assert.equal(presignSchema.safeParse({ ...input, memoryId: input.projectId }).success, true);
});
