import { useState } from "preact/hooks";
import { COLOR_PALETTE, FONT_LABELS, FONT_SIZES } from "../utils/richtext";

// RichToolbar: mini barra de formato. Envuelve el texto SELECCIONADO del
// textarea con la sintaxis .lesson correspondiente (B, I, color, fuente…).
// No sabe nada de lessons: solo edita texto.

interface Props {
  target: () => HTMLTextAreaElement | null;
  onApply: (next: string) => void;
}

const BTN = "px-2 py-1 rounded-lg border text-xs bg-white hover:bg-gray-100 shrink-0";

export default function RichToolbar({ target, onApply }: Props) {
  const [panel, setPanel] = useState<"color" | "bg" | null>(null);
  const [custom, setCustom] = useState("#e11d48");

  const wrap = (before: string, after: string, placeholder = "texto") => {
    const ta = target();
    if (!ta) return;
    const s = ta.selectionStart ?? 0;
    const e = ta.selectionEnd ?? 0;
    const sel = ta.value.slice(s, e) || placeholder;
    onApply(ta.value.slice(0, s) + before + sel + after + ta.value.slice(e));
    const ns = s + before.length;
    const ne = ns + sel.length;
    // Restaura la selección (queda sobre el texto con formato aplicado).
    requestAnimationFrame(() => {
      const el = target();
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(ns, ne);
      } catch {}
    });
  };

  const swatches = (kind: "color" | "bg") => (
    <div class="flex flex-wrap items-center gap-1 mt-1 bg-gray-50 border rounded-xl p-2">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          title={c}
          onClick={() => {
            wrap(`{${kind}:${c}|`, "}");
            setPanel(null);
          }}
          class="w-6 h-6 rounded-lg border border-gray-300 hover:scale-110 transition"
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={custom}
        onInput={(e) => setCustom((e.target as HTMLInputElement).value)}
        title="Color personalizado"
        class="w-6 h-6 rounded-lg border border-gray-300 cursor-pointer p-0 bg-white"
      />
      <button onClick={() => { wrap(`{${kind}:${custom}|`, "}"); setPanel(null); }} class="px-2 py-1 rounded-lg bg-gray-900 text-white text-xs font-bold">
        ✓
      </button>
    </div>
  );

  return (
    <div class="mb-1.5">
      <div class="flex flex-wrap items-center gap-1">
        <button class={BTN} title="Negrita" onClick={() => wrap("**", "**")}><b>B</b></button>
        <button class={BTN} title="Cursiva" onClick={() => wrap("*", "*")}><i>I</i></button>
        <button class={BTN} title="Subrayado" onClick={() => wrap("__", "__")}><u>U</u></button>
        <button class={BTN} title="Código" onClick={() => wrap("`", "`", "código")}>&lt;/&gt;</button>
        <button class={BTN} title="Resaltado" onClick={() => wrap("==", "==")}>
          <span class="bg-yellow-200 px-1 rounded">A</span>
        </button>
        <button class={BTN} title="Enlace" onClick={() => wrap("[", "](https://)")}>🔗</button>
        <button
          class={BTN}
          title="Color de texto"
          onClick={() => setPanel((p) => (p === "color" ? null : "color"))}
        >
          <span class="font-bold border-b-2 border-red-500">A</span>
        </button>
        <button
          class={BTN}
          title="Color de fondo"
          onClick={() => setPanel((p) => (p === "bg" ? null : "bg"))}
        >
          <span class="bg-amber-200 px-1 rounded font-bold">A</span>
        </button>
        <select
          title="Fuente"
          value=""
          onChange={(e) => {
            const f = (e.target as HTMLSelectElement).value;
            if (f) wrap(`{font:${f}|`, "}");
            (e.target as HTMLSelectElement).value = "";
          }}
          class="px-1.5 py-1 rounded-lg border text-xs bg-white hover:bg-gray-100 max-w-[110px]"
        >
          <option value="">Fuente…</option>
          {Object.entries(FONT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <select
          title="Tamaño"
          value=""
          onChange={(e) => {
            const n = (e.target as HTMLSelectElement).value;
            if (n) wrap(`{size:${n}|`, "}");
            (e.target as HTMLSelectElement).value = "";
          }}
          class="px-1.5 py-1 rounded-lg border text-xs bg-white hover:bg-gray-100"
        >
          <option value="">Tamaño…</option>
          {FONT_SIZES.map((n) => (
            <option key={n} value={n}>{n}px</option>
          ))}
        </select>
      </div>
      {panel && swatches(panel)}
    </div>
  );
}
