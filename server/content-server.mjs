// server/content-server.mjs
// Backend DEV-ONLY para gestionar el contenido (bloques + lessons).
// NO se despliega: GitHub Pages / Vercel estático sirven el build con el
// contenido ya congelado. En local corre con:  npm run content:server
// Escucha solo en 127.0.0.1. Sin dependencias (solo node:http + node:fs).

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "content", "blocks");
const PORT = Number(process.env.CONTENT_PORT ?? 8787);
const HOST = "127.0.0.1";
const BODY_LIMIT = 2 * 1024 * 1024; // 2 MB
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// --- FS helpers ---

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(p, value) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/** Ruta del bloque, o null si el id es inválido (anti path-traversal). */
function blockDir(id) {
  if (!SLUG_RE.test(id)) return null;
  const dir = path.resolve(ROOT, id);
  if (path.relative(ROOT, dir).startsWith("..") || path.relative(ROOT, dir) === "") {
    // relative === "" solo si dir === ROOT (id vacío, ya rechazado por SLUG_RE)
    if (dir !== ROOT) return null;
  }
  return dir;
}

function lessonFile(blockId, lessonId) {
  const dir = blockDir(blockId);
  if (!dir || !SLUG_RE.test(lessonId)) return null;
  const file = path.resolve(dir, "lessons", `${lessonId}.lesson`);
  if (path.dirname(file) !== path.resolve(dir, "lessons")) return null;
  return file;
}

/** Frontmatter mínimo (title/code/description) para listados. */
function parseMeta(source, fallbackId) {
  const meta = { id: fallbackId, title: fallbackId };
  const lines = String(source ?? "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return meta;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") break;
    const sep = lines[i].indexOf(":");
    if (sep === -1) continue;
    const key = lines[i].slice(0, sep).trim();
    let value = lines[i].slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (["id", "title", "code", "description"].includes(key) && value) meta[key] = value;
  }
  return meta;
}

async function listLessonFiles(blockId) {
  const dir = blockDir(blockId);
  const lessonsDir = path.join(dir, "lessons");
  let files = [];
  try {
    files = (await fs.readdir(lessonsDir)).filter((f) => f.endsWith(".lesson"));
  } catch {
    return [];
  }
  const out = [];
  for (const f of files) {
    const id = f.replace(/\.lesson$/, "");
    const source = await fs.readFile(path.join(lessonsDir, f), "utf8").catch(() => "");
    out.push({ id, ...parseMeta(source, id) });
  }
  return out;
}

async function readBlocksOrder() {
  const ids = await readJson(path.join(ROOT, "order.json"), null);
  return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : null;
}

async function listBlockIds() {
  try {
    const entries = await fs.readdir(ROOT, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).filter((n) => SLUG_RE.test(n));
  } catch {
    return [];
  }
}

async function getBlock(id) {
  const dir = blockDir(id);
  if (!dir || !(await exists(dir))) return null;
  const json = await readJson(path.join(dir, "block.json"), {});
  const files = await listLessonFiles(id);
  const byId = new Map(files.map((f) => [f.id, f]));
  const order = await readJson(path.join(dir, "order.json"), null);
  const ordered = [];
  if (Array.isArray(order)) {
    for (const lid of order) {
      const f = byId.get(lid);
      if (f) {
        ordered.push(f);
        byId.delete(lid);
      }
    }
  }
  for (const f of [...byId.values()].sort((a, b) =>
    (a.code ?? a.id).localeCompare(b.code ?? b.id, "es", { numeric: true }),
  )) {
    ordered.push(f);
  }
  return {
    id,
    title: typeof json.title === "string" && json.title ? json.title : id,
    short: typeof json.short === "string" ? json.short : "",
    description: typeof json.description === "string" ? json.description : "",
    icon: typeof json.icon === "string" ? json.icon : "📄",
    color: typeof json.color === "string" ? json.color : "indigo",
    lessons: ordered.map(({ id: lid, title, code }) => ({ id: lid, title, code })),
  };
}

async function getBlocks() {
  const ids = await listBlockIds();
  const manifest = await readBlocksOrder();
  const blocks = [];
  for (const id of ids) {
    const b = await getBlock(id);
    if (b) blocks.push(b);
  }
  if (!manifest) {
    const sorted = blocks.sort((a, b) => a.id.localeCompare(b.id));
    assignCodes(sorted);
    return sorted;
  }
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const out = [];
  for (const id of manifest) {
    const b = byId.get(id);
    if (b) {
      out.push(b);
      byId.delete(id);
    }
  }
  for (const b of [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))) out.push(b);
  // Código posicional automático: <nº bloque>.<posición en el bloque>.
  assignCodes(out);
  return out;
}

