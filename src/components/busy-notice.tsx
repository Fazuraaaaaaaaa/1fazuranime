"use client";

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";

/**
 * Subtle toast-style notice shown when the proxy serves cached fallback data
 * (upstream 429 / outage). Listens for the `fazuranime:busy` window event
 * dispatched by the client fetcher.
 */
export function BusyNotice() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("Server sedang sibuk — menampilkan data cache");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onBusy = (e: Event) => {
      const retryAfter = (e as CustomEvent<{ retryAfter?: number }>).detail?.retryAfter;
      setMessage(
        retryAfter
          ? `Server sedang sibuk — menampilkan data cache (coba lagi dlm ~${retryAfter}s)`
          : "Server sedang sibuk — menampilkan data cache",
      );
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 6000);
    };
    window.addEventListener("fazuranime:busy", onBusy);
    return () => {
      window.removeEventListener("fazuranime:busy", onBusy);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-[60] flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-card/95 px-4 py-2.5 text-xs font-medium text-amber-600 shadow-xl backdrop-blur-md animate-fade-up dark:text-amber-400 md:bottom-5 md:text-sm">
      <Clock className="h-4 w-4 shrink-0 text-amber-500" />
      <span>{message}</span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="ml-1 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
