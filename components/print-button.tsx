"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink hover:border-gold print:hidden"
    >
      Распечатать
    </button>
  );
}
