import test from "node:test";
import assert from "node:assert/strict";
import { createProjectSchema, projectDetailsSchema, projectDetailsRow, projectDetailsFromForm, organizerEmailSchema } from "../src/lib/project-settings.ts";
const details = { title: " Retraite de Marie ", subjectName: " Marie Martin ", description: " Une histoire collective ", eventDate: "2026-10-03" };
test("informations normalisées, champs secondaires facultatifs", () => {
  assert.deepEqual(projectDetailsRow(projectDetailsSchema.parse(details)), { title: "Retraite de Marie", subject_name: "Marie Martin", description: "Une histoire collective", event_date: "2026-10-03" });
  assert.equal(projectDetailsRow(projectDetailsSchema.parse({ ...details, description: "", eventDate: "" })).event_date, null);
});
test("noms et description bornés, dates réelles", () => {
  for (const invalid of [{ title: " " }, { subjectName: " " }, { description: "a".repeat(3001) }, { eventDate: "2026-02-30" }, { title: "a".repeat(161) }, { subjectName: "a".repeat(121) }]) assert.equal(projectDetailsSchema.safeParse({ ...details, ...invalid }).success, false);
});
test("création : lien local stable et rejet des paramètres de promotion", () => {
  assert.equal(createProjectSchema.safeParse({ ...details, slug: "depart-marie-2026" }).success, true);
  for (const slug of ["ab", "../admin", "https://evil.com", "Départ", "demo?x=y", "demo\nbad", "a".repeat(81)]) assert.equal(createProjectSchema.safeParse({ ...details, slug }).success, false);
  for (const extra of [{ role: "organizer" }, { created_by: "other-user" }, { projectId: "existing-project" }, { status: "open" }, { email: "person@example.test" }]) assert.equal(createProjectSchema.safeParse({ ...details, slug: "depart-marie", ...extra }).success, false);
  assert.equal(projectDetailsSchema.safeParse({ ...details, slug: "changed-link" }).success, false);
});
test("email d'invitation normalisé et invalide refusé", () => {
  assert.equal(organizerEmailSchema.parse(" SECOND@example.test "), "second@example.test");
  for (const email of ["", "nobody", "a@b", "a b@example.test", "a".repeat(255) + "@example.test"]) assert.equal(organizerEmailSchema.safeParse(email).success, false);
});

test("création avec organisateur : email normalisé, optionnel et strict", () => {
  const values = { ...details, slug: "nouveau-projet" };
  assert.equal(createProjectSchema.parse({ ...values, organizerEmail: " Organisateur@EXAMPLE.test " }).organizerEmail, "organisateur@example.test");
  assert.equal(createProjectSchema.safeParse({ ...values, organizerEmail: "" }).success, true);
  assert.equal(createProjectSchema.safeParse({ ...values, organizerEmail: "invalide" }).success, false);
  assert.equal(projectDetailsSchema.safeParse({ ...details, organizerEmail: "organisateur@example.test" }).success, false);
});
test("régression : la date native soumise est lue même sans événement React préalable", () => {
  const form = new FormData();
  for (const [key, value] of Object.entries(details)) form.set(key, value);
  assert.equal(projectDetailsRow(projectDetailsSchema.parse(projectDetailsFromForm(form))).event_date, "2026-10-03");
  form.set("eventDate", "");
  assert.equal(projectDetailsRow(projectDetailsSchema.parse(projectDetailsFromForm(form))).event_date, null);
});
