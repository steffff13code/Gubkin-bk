"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Мгновенная реакция на клик: полоса загрузки сверху при переходе по ссылке и
 * «занятая» кнопка при отправке формы. На медленном хостинге без этого кажется,
 * что кнопка не нажимается.
 *
 * Сброс — по смене адреса или по обновлению содержимого <main> (server action
 * часто возвращает на тот же адрес, и адрес не меняется).
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  function reset() {
    setActive(false);
    observerRef.current?.disconnect();
    observerRef.current = null;
    document.querySelectorAll<HTMLButtonElement>("button[data-pending]").forEach((btn) => {
      btn.disabled = btn.dataset.wasDisabled === "1";
      btn.removeAttribute("data-pending");
    });
  }

  useEffect(() => {
    reset();
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setActive(true);
    }

    function onSubmit(e: SubmitEvent) {
      if (e.defaultPrevented) return;
      setActive(true);

      const btn = e.submitter as HTMLButtonElement | null;
      if (btn && btn.tagName === "BUTTON") {
        btn.dataset.wasDisabled = btn.disabled ? "1" : "0";
        btn.setAttribute("data-pending", "");
        // Отключаем после отправки: в момент submit кнопка должна быть активной, иначе её значение не уйдёт.
        setTimeout(() => {
          btn.disabled = true;
        }, 0);
      }

      const main = document.querySelector("main");
      if (main) {
        observerRef.current?.disconnect();
        const observer = new MutationObserver(() => reset());
        observer.observe(main, { childList: true, subtree: true, characterData: true });
        observerRef.current = observer;
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  // Страховка: если сервер так и не ответил, не держим индикатор вечно.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(reset, 60000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-1/3 animate-[navprogress_1.1s_ease-in-out_infinite] bg-gold" />
    </div>
  );
}
