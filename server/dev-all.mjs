// server/dev-all.mjs
// Abre a la vez el frontend (astro dev) y el backend de contenido (dev-only).
// Sin dependencias; sirve con npm, pnpm o yarn:
//   npm run dev:all   |   pnpm dev:all
// Argumentos extra se pasan al frontend (ej. `npm run dev:all -- --port 4321`).

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

/** Resuelve el CLI de Astro desde su package.json (válido con npm y pnpm). */
function resolveAstroCli() {
  const pkgPath = path.join(ROOT, "node_modules", "astro", "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.astro;
    if (!bin) return null;
    const cli = path.resolve(ROOT, "node_modules", "astro", bin);
    return existsSync(cli) ? cli : null;
  } catch {
    return null;
  }
}

const ASTRO_CLI = resolveAstroCli();

if (!ASTRO_CLI) {
  console.error("[dev:all] No encuentro Astro. Ejecuta primero `npm install` (o `pnpm install`).");
  process.exit(1);
}

const children = new Set();
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill();
    } catch {}
  }
  setTimeout(() => process.exit(code), 300).unref();
}

function run(name, args) {
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
  children.add(child);
  child.on("exit", (code) => {
    children.delete(child);
    if (shuttingDown) return;
    if (code !== 0 && code !== null) {
      console.error(`[dev:all] "${name}" terminó con código ${code}. Cerrando todo…`);
      shutdown(1);
    } else if (children.size === 0) {
      shutdown(0);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("[dev:all] frontend (astro dev) + contenido (server/content-server.mjs)");
run("contenido", [path.join(HERE, "content-server.mjs")]);
run("frontend", [ASTRO_CLI, "dev", ...process.argv.slice(2)]);
