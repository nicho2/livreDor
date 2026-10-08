import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { httpJson, stableId, SeedError } from "./seed-core.mjs";

const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
function checked(result, label) {
  if (result.error) throw new SeedError(`${label} refusé par Supabase.`);
  return result.data;
}

export function makeClients(env, fetcher = fetch) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !env.SUPABASE_SERVICE_ROLE_KEY) throw new SeedError("Variables Supabase manquantes dans le fichier local de préparation.");
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash || !/^[a-z0-9-]+\.supabase\.co$/.test(target.hostname) || target.pathname !== "/") throw new SeedError("Utilisez l'URL HTTPS officielle du projet Supabase, sans chemin.");
  const options = { auth: authOptions, global: { fetch: (input, init) => fetcher(input, { ...init, redirect: "error", signal: init?.signal ?? AbortSignal.timeout(30000) }) } };
  return { anon: () => createClient(url, key, options), admin: createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, options) };
}

export async function organizerLogin(client, ask) {
  const email = (await ask("Email de votre compte organisateur : ")).trim();
  // Never create an operator account implicitly. Only this real account receives an email.
  checked(await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } }), "Envoi du code organisateur");
  const token = (await ask("Code reçu par email : ")).trim();
  const data = checked(await client.auth.verifyOtp({ email, token, type: "email" }), "Connexion organisateur");
  if (!data.session) throw new SeedError("Session organisateur absente.");
  return data.session.access_token;
}

export function createBackend(clients, origin, fetcher = fetch, journal = { retired: new Set(), retire: async () => {} }, invitationToken) {
  const call = (route, token, method, body) => httpJson(fetcher, `${origin}${route}`, token, method, body);
  return {
    async author(actor, projectId) {
      const tag = stableId(projectId, `actor:${actor.key}`);
      const email = `livredor-${tag}@seed.example.invalid`;
      // Search only to recover this exact synthetic identity after interruption.
      let existing;
      for (let page = 1; ; page++) {
        const users = checked(await clients.admin.auth.admin.listUsers({ page, perPage: 1000 }), "Lecture des comptes synthétiques").users;
        existing = users.find((u) => u.email === email);
        if (existing || users.length < 1000) break;
      }
      const marker = { version: "seed-v1", project_id: projectId, actor: actor.key };
      const saved = existing?.user_metadata?.livredor_seed;
      if (existing && (!saved || Object.entries(marker).some(([key, value]) => saved[key] !== value))) throw new SeedError("Collision avec un compte non identifié comme synthétique ; arrêt sans modification.");
      // Generates a token but SENDS NO EMAIL. For magiclink, Supabase can create the
      // synthetic user. No password or real deliverable address is involved.
      const link = checked(await clients.admin.auth.admin.generateLink({ type: "magiclink", email,
        options: { data: { livredor_seed: marker, display_name: actor.displayName } } }), "Session synthétique");
      if (!link.user || !link.properties?.hashed_token || link.user.email !== email) throw new SeedError("Identité synthétique invalide.");
      const db = clients.anon();
      const session = checked(await db.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" }), "Validation de la session synthétique");
      if (!session.session || session.user?.id !== link.user.id) throw new SeedError("Session synthétique incohérente.");
      return { id: link.user.id, db, token: session.session.access_token };
    },
    async join(author, projectId, slug) {
      if (!/^[a-f0-9]{64}$/.test(invitationToken ?? "")) throw new SeedError("Lien d’invitation partagé absent.");
      const accepted = checked(await author.db.rpc("accept_shared_project_invitation", { p_slug: slug, p_token: invitationToken }), "Adhésion du contributeur");
      if (!accepted) throw new SeedError("Invitation du contributeur refusée.");
    },
    async insertOnly(author, table, row) {
      const previous = checked(await author.db.from(table).select("*").eq("id", row.id).maybeSingle(), "Lecture du contenu de test");
      if (previous) {
        const textKey = table === "memories" ? "body" : "message";
        if (previous.project_id !== row.project_id || previous.author_id !== author.id || !previous[textKey]?.startsWith("[TEST SYNTHÉTIQUE")) throw new SeedError("Collision avec un contenu non synthétique ; arrêt.");
        return; // Deliberately preserves edits and visibility selected during testing.
      }
      checked(await author.db.from(table).insert(row).select("id").single(), "Insertion du contenu de test");
    },
    async upload(author, projectId, memoryId, asset) {
      const rows = checked(await author.db.from("media_assets").select("*").eq("project_id", projectId).eq("memory_id", memoryId)
        .eq("owner_id", author.id).eq("original_filename", asset.name), "Lecture du média synthétique");
      // A hidden/deleted media slot is intentionally not resurrected on rerun.
      if (rows.some((m) => m.status === "published" || (m.status === "hidden" && !journal.retired.has(m.id)))) return;
      // Only incomplete reservations owned by this synthetic author, on this
      // deterministic synthetic memory, can be discarded when resuming.
      for (const row of rows.filter((m) => m.status === "draft")) {
        // Persist intent before deletion: a crash between DELETE and new presign
        // must not confuse this retired reservation with deliberate moderation.
        await journal.retire(row.id);
        journal.retired.add(row.id);
        await call(`/api/media/${row.id}`, author.token, "DELETE");
      }
      const prepared = await call("/api/media/presign", author.token, "POST", {
        projectId, memoryId, filename: asset.name, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes,
      });
      const putUrl = new URL(prepared.uploadUrl);
      if (putUrl.protocol !== "https:" || !putUrl.hostname.endsWith(".r2.cloudflarestorage.com") || putUrl.username || putUrl.password) throw new SeedError("Destination R2 signée invalide.");
      const response = await fetcher(putUrl, { method: "PUT", redirect: "error", signal: AbortSignal.timeout(120000),
        headers: { "Content-Type": asset.mimeType }, body: await readFile(asset.path) });
      if (!response.ok) throw new SeedError(`Upload synthétique refusé (HTTP ${response.status}).`);
      await call(`/api/media/${prepared.mediaId}`, author.token, "POST");
    },
  };
}