function assignCodes(blocks) {
  blocks.forEach((b, bi) => {
    b.lessons.forEach((l, li) => {
      l.code = `${bi + 1}.${li + 1}`;
    });
  });
}

function lessonTemplate(id, title) {
  const t = title || id;
  return `---\ntitle: ${t}\n---\n\n# ${t} {#titulo}\n\nPárrafo inicial… {#intro}\n`;
}

// --- Imágenes: content/blocks/<bloque>/images/<lesson>/<archivo> ---
// La carpeta se crea sola al subir la primera imagen de cada lesson.

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);
const IMAGE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB ya decodificados

function lessonImagesDir(blockId, lessonId) {
  const dir = blockDir(blockId);
  if (!dir || !SLUG_RE.test(lessonId)) return null;
  return path.resolve(dir, "images", lessonId);
}

function sanitizeImageName(name) {
  const base = path
    .basename(String(name ?? ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_.]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 80);
  const ext = path.extname(base);
  if (!base || !IMAGE_EXTS.has(ext)) return null;
  return base;
}

async function uniqueImageName(dir, name) {
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  let candidate = name;
  let n = 1;
  while (await exists(path.join(dir, candidate))) {
    n += 1;
    candidate = `${stem}-${n}${ext}`;
  }
  return candidate;
}

// --- HTTP helpers ---

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function withCors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > BODY_LIMIT) {
        reject(new Error("Cuerpo demasiado grande (límite 2 MB)."));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJsonBody(req, res) {
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    send(res, 400, { error: "JSON inválido." });
    return null;
  }
}

// --- Router ---

