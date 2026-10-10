// src/utils/lesson.ts
// Núcleo del sistema .lesson: tipos + parser + serializer + operaciones de celdas.
// Cada bloque del .lesson es una CELDA con id estable:
//   - En el archivo se declara con sufijo `{#mi-id}` (estilo Markdown attrs).
//   - Si no trae id, se autogenera `c1, c2...` (con prefijo del lesson al parsear).
// Mover celdas = reordenar el array `blocks` y serializar de vuelta con
// `serializeLesson()`. El diseño nunca depende del orden: solo el Renderer pinta.

export interface LessonMeta {
  id: string; // derivado del nombre del archivo si no viene en frontmatter
  title: string;
  code?: string;
  block?: string; // título del bloque (legible)
  blockId?: string; // carpeta del bloque en content/blocks/<blockId>/
  description?: string;
  [key: string]: string | undefined;
}

export type LessonBlock =
  | { id: string; type: "h1"; text: string }
  | { id: string; type: "h2"; text: string }
  | { id: string; type: "h3"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; alt: string; src: string; title?: string }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "list"; items: string[] }
  | { id: string; type: "quiz"; question: string; options: string[]; correct: number; explanation: string }
  | { id: string; type: "divider" };

export interface Lesson {
  meta: LessonMeta;
  blocks: LessonBlock[];
  raw: string;
}

const CELL_ID_RE = /\s*\{#([\w-]+)\}\s*$/;

function extractId(line: string): { text: string; id?: string } {
  const m = line.match(CELL_ID_RE);
  if (!m) return { text: line };
  return { text: line.slice(0, m.index).trimEnd(), id: m[1] };
}

function parseFrontmatter(source: string): { meta: Record<string, string>; body: string } {
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { meta: {}, body: source };
  const meta: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === "---") break;
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    // quita comillas envolventes simples/dobles
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) meta[key] = value;
  }
  const body = lines.slice(i + 1).join("\n");
  return { meta, body };
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/;

