import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = specifier.startsWith("@/") ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url) :
      specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) ? new URL(`${specifier}.ts`, context.parentURL) : null;
    if (url && existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
    return nextResolve(specifier, context);
  },
});