async function handler(req, res) {
  withCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url ?? "/", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    // GET /api/health
    if (req.method === "GET" && parts.join("/") === "api/health") {
      const blocks = await getBlocks();
      send(res, 200, {
        ok: true,
        blocks: blocks.length,
        lessons: blocks.reduce((n, b) => n + b.lessons.length, 0),
      });
      return;
    }

    // GET /api/blocks
    if (req.method === "GET" && parts.join("/") === "api/blocks") {
      send(res, 200, { blocks: await getBlocks() });
      return;
    }

    // POST /api/blocks  { id?, title, description?, icon?, color? }
    if (req.method === "POST" && parts.join("/") === "api/blocks") {
      const body = await readJsonBody(req, res);
      if (body === null) return;
      const id = body.id ? String(body.id) : slugify(body.title);
      if (!id || !SLUG_RE.test(id)) {
        send(res, 400, { error: "Id inválido. Usa minúsculas, números y guiones (ej. mi-bloque)." });
        return;
      }
      if (!body.title || !String(body.title).trim()) {
        send(res, 400, { error: "El título es obligatorio." });
        return;
      }
      const dir = blockDir(id);
      if (await exists(dir)) {
        send(res, 409, { error: `El bloque "${id}" ya existe.` });
        return;
      }
      await fs.mkdir(path.join(dir, "lessons"), { recursive: true });
      await writeJson(path.join(dir, "block.json"), {
        title: String(body.title).trim(),
        description: String(body.description ?? "").trim(),
        icon: String(body.icon ?? "📄"),
        color: String(body.color ?? "indigo"),
      });
      const order = (await readBlocksOrder()) ?? (await listBlockIds());
      if (!order.includes(id)) order.push(id);
      await writeJson(path.join(ROOT, "order.json"), order);
      send(res, 201, { block: await getBlock(id) });
      return;
    }

    // PUT /api/blocks-order  { ids: [...] }
    if (req.method === "PUT" && parts.join("/") === "api/blocks-order") {
      const body = await readJsonBody(req, res);
      if (body === null) return;
      const ids = body.ids;
      const existing = new Set(await listBlockIds());
      if (
        !Array.isArray(ids) ||
        ids.length !== existing.size ||
        !ids.every((x) => typeof x === "string" && existing.has(x))
      ) {
        send(res, 400, { error: "El orden debe contener exactamente los bloques existentes." });
        return;
      }
      await writeJson(path.join(ROOT, "order.json"), ids);
      send(res, 200, { ok: true });
      return;
    }

    // /api/blocks/:id ...
    if (parts[0] === "api" && parts[1] === "blocks" && parts[2]) {
      const blockId = parts[2];
      const dir = blockDir(blockId);
      if (!dir || !(await exists(dir))) {
        send(res, 404, { error: `Bloque "${parts[2]}" no encontrado.` });
        return;
      }

      // PATCH /api/blocks/:id
      if (req.method === "PATCH" && parts.length === 3) {
        const body = await readJsonBody(req, res);
        if (body === null) return;
        const current = await readJson(path.join(dir, "block.json"), {});
        const next = { ...current };
        for (const k of ["title", "short", "description", "icon", "color"]) {
          if (body[k] !== undefined) next[k] = String(body[k]);
        }
        if (!String(next.title ?? "").trim()) {
          send(res, 400, { error: "El título no puede quedar vacío." });
          return;
        }
        await writeJson(path.join(dir, "block.json"), next);
        send(res, 200, { block: await getBlock(blockId) });
        return;
      }

      // DELETE /api/blocks/:id
      if (req.method === "DELETE" && parts.length === 3) {
        await fs.rm(dir, { recursive: true, force: true });
        const order = ((await readBlocksOrder()) ?? []).filter((x) => x !== blockId);
        await writeJson(path.join(ROOT, "order.json"), order);
        send(res, 200, { ok: true });
        return;
      }

      // POST /api/blocks/:id/lessons  { id?, title?, source? }
      if (req.method === "POST" && parts.length === 4 && parts[3] === "lessons") {
        const body = await readJsonBody(req, res);
        if (body === null) return;
        const id = body.id ? String(body.id) : slugify(body.title);
        if (!id || !SLUG_RE.test(id)) {
          send(res, 400, { error: "Id de lección inválido." });
          return;
        }
        const file = lessonFile(blockId, id);
        if (await exists(file)) {
          send(res, 409, { error: `La lección "${id}" ya existe en este bloque.` });
          return;
        }
        const source = typeof body.source === "string" ? body.source : lessonTemplate(id, body.title);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, source.endsWith("\n") ? source : source + "\n", "utf8");
        const order = (await readJson(path.join(dir, "order.json"), null)) ?? (await listLessonFiles(blockId)).map((f) => f.id);
        if (!order.includes(id)) order.push(id);
        await writeJson(path.join(dir, "order.json"), order);
        send(res, 201, { id });
        return;
      }

      // PUT /api/blocks/:id/lessons-order  { ids: [...] }
      if (req.method === "PUT" && parts.length === 4 && parts[3] === "lessons-order") {
        const body = await readJsonBody(req, res);
        if (body === null) return;
        const existing = new Set((await listLessonFiles(blockId)).map((f) => f.id));
        if (!Array.isArray(body.ids) || !body.ids.every((x) => typeof x === "string" && existing.has(x))) {
          send(res, 400, { error: "El orden contiene lecciones inexistentes." });
          return;
        }
        await writeJson(path.join(dir, "order.json"), body.ids);
        send(res, 200, { ok: true });
        return;
      }

      // /api/blocks/:id/lessons/:lessonId
      if (parts.length === 5 && parts[3] === "lessons") {
        const lessonId = parts[4];
        const file = lessonFile(blockId, lessonId);
        if (!file) {
          send(res, 400, { error: "Id de lección inválido." });
          return;
        }
        // GET fuente
        if (req.method === "GET") {
          if (!(await exists(file))) {
            send(res, 404, { error: "Lección no encontrada." });
            return;
          }
          send(res, 200, { id: lessonId, source: await fs.readFile(file, "utf8") });
          return;
        }
        // PUT fuente  { source }
        if (req.method === "PUT") {
          const body = await readJsonBody(req, res);
          if (body === null) return;
          if (typeof body.source !== "string") {
            send(res, 400, { error: "Falta `source` (texto .lesson)." });
            return;
          }
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, body.source.endsWith("\n") ? body.source : body.source + "\n", "utf8");
          send(res, 200, { ok: true });
          return;
        }
        // DELETE lesson (también su carpeta de imágenes)
        if (req.method === "DELETE") {
          if (!(await exists(file))) {
            send(res, 404, { error: "Lección no encontrada." });
            return;
          }
          await fs.unlink(file);
          const imgDir = lessonImagesDir(blockId, lessonId);
          if (imgDir) await fs.rm(imgDir, { recursive: true, force: true });
          const order = ((await readJson(path.join(dir, "order.json"), null)) ?? []).filter((x) => x !== lessonId);
          await writeJson(path.join(dir, "order.json"), order);
          send(res, 200, { ok: true });
          return;
        }
      }

      // /api/blocks/:id/lessons/:lessonId/images  (GET lista, POST subir)
      if (parts.length === 6 && parts[3] === "lessons" && parts[5] === "images") {
        const lessonId = parts[4];
        const imgDir = lessonImagesDir(blockId, lessonId);
        if (!imgDir) {
          send(res, 400, { error: "Id de lección inválido." });
          return;
        }
        if (req.method === "GET") {
          let files = [];
          try {
            files = (await fs.readdir(imgDir)).filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()));
          } catch {}
          send(res, 200, { images: files.sort().map((f) => ({ file: f, src: `images/${f}` })) });
          return;
        }
        if (req.method === "POST") {
          const body = await readJsonBody(req, res);
          if (body === null) return;
          if (typeof body.data !== "string" || !body.data) {
            send(res, 400, { error: "Falta `data` (imagen en base64)." });
            return;
          }
          const clean = sanitizeImageName(body.filename);
          if (!clean) {
            send(res, 400, { error: "Nombre o tipo no válido. Usa png, jpg, webp, gif, svg o avif." });
            return;
          }
          let buf;
          try {
            buf = Buffer.from(body.data, "base64");
          } catch {
            send(res, 400, { error: "Base64 inválido." });
            return;
          }
          if (buf.length === 0 || buf.length > IMAGE_MAX_BYTES) {
            send(res, 400, { error: "La imagen debe pesar entre 1 byte y 8 MB." });
            return;
          }
          await fs.mkdir(imgDir, { recursive: true });
          const file = await uniqueImageName(imgDir, clean);
          await fs.writeFile(path.join(imgDir, file), buf);
          send(res, 201, { file, src: `images/${file}` });
          return;
        }
      }
    }

    // POST /api/lessons/move  { lessonId, from, to }
    if (req.method === "POST" && parts.join("/") === "api/lessons/move") {
      const body = await readJsonBody(req, res);
      if (body === null) return;
      const { lessonId, from, to } = body;
      if (!SLUG_RE.test(String(lessonId ?? "")) || !SLUG_RE.test(String(from ?? "")) || !SLUG_RE.test(String(to ?? ""))) {
        send(res, 400, { error: "Ids inválidos." });
        return;
      }
      if (from === to) {
        send(res, 200, { ok: true });
        return;
      }
      const src = lessonFile(from, lessonId);
      const dest = lessonFile(to, lessonId);
      if (!(await exists(src))) {
        send(res, 404, { error: "Lección no encontrada en el bloque origen." });
        return;
      }
      if (await exists(dest)) {
        send(res, 409, { error: "Ya existe una lección con ese id en el bloque destino." });
        return;
      }
      const toDir = blockDir(to);
      if (!(await exists(toDir))) {
        send(res, 404, { error: "Bloque destino no encontrado." });
        return;
      }
      const source = await fs.readFile(src, "utf8");
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, source, "utf8");
      await fs.unlink(src);
      // La carpeta de imágenes viaja con la lesson.
      const srcImg = lessonImagesDir(from, lessonId);
      const destImg = lessonImagesDir(to, lessonId);
      if (srcImg && destImg && (await exists(srcImg))) {
        await fs.mkdir(path.dirname(destImg), { recursive: true });
        await fs.rename(srcImg, destImg);
      }
      const fromDir = blockDir(from);
      const fromOrder = ((await readJson(path.join(fromDir, "order.json"), null)) ?? []).filter((x) => x !== lessonId);
      await writeJson(path.join(fromDir, "order.json"), fromOrder);
      const toOrder = (await readJson(path.join(toDir, "order.json"), null)) ?? (await listLessonFiles(to)).map((f) => f.id);
      if (!toOrder.includes(lessonId)) toOrder.push(lessonId);
      await writeJson(path.join(toDir, "order.json"), toOrder);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 404, { error: "Ruta no encontrada." });
  } catch (err) {
    console.error(err);
    try {
      send(res, 500, { error: "Error interno del servidor de contenido." });
    } catch {}
  }
}

await fs.mkdir(ROOT, { recursive: true });
const server = http.createServer(handler);
server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(`[content-server] El puerto ${PORT} ya está en uso (¿otra instancia corriendo?).`);
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, HOST, () => {
  console.log(`[content-server] DEV-ONLY en http://${HOST}:${PORT} (carpeta: ${ROOT})`);
});
