// server/migrate-alfabetizacion.mjs
// One-off: convierte el temario quemado de src/data/alfabetizacion.ts en
// archivos .lesson dentro de content/blocks/<bloque>/lessons/.
//   node server/migrate-alfabetizacion.mjs          -> solo informa (no escribe)
//   node server/migrate-alfabetizacion.mjs --write  -> escribe archivos y order.json
// Respeta lessons ya existentes (por título) y conserva en el orden
// los archivos que no corresponden a ningún subtema (ej. pruebas).

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOQUES_ALFABETIZACION } from "../src/data/alfabetizacion.ts";

const WRITE = process.argv.includes("--write");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BLOCKS = path.resolve(HERE, "..", "content", "blocks");

const slug = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const normTitle = (s) => String(s ?? "").trim().toLowerCase();

/** Valor seguro para frontmatter (cita si contiene ": " o bordes raros). */
const yamlVal = (s) => {
  const v = String(s ?? "");
  return /:\s|\n|^['"\s]|[\s]$/.test(v) ? JSON.stringify(v) : v;
};

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseTitle(source, fallback) {
  const lines = String(source ?? "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return fallback;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") break;
    const m = lines[i].match(/^title\s*:\s*(.*)$/);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return v;
    }
  }
  return fallback;
}

async function existingLessons(blockId) {
  const dir = path.join(BLOCKS, blockId, "lessons");
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".lesson"));
  } catch {
    return [];
  }
  const out = [];
  for (const f of files) {
    const id = f.replace(/\.lesson$/, "");
    const source = await fs.readFile(path.join(dir, f), "utf8").catch(() => "");
    out.push({ id, title: parseTitle(source, id) });
  }
  return out;
}

function lessonSource(sub, fileSlug) {
  const b = fileSlug;
  const lines = [
    "---",
    `title: ${yamlVal(sub.titulo)}`,
    `description: ${yamlVal(sub.descripcion)}`,
    "---",
    "",
    `# ${sub.titulo} {#${b}-titulo}`,
    "",
    `${sub.descripcion} {#${b}-intro}`,
    "",
    `## Temáticas {#${b}-temas}`,
    "",
    ...sub.tematicas.map((t) => `- ${t}`),
    "",
  ];
  if (sub.actividad) {
    lines.push(`> Actividad: ${sub.actividad} {#${b}-actividad}`, "");
  }
  if (sub.referentes && sub.referentes.length > 0) {
    lines.push(`## Referentes {#${b}-referentes}`, "", ...sub.referentes.map((r) => `- ${r}`), "");
  }
  if (sub.alcance) {
    lines.push(`## Alcance {#${b}-alcance}`, "", `${sub.alcance} {#${b}-alcance-t}`, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

let totalNew = 0;
let totalSkip = 0;

for (const bloque of BLOQUES_ALFABETIZACION) {
  const blockId = bloque.id;
  const blockDir = path.join(BLOCKS, blockId);
  const lessonsDir = path.join(blockDir, "lessons");

  if (!(await exists(blockDir))) {
    console.log(`[x] falta carpeta ${blockId} (no existe)`);
    continue;
  }

  const existing = await existingLessons(blockId);
  const byTitle = new Map(existing.map((e) => [normTitle(e.title), e.id]));
  const mapped = new Set();
  const order = [];

  for (const sub of bloque.subtemas) {
    const known = byTitle.get(normTitle(sub.titulo));
    if (known) {
      order.push(known);
      mapped.add(known);
      totalSkip += 1;
      console.log(`[=] ${blockId}/${known}  (ya existe: "${sub.titulo}")`);
      continue;
    }
    const fileSlug = `${sub.codigo.replace(/\./g, "-")}-${slug(sub.titulo)}`;
    const file = path.join(lessonsDir, `${fileSlug}.lesson`);
    const source = lessonSource(sub, fileSlug);
    order.push(fileSlug);
    totalNew += 1;
    console.log(`[+] ${blockId}/${fileSlug}  ("${sub.titulo}", ${sub.tematicas.length} temáticas)`);
    if (WRITE) {
      await fs.mkdir(lessonsDir, { recursive: true });
      await fs.writeFile(file, source, "utf8");
    }
  }

  // Archivos que no son ningún subtema (pruebas, etc.) se conservan al final.
  for (const e of existing) {
    if (!mapped.has(e.id) && !order.includes(e.id)) order.push(e.id);
  }

  const orderPath = path.join(blockDir, "order.json");
  const current = await fs.readFile(orderPath, "utf8").catch(() => null);
  const next = JSON.stringify(order, null, 2) + "\n";
  if (current !== next) {
    console.log(`[o] ${blockId}/order.json: ${order.length} lessons`);
    if (WRITE) await fs.writeFile(orderPath, next, "utf8");
  }

  // Asegura short en block.json sin tocar lo demás.
  const blockPath = path.join(blockDir, "block.json");
  const bj = JSON.parse(await fs.readFile(blockPath, "utf8").catch(() => "{}"));
  if (!bj.short && bloque.tituloCorto) {
    console.log(`[s] ${blockId}/block.json: short="${bloque.tituloCorto}"`);
    if (WRITE) {
      bj.short = bloque.tituloCorto;
      await fs.writeFile(blockPath, JSON.stringify(bj, null, 2) + "\n", "utf8");
    }
  }
}

console.log(WRITE ? `listo: ${totalNew} nuevas, ${totalSkip} existentes.` : `informe: ${totalNew} nuevas, ${totalSkip} existentes. Usa --write para aplicar.`);
