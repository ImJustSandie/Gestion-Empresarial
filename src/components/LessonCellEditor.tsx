import { useState } from "preact/hooks";
import LessonCellForm from "./LessonCellForm";
import LessonRenderer from "./LessonRenderer";
import type { Lesson } from "../utils/lesson";

// LessonCellEditor: formulario de celdas + vista previa debajo.
// Se usa en /lecciones/[id]. En /editor se usa LessonCellForm + preview lateral.
interface Props {
  base: Lesson;
  onSave?: (effective: Lesson) => void;
  saveLabel?: string;
}

export default function LessonCellEditor({ base, onSave, saveLabel }: Props) {
  const [preview, setPreview] = useState<Lesson | null>(null);

  return (
    <div class="mt-6">
      <LessonCellForm base={base} onSave={onSave} onChange={setPreview} saveLabel={saveLabel} />
      <div class="mt-4 bg-white border rounded-3xl p-6">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Vista previa con este orden</p>
        <LessonRenderer lesson={preview ?? base} />
      </div>
    </div>
  );
}
