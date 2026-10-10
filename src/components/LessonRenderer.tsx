import type { Lesson } from "../utils/lesson";
import { resolveLessonImage } from "../utils/lessonImages";
import { clampSize, fontStackFor, toSafeColor } from "../utils/richtext";
import QuizBlock from "./QuizBlock";

// LessonRenderer: única pieza que conoce el DISEÑO.
// Recibe un Lesson (contenido puro) y lo pinta.
// Para migrar a otro diseño, solo se reescribe este archivo (o se crea otro
// renderer con la misma firma). Los .lesson no cambian.

// Mini inline: **negrita**, *cursiva*, __subrayado__, `código`, ==resaltado==,
// [texto](url) y estilos {color:X|t} {bg:X|t} {font:X|t} {size:N|t}.
function styledSpan(kind: string, param: string | undefined, inner: string, key: string): preact.JSX.Element | string {
  const fallback = `{${kind}:${param ?? ""}|${inner}}`;
  if (kind === "color") {
    const c = toSafeColor(param ?? "");
    return c ? <span key={key} style={{ color: c }}>{inner}</span> : fallback;
  }
  if (kind === "bg") {
    const c = toSafeColor(param ?? "");
    return c ? <span key={key} style={{ backgroundColor: c }}>{inner}</span> : fallback;
  }
  if (kind === "font") {
    const f = fontStackFor(param ?? "");
    return f ? <span key={key} style={{ fontFamily: f }}>{inner}</span> : fallback;
  }
  if (kind === "size") {
    const n = clampSize(param ?? "");
    return n ? <span key={key} style={{ fontSize: `${n}px` }}>{inner}</span> : fallback;
  }
  return inner;
}

function renderInline(text: string, keyPrefix: string): (string | preact.JSX.Element)[] {
  const out: (string | preact.JSX.Element)[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`|==[^=]+==|\[[^\]]+\]\([^)]+\)|\{(?:color|bg|font|size)(?::[^|{}]+)?\|[^{}]*\})/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyPrefix}-${k++}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("__")) out.push(<u key={`${keyPrefix}-${k++}`}>{tok.slice(2, -2)}</u>);
    else if (tok.startsWith("*")) out.push(<em key={`${keyPrefix}-${k++}`}>{tok.slice(1, -1)}</em>);
    else if (tok.startsWith("`")) out.push(<code key={`${keyPrefix}-${k++}`} class="px-1 py-0.5 bg-gray-100 border rounded text-[0.9em] font-mono">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("==")) out.push(<mark key={`${keyPrefix}-${k++}`} class="bg-yellow-200 px-0.5 rounded">{tok.slice(2, -2)}</mark>);
    else if (tok.startsWith("{")) {
      const sm = tok.match(/^\{(color|bg|font|size)(?::([^|{}]+))?\|([^{}]*)\}$/);
      out.push(sm ? styledSpan(sm[1], sm[2], sm[3], `${keyPrefix}-${k++}`) : tok);
    }
    else {
      const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (lm) out.push(<a key={`${keyPrefix}-${k++}`} href={lm[2]} class="text-indigo-600 underline hover:text-indigo-800" target={lm[2].startsWith("http") ? "_blank" : undefined} rel="noreferrer">{lm[1]}</a>);
      else out.push(tok);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function LessonRenderer({ lesson }: { lesson: Lesson }) {
  return (
    <article class="lesson-content">
      {lesson.blocks.map((b) => {
        const anchor = `cell-${b.id}`;
        switch (b.type) {
          case "h1":
            return <h1 key={b.id} id={anchor} class="text-3xl font-extrabold mt-2 mb-3 scroll-mt-32">{renderInline(b.text, `h1-${b.id}`)}</h1>;
          case "h2":
            return <h2 key={b.id} id={anchor} class="text-2xl font-bold mt-8 mb-2 scroll-mt-32">{renderInline(b.text, `h2-${b.id}`)}</h2>;
          case "h3":
            return <h3 key={b.id} id={anchor} class="text-lg font-bold mt-6 mb-2 scroll-mt-32">{renderInline(b.text, `h3-${b.id}`)}</h3>;
          case "paragraph":
            return <p key={b.id} id={anchor} class="text-[15px] leading-relaxed text-gray-800 my-3 scroll-mt-32">{renderInline(b.text, `p-${b.id}`)}</p>;
          case "quote":
            return (
              <blockquote key={b.id} id={anchor} class="my-4 border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-4 py-3 text-sm text-amber-900 scroll-mt-32">
                {renderInline(b.text, `q-${b.id}`)}
              </blockquote>
            );
          case "list":
            return (
              <ul key={b.id} id={anchor} class="my-3 space-y-1.5 scroll-mt-32">
                {b.items.map((it, j) => (
                  <li key={j} class="flex gap-2 text-[15px] text-gray-800">
                    <span class="text-indigo-600 font-bold">•</span>
                    <span>{renderInline(it, `li-${b.id}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={b.id} id={anchor} class="my-6 scroll-mt-32">
                <img src={resolveLessonImage(lesson.meta.blockId, lesson.meta.id, b.src)} alt={b.alt} title={b.title} class="rounded-2xl border w-full object-cover" loading="lazy" />
                {(b.alt || b.title) && (
                  <figcaption class="text-xs text-gray-500 mt-2 text-center">{b.title ?? b.alt}</figcaption>
                )}
              </figure>
            );
          case "divider":
            return <hr key={b.id} id={anchor} class="my-8 border-gray-200" />;
          case "quiz":
            return (
              <div key={b.id} id={anchor} class="scroll-mt-32">
                <QuizBlock block={b} lessonId={lesson.meta.id} />
              </div>
            );
          default:
            return null;
        }
      })}
    </article>
  );
}
