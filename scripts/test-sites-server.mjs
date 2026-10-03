// Disposable local Workers runtime. Credentials stay in the inherited
// environment/bindings, never command arguments or generated configuration.
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local test port");
const keys = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "LIVREDOR_MAX_PROJECTS", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
const root = resolve("dist/server");
// Register emitted chunks explicitly: Vinext uses computed dynamic imports.
const chunks = readdirSync(root, { recursive: true }).filter(f => /\.(mjs|js)$/.test(f) && !["index.js", "index.mjs"].includes(f));
const runtime = new Miniflare(convertV4MiniflareOptions({
  host: "127.0.0.1", port,
  workers: [{ name: "livredor-local-test",
  compatibilityDate: "2026-05-15", compatibilityFlags: ["nodejs_compat"],
  modulesRoot: root,
  modules: ["index.js", ...chunks].map(f => ({ type: "ESModule", path: resolve(root, f) })),
  bindings: Object.fromEntries(keys.filter(k => process.env[k]).map(k => [k, process.env[k]])),
  assets: { directory: resolve("dist/client"), binding: "ASSETS", routerConfig: { has_user_worker: true, invoke_user_worker_ahead_of_assets: true } },
  }],
}));
await runtime.ready;
console.log("Local Sites test runtime ready");
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, async () => { await runtime.dispose(); process.exit(0); });
