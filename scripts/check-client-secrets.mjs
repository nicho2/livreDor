import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const names = ["SUPABASE_SERVICE_ROLE_KEY", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "DATABASE_URL", "LIVREDOR_SITE_MANAGERS"];
const values = names.flatMap(name => {
  const value = process.env[name];
  if (!value) return [];
  return name === "LIVREDOR_SITE_MANAGERS" ? [value, ...value.split(",").map(email => email.trim()).filter(Boolean)] : [value];
}).filter(value => value.length > 8);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.R2_SECRET_ACCESS_KEY) throw new Error("Load server environment before scanning");
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const files = walk("dist/client");
for (const file of files) {
  const bytes = readFileSync(file);
  if (values.some(value => bytes.includes(Buffer.from(value)))) throw new Error("Server value found in a browser asset");
}
console.log(`PASS: ${files.length} browser assets checked; no server credentials or manager emails.`);
