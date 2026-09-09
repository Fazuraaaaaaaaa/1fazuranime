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
  const [message, setMessage] = useState("Server is busy — serving cached data");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onBusy = (e: Event) => {
      const retryAfter = (e as CustomEvent<{ retryAfter?: number }>).detail?.retryAfter;
      setMessage(
        retryAfter
          ? `Server is busy — serving cached data (retry in ~${retryAfter}s)`
          : "Server is busy — serving cached data",
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
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-500 shadow-lg backdrop-blur animate-fade-up">
      <Clock className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <button onClick={() => setVisible(false)} aria-label="Dismiss" className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
