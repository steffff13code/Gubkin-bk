"use client";

import { useState } from "react";

/** Кнопка «Скопировать» для готового текста в рабочий чат. */
export function CopyButton({ text, label = "Скопировать" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Старые браузеры: выделяем через временное поле.
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-gold"
    >
      {copied ? "Скопировано ✓" : label}
    </button>
  );
}
