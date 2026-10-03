import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { mkdir, open, unlink, readFile, writeFile, rename } from "node:fs/promises";
import { loadDataset, loadAssets, validateTarget, assertSeedProject, seedDataset, httpJson, SeedError } from "./seed-core.mjs";
import { makeClients, organizerLogin, createBackend } from "./seed-backend.mjs";

let lock, lockPath, terminal;
try {
  const { values } = parseArgs({ options: { url: { type: "string" }, slug: { type: "string" }, apply: { type: "boolean", default: false }, "confirm-slug": { type: "string" } } });
  const origin = validateTarget(values.url, values.slug);
  const data = await loadDataset(), assets = await loadAssets(data);
  console.log(`Cible : ${origin}/p/${values.slug}`);
  console.log("Jeu : 4 auteurs fictifs, 4 messages (3 publiés / 1 brouillon), 8 souvenirs (5 publiés / 2 brouillons / 1 masqué), 5 pièces jointes (2 images, vidéo, audio, image privée).");
  if (!values.apply) {
    console.log("APERÇU HORS LIGNE : aucun appel réseau, aucun email ni donnée envoyé. Ajouter -Apply pour lancer l'alimentation.");
  } else {
    if (values["confirm-slug"] !== values.slug) throw new SeedError("Confirmation du lien de test absente.");
    const clients = makeClients(process.env);
    const { data: project, error } = await clients.anon().from("projects").select("id,slug,title,status").eq("slug", values.slug).single();
    if (error || !project || !/^[0-9a-f-]{36}$/i.test(project.id)) throw new SeedError("Projet introuvable dans le Supabase configuré.");
    if (!/^TEST\b/i.test(project.title)) throw new SeedError("Le titre du projet doit commencer par TEST.");
    await mkdir(new URL("../.seed-runs/", import.meta.url), { recursive: true });
    lockPath = new URL(`../.seed-runs/${project.id}.lock`, import.meta.url);
    lock = await open(lockPath, "wx");
    const journalPath = new URL(`../.seed-runs/${project.id}.json`, import.meta.url);
    let state = { projectId: project.id, retired: [] };
    try { state = JSON.parse(await readFile(journalPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (state.projectId !== project.id || !Array.isArray(state.retired) || state.retired.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new SeedError("Journal de reprise invalide : ne pas le supprimer sans diagnostic.");
    const journal = { retired: new Set(state.retired), async retire(id) {
      if (!state.retired.includes(id)) state.retired.push(id);
      const pending = new URL(`../.seed-runs/${project.id}.json.tmp`, import.meta.url);
      await writeFile(pending, JSON.stringify(state), "utf8");
      await rename(pending, journalPath);
    } };
    terminal = createInterface({ input: process.stdin, output: process.stdout });
    const operator = clients.anon();
    const organizerToken = await organizerLogin(operator, (text) => terminal.question(text));
    const snapshot = await httpJson(fetch, `${origin}/api/projects/${project.id}/admin`, organizerToken);
    // This check also proves the hosted application uses the same project/backend.
    assertSeedProject(snapshot, values.slug, data, project.id);
    const counts = await seedDataset({ data, snapshot, slug: values.slug, projectId: project.id, assets, backend: createBackend(clients, origin, fetch, journal) });
    const final = await httpJson(fetch, `${origin}/api/projects/${project.id}/admin`, organizerToken);
    if (final.entries.length !== counts.entries || final.memories.length !== counts.memories || final.media.filter((m) => ["published", "hidden"].includes(m.status)).length < counts.media) throw new SeedError("Alimentation incomplète : vérifier Organisation avant de relancer.");
    console.log("Jeu de test présent. Vérifier le mur, la chronologie, les brouillons et les médias dans Organisation.");
    console.log("Aucun projet créé, aucun organisateur ajouté, aucun email fictif envoyé. Une relance conserve les contenus et la modération existants.");
  }
} catch (error) {
  // Do not emit arbitrary exception text from SDK/fetch/parseArgs (could contain credentials).
  if (error instanceof SeedError) console.error(error.message);
  else if (error.code === "EEXIST") console.error("Une alimentation est déjà verrouillée. Voir la procédure de reprise dans docs/16-SYNTHETIC-SEED.md.");
  else console.error("Erreur réseau, fichier ou configuration : alimentation arrêtée sans afficher de données sensibles.");
  console.error("Après interruption, relancer la même commande conserve les lignes présentes. Voir docs/16-SYNTHETIC-SEED.md.");
  process.exitCode = 1;
} finally {
  terminal?.close();
  if (lock) { await lock.close(); await unlink(lockPath); }
}
