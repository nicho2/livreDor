// Fail-fast regression gate, portable and without credentials/network data writes.
import { spawnSync } from "node:child_process";
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Lancez ce contrôle avec npm run check.");
for (const step of ["lint", "typecheck", "test", "build"]) {
  console.log(`\nContrôle de non-régression : ${step}`);
  const result = spawnSync(process.execPath, [npm, "run", step], { stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) { console.error(`ÉCHEC : ${step}. Ne pas publier cette version.`); process.exit(result.status || 1); }
}
console.log("PASS : lint, TypeScript, tests unitaires et build.");