export function parseLesson(source: string, fallbackId = "sin-id"): Lesson {
  const { meta: fm, body } = parseFrontmatter(source);
  const blocks: LessonBlock[] = [];
  const lines = body.split(/\r?\n/);

  let counter = 0;
  const nextId = () => `c${++counter}`;
  const used = new Set<string>();
  const takeId = (explicit?: string): string => {
    if (explicit && !used.has(explicit)) {
      used.add(explicit);
      return explicit;
    }
    let id = explicit && used.has(explicit) ? `${explicit}-2` : nextId();
    while (used.has(id)) id = nextId();
    used.add(id);
    return id;
  };

  let paragraph: string[] = [];
  let paragraphId: string | undefined;
  let listItems: string[] = [];
  let listId: string | undefined;

  // Estado del bloque quiz (:::quiz {#id} ... :::)
  // La opción correcta se marca con `- [x]`, las demás con `- `.
  let quizId: string | undefined;
  let quizQuestion: string[] = [];
  let quizOptions: string[] = [];
  let quizCorrect = 0;
  let quizExplanation: string[] = [];

  const flushQuiz = () => {
    if (quizId !== undefined) {
      const options = quizOptions.length > 0 ? [...quizOptions] : ["Opción A", "Opción B"];
      blocks.push({
        id: takeId(quizId),
        type: "quiz",
        question: quizQuestion.join(" ").trim() || "Pregunta sin texto",
        options,
        correct: Math.max(0, Math.min(options.length - 1, quizCorrect)),
        explanation: quizExplanation.join(" ").trim(),
      });
      quizId = undefined;
      quizQuestion = [];
      quizOptions = [];
      quizCorrect = 0;
      quizExplanation = [];
    }
  };

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ id: takeId(paragraphId), type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
      paragraphId = undefined;
    }
  };
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ id: takeId(listId), type: "list", items: [...listItems] });
      listItems = [];
      listId = undefined;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // apertura del bloque quiz: :::quiz {#id}
    {
      const m = line.match(/^:::quiz\s*(?:\{#([\w-]+)\})?\s*$/);
      if (m) {
        flushParagraph();
        flushList();
        quizId = m[1];
        quizQuestion = [];
        quizOptions = [];
        quizCorrect = 0;
        quizExplanation = [];
        continue;
      }
    }
    // dentro del quiz hasta el cierre `:::`
    if (quizId !== undefined) {
      if (line === ":::") {
        flushQuiz();
        continue;
      }
      if (line === "") continue;
      if (line.startsWith("- ") || line.startsWith("* ")) {
        let opt = line.slice(2).trim();
        const cm = opt.match(/^\[x\]\s*(.*)$/i);
        if (cm) {
          quizCorrect = quizOptions.length;
          opt = cm[1].trim();
        } else {
          const em = opt.match(/^\[\s\]\s*(.*)$/);
          if (em) opt = em[1].trim();
        }
        quizOptions.push(opt);
        continue;
      }
      if (line.startsWith("> ")) {
        quizExplanation.push(line.slice(2).trim());
        continue;
      }
      quizQuestion.push(line);
      continue;
    }

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }
    // divisor, con id opcional: --- {#id}
    if (line === "---" || line.startsWith("--- {#")) {
      flushParagraph();
      flushList();
      const { id } = extractId(line.replace(/^---/, "").trim() ? line.slice(3).trim() : "");
      blocks.push({ id: takeId(id), type: "divider" });
      continue;
    }
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      flushParagraph();
      flushList();
      const level = line.startsWith("### ") ? 3 : line.startsWith("## ") ? 2 : 1;
      const raw = line.slice(level + 1).trim();
      const { text, id } = extractId(raw);
      const cellId = takeId(id);
      if (level === 3) blocks.push({ id: cellId, type: "h3", text });
      else if (level === 2) blocks.push({ id: cellId, type: "h2", text });
      else blocks.push({ id: cellId, type: "h1", text });
      continue;
    }
    // imagen (con {#id} final opcional)
    {
      const { text: withoutId, id } = extractId(line);
      const img = withoutId.match(IMAGE_RE);
      if (img) {
        flushParagraph();
        flushList();
        blocks.push({ id: takeId(id), type: "image", alt: img[1] ?? "", src: img[2] ?? "", title: img[3] });
        continue;
      }
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      const { text, id } = extractId(line.slice(2).trim());
      blocks.push({ id: takeId(id), type: "quote", text });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      const { text, id } = extractId(line.slice(2).trim());
      // El id de la primera línea con {#id} nombra a toda la lista (celda).
      if (id && !listId) listId = id;
      listItems.push(text);
      continue;
    }
    // texto normal: se acumula hasta línea en blanco (como Markdown).
    // Un párrafo puede llevar {#id} al final de su última línea.
    flushList();
    const { text, id } = extractId(rawLine.trim());
    if (id) paragraphId = paragraphId ?? id;
    paragraph.push(text);
  }
  flushParagraph();
  flushList();
  flushQuiz();

  const meta: LessonMeta = {
    id: fm.id ?? fallbackId,
    title: fm.title ?? fallbackId,
    code: fm.code,
    block: fm.block,
    description: fm.description,
    ...fm,
  };
  meta.id = meta.id || fallbackId;
  meta.title = meta.title || fallbackId;

  return { meta, blocks, raw: source };
}

// --- Serialización: Lesson -> fuente .lesson (para guardar el nuevo orden) ---

function fmValue(value: string): string {
  if (value.includes("\n") || /^\s|\s$/.test(value) || value.includes(": ")) return JSON.stringify(value);
  return value;
}

export function serializeLesson(lesson: Lesson): string {
  const { meta, blocks } = lesson;
  const fmLines: string[] = ["---"];
  if (meta.title) fmLines.push(`title: ${fmValue(meta.title)}`);
  if (meta.code) fmLines.push(`code: ${fmValue(meta.code)}`);
  if (meta.block) fmLines.push(`block: ${fmValue(meta.block)}`);
  if (meta.description) fmLines.push(`description: ${fmValue(meta.description)}`);
  for (const [k, v] of Object.entries(meta)) {
    if (["id", "title", "code", "block", "blockId", "description"].includes(k)) continue;
    if (v == null) continue;
    fmLines.push(`${k}: ${fmValue(v)}`);
  }
  fmLines.push("---", "");

  const body: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "h1":
        body.push(`# ${b.text} {#${b.id}}`, "");
        break;
      case "h2":
        body.push(`## ${b.text} {#${b.id}}`, "");
        break;
      case "h3":
        body.push(`### ${b.text} {#${b.id}}`, "");
        break;
      case "paragraph":
        body.push(`${b.text} {#${b.id}}`, "");
        break;
      case "quote":
        body.push(`> ${b.text} {#${b.id}}`, "");
        break;
      case "image": {
        const title = b.title ? ` "${b.title}"` : "";
        body.push(`![${b.alt}](${b.src}${title}) {#${b.id}}`, "");
        break;
      }
      case "list":
        b.items.forEach((it, idx) => {
          body.push(idx === 0 ? `- ${it} {#${b.id}}` : `- ${it}`);
        });
        body.push("");
        break;
      case "quiz":
        body.push(`:::quiz {#${b.id}}`);
        body.push(b.question);
        b.options.forEach((opt, idx) => {
          body.push(idx === b.correct ? `- [x] ${opt}` : `- ${opt}`);
        });
        if (b.explanation) body.push(`> ${b.explanation}`);
        body.push(":::", "");
        break;
      case "divider":
        body.push(`--- {#${b.id}}`, "");
        break;
    }
  }
  return [...fmLines, ...body].join("\n").trimEnd() + "\n";
}

