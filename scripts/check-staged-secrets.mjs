// Check staged Git blobs without printing credentials or their values.
import { execFileSync } from "node:child_process";
const files = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], { encoding: "utf8", windowsHide: true }).trim().split(/\r?\n/).filter(Boolean);
const names = ["SUPABASE_SERVICE_ROLE_KEY", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "RESEND_API_KEY", "DATABASE_URL"];
const secrets = names.map(name => [name, process.env[name]]).filter(([, value]) => value && value.length >= 12);
if (process.env.DATABASE_URL) {
  const password = decodeURIComponent(new URL(process.env.DATABASE_URL).password);
  if (password.length >= 12) secrets.push(["DATABASE_PASSWORD", password]);
}
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && file !== ".env.example") throw new Error(`Private environment file staged: ${file}`);
  const content = execFileSync("git", ["show", `:${file}`], { encoding: "utf8", windowsHide: true });
  for (const [name, value] of secrets) {
    if (content.includes(value)) throw new Error(`Environment credential ${name} detected in staged file ${file}`);
  }
}
console.log(`PASS: ${files.length} staged files checked; no configured server credentials.`);
