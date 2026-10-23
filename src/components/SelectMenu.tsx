import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
}

interface SelectMenuProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  icon?: ComponentChildren;
  wrapperClass?: string;
  textClass?: string;
  panelClass?: string;
  placeholder?: string;
}

export default function SelectMenu({
  options,
  value,
  onChange,
  ariaLabel,
  icon,
  wrapperClass = "",
  textClass = "text-sm font-semibold text-slate-800",
  panelClass = "",
  placeholder = "",
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);
  const triggerText = selected ? (selected.meta ? `${selected.meta} — ${selected.label}` : selected.label) : placeholder;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const el = rootRef.current.querySelector(`[data-option-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openMenu = () => {
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[activeIndex]) commit(options[activeIndex].value);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} class={`relative ${wrapperClass}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        class="w-full flex items-center cursor-pointer text-left"
      >
        {icon}
        <span class={`flex-1 min-w-0 truncate pr-8 ${textClass}`}>{triggerText}</span>
        <svg
          class={`w-4 h-4 text-slate-400 absolute right-4 pointer-events-none transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          class={`absolute z-30 mt-2 left-0 right-0 max-h-72 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-xl p-1.5 ${panelClass}`}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isActive = i === activeIndex;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-option-index={i}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(o.value)}
                class={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-colors cursor-pointer ${
                  isSelected ? "text-[#5932EA] font-semibold bg-indigo-50" : "text-slate-700"
                } ${isActive && !isSelected ? "bg-slate-50" : ""}`}
              >
                <span class={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-[#5932EA]" : "bg-slate-300"}`} />
                {o.meta && <span class="font-mono text-xs text-slate-500 shrink-0">{o.meta}</span>}
                <span class="truncate flex-1">{o.label}</span>
                {isSelected && <span class="text-[#5932EA] shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
