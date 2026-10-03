import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--config", "vite.sites.config.mts"], { stdio: "inherit", windowsHide: true });
if (result.error || result.status !== 0) process.exit(result.status || 1);
// Sites' portable archive contract expects index.js; Vite emits index.mjs.
copyFileSync("dist/server/index.mjs", "dist/server/index.js");
const config = JSON.parse(readFileSync("dist/server/wrangler.json", "utf8"));
config.main = "index.js";
writeFileSync("dist/server/wrangler.json", JSON.stringify(config));
// Vinext generates compatibility types under .next. Restore Next's own route
// declarations so the dedicated build doesn't break the local typecheck.
const types = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "typegen"], { stdio: "inherit", windowsHide: true });
if (types.error || types.status !== 0) process.exit(types.status || 1);
