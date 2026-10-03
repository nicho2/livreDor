import assert from "node:assert/strict";
import test from "node:test";
import { chronologicalMemories, memoryDateLabel, formattingClasses, projectWindow } from "../src/lib/presentation.ts";
import { renderStaticSite, archiveMediaPath, escapeHtml } from "../src/lib/archive-render.ts";
const base = { id: "1", project_id: "p", author_id: "a", display_name: "Auteur", body: "Texte", title: null, occurred_on: null, year_from: null, year_to: null, status: "published", created_at: "2026-01-01" };
test("chronologie mélange correctement années, périodes et dates, sans date en dernier", () => {
  const input = [base, { ...base, id: "2", occurred_on: "2015-06-12" }, { ...base, id: "3", year_from: 1998, year_to: 2002 }, { ...base, id: "4", year_to: 2010 }];
  assert.deepEqual(chronologicalMemories(input).map((m) => m.id), ["3", "4", "2", "1"]);
  assert.equal(memoryDateLabel(input[2]), "1998 – 2002");
  assert.equal(memoryDateLabel(input[3]), "Jusqu'en 2010");
});
test("fenêtre fermée et future détectées aux limites", () => {
  const p = { status: "open", opens_at: "2026-01-01T00:00:00Z", closes_at: "2026-02-01T00:00:00Z" };
  assert.equal(projectWindow(p, Date.parse(p.opens_at) - 1).future, true);
  assert.equal(projectWindow(p, Date.parse(p.opens_at)).closed, false);
  assert.equal(projectWindow(p, Date.parse(p.closes_at)).closed, true);
  assert.equal(projectWindow({ ...p, status: "closed" }, Date.parse(p.opens_at)).closed, true);
});
test("styles limités : valeurs malveillantes de base ne deviennent pas du CSS", () => {
  const classes = formattingClasses({ font: "serif", align: "center", color: "url(evil)", size: "lg", bold: true, italic: false });
  assert.equal(classes, "message font-serif size-lg align-center color-ink weight-bold");
});
test("site autonome sans brouillons, contenus masqués, liens externes ni HTML utilisateur", () => {
  const project = { title: "<script>alert(1)</script>", subject_name: "Nom", description: "A&B" };
  const media = [{ id: "media1", memory_id: "1", kind: "image", mime_type: "image/png", status: "published", original_filename: 'photo\".png' }];
  const html = renderStaticSite({ project, entries: [], memories: [base, { ...base, id: "hidden", body: "SECRET MASQUÉ", status: "hidden" }, { ...base, id: "draft", body: "SECRET BROUILLON", status: "draft" }], media }, new Set(["media1"]));
  assert.ok(html.includes("media/image/media1.png"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("SECRET") && !html.includes("<script>") && !html.includes("https://"));
  assert.ok(!html.includes("fetch(") && !html.includes("author_id"));
  assert.equal(archiveMediaPath(media[0]), "media/image/media1.png");
  assert.equal(escapeHtml('"<&'), "&quot;&lt;&amp;");
});
test("informations du projet et date d'événement incluses dans la restitution", () => {
  const project = { title: "Nouveau titre", subject_name: "Marie & Jean", description: "Présentation modifiée", event_date: "2026-10-03" };
  const html = renderStaticSite({ project, entries: [], memories: [], media: [] }, new Set());
  assert.ok(html.includes("Nouveau titre") && html.includes("Marie &amp; Jean") && html.includes("Présentation modifiée"));
  assert.ok(html.includes("Date de l'événement : 3 octobre 2026"));
  assert.ok(!renderStaticSite({ project: { ...project, event_date: null }, entries: [], memories: [], media: [] }, new Set()).includes("Date de l'événement"));
});