// --- Operaciones de celdas (puras, sin diseño) ---

export function moveCell(blocks: LessonBlock[], from: number, to: number): LessonBlock[] {
  if (from < 0 || from >= blocks.length) return blocks;
  const target = Math.max(0, Math.min(blocks.length - 1, to));
  if (from === target) return blocks;
  const next = [...blocks];
  const [cell] = next.splice(from, 1);
  next.splice(target, 0, cell);
  return next;
}

let newCellCounter = 0;

/** Formato editable del quiz (una opción por línea, `- [x]` marca la correcta):
 *  pregunta en la primera línea, luego opciones y `> explicación` opcional. */
export function parseQuizText(text: string): { question: string; options: string[]; correct: number; explanation: string } {
  const question: string[] = [];
  const options: string[] = [];
  let correct = 0;
  const explanation: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("- ") || line.startsWith("* ")) {
      let opt = line.slice(2).trim();
      const cm = opt.match(/^\[x\]\s*(.*)$/i);
      if (cm) {
        correct = options.length;
        opt = cm[1].trim();
      } else {
        const em = opt.match(/^\[\s\]\s*(.*)$/);
        if (em) opt = em[1].trim();
      }
      options.push(opt);
    } else if (line.startsWith("> ")) {
      explanation.push(line.slice(2).trim());
    } else {
      question.push(line);
    }
  }
  return {
    question: question.join(" ").trim() || "Nueva pregunta",
    options: options.length > 0 ? options : ["Opción A", "Opción B"],
    correct: Math.max(0, Math.min((options.length > 0 ? options.length : 2) - 1, correct)),
    explanation: explanation.join(" ").trim(),
  };
}

export function quizToEditable(question: string, options: string[], correct: number, explanation: string): string {
  const out = [question];
  options.forEach((opt, idx) => out.push(idx === correct ? `- [x] ${opt}` : `- ${opt}`));
  if (explanation) out.push(`> ${explanation}`);
  return out.join("\n");
}

export function createCell(type: LessonBlock["type"], text = ""): LessonBlock {
  newCellCounter += 1;
  const id = `nueva-${Date.now().toString(36)}-${newCellCounter}`;
  switch (type) {
    case "quiz": {
      const q = parseQuizText(text || "Nueva pregunta\n- [x] Opción A\n- Opción B");
      return { id, type: "quiz", ...q };
    }
    case "h1":
      return { id, type: "h1", text: text || "Nuevo título" };
    case "h2":
      return { id, type: "h2", text: text || "Nuevo subtítulo" };
    case "h3":
      return { id, type: "h3", text: text || "Nuevo apartado" };
    case "quote":
      return { id, type: "quote", text: text || "Nueva cita" };
    case "image":
      return { id, type: "image", alt: text || "Descripción de la imagen", src: "/lessons/mi-imagen.png" };
    case "list":
      return { id, type: "list", items: [text || "Nuevo punto"] };
    case "divider":
      return { id, type: "divider" };
    case "paragraph":
    default:
      return { id, type: "paragraph", text: text || "Nuevo párrafo" };
  }
}

/** Texto editable de una celda (lo que se muestra en el textarea del editor). */
export function cellToEditable(cell: LessonBlock): string {
  switch (cell.type) {
    case "quiz":
      return quizToEditable(cell.question, cell.options, cell.correct, cell.explanation);
    case "list":
      return cell.items.join("\n");
    case "image":
      return cell.alt;
    case "divider":
      return "";
    default:
      return cell.text;
  }
}

/** Devuelve una copia de la celda con el texto editado aplicado. */
export function cellWithText(cell: LessonBlock, text: string): LessonBlock {
  switch (cell.type) {
    case "quiz":
      return { ...cell, ...parseQuizText(text) };
    case "list":
      return { ...cell, items: text.split("\n").map((s) => s.trim()).filter(Boolean) };
    case "image":
      return { ...cell, alt: text };
    case "divider":
      return cell;
    default:
      return { ...cell, text };
  }
}
