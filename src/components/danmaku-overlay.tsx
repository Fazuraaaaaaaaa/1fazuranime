"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Send, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { proxyGet } from "@/lib/client";
import type { DanmakuComment } from "@/lib/types";

interface Props {
  episodeSlug: string;
  animekompiSlug?: string;
  children?: React.ReactNode;
}

const DEFAULT_COMMENTS: Array<{ text: string; color: string }> = [
  { text: "Animasi nya gilaaa keren banget! 🔥", color: "#00f0ff" },
  { text: "Opening song nya enak banget didengar 🎧", color: "#ffd700" },
  { text: "Eps ini paling ditunggu-tunggu!", color: "#ffffff" },
  { text: "Wkwkwk kocak banget scene ini 😂", color: "#ff69b4" },
  { text: "Lanjut terus min, mantap kualitasnya! 👍", color: "#00ff88" },
  { text: "Grafik 1080p jernih parah ✨", color: "#ffd700" },
  { text: "Siap-siap plot twist bentar lagi...", color: "#ff8800" },
];

const COLORS = [
  { label: "Putih", value: "#ffffff" },
  { label: "Cyan", value: "#00f0ff" },
  { label: "Kuning", value: "#ffd700" },
  { label: "Pink", value: "#ff69b4" },
  { label: "Hijau", value: "#00ff88" },
];

const LANES = [8, 22, 36, 50, 64, 78]; // percentage from top

interface ActiveItem {
  id: string;
  text: string;
  color: string;
  top: number;
  duration: number; // in seconds
}

export function DanmakuOverlay({ episodeSlug, animekompiSlug, children }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [inputText, setInputText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [commentPool, setCommentPool] = useState<Array<{ text: string; color: string }>>([]);
  const laneIndexRef = useRef(0);

  // Load comments from localStorage and upstream Animekompi danmaku endpoint
  useEffect(() => {
    const localKey = `danmaku:${episodeSlug}`;
    let saved: Array<{ text: string; color: string }> = [];
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // ignore
    }

    const pool = [...saved, ...DEFAULT_COMMENTS];
    setCommentPool(pool);

    // Fetch upstream Danmaku if animekompiSlug is provided
    if (animekompiSlug) {
      proxyGet<unknown[]>(`animekompi/episode/${encodeURIComponent(animekompiSlug)}/danmaku`)
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            const upstreamComments = res.data.map((item: any) => ({
              text: String(item?.text || item?.comment || item?.msg || ""),
              color: String(item?.color || "#ffffff"),
            })).filter((c) => c.text.length > 0);
            if (upstreamComments.length > 0) {
              setCommentPool((prev) => [...upstreamComments, ...prev]);
            }
          }
        })
        .catch(() => {});
    }
  }, [episodeSlug, animekompiSlug]);

  const spawnComment = useCallback((text: string, color: string) => {
    if (!text.trim()) return;
    const lane = LANES[laneIndexRef.current % LANES.length];
    laneIndexRef.current += 1;

    const newItem: ActiveItem = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      color,
      top: lane,
      duration: Math.floor(Math.random() * 4) + 7, // 7 to 10 seconds
    };

    setActiveItems((prev) => [...prev.slice(-25), newItem]);

    setTimeout(() => {
      setActiveItems((prev) => prev.filter((item) => item.id !== newItem.id));
    }, newItem.duration * 1000);
  }, []);

  // Periodic spawner from commentPool to keep stream lively
  useEffect(() => {
    if (!enabled || commentPool.length === 0) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        const randomIndex = Math.floor(Math.random() * commentPool.length);
        const item = commentPool[randomIndex];
        spawnComment(item.text, item.color);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [enabled, commentPool, spawnComment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newComment = { text: inputText.trim(), color: selectedColor };
    spawnComment(newComment.text, newComment.color);

    // Save to local storage
    try {
      const localKey = `danmaku:${episodeSlug}`;
      const raw = localStorage.getItem(localKey);
      const existing: Array<{ text: string; color: string }> = raw ? JSON.parse(raw) : [];
      localStorage.setItem(localKey, JSON.stringify([newComment, ...existing]));
    } catch {
      // ignore
    }

    setCommentPool((prev) => [newComment, ...prev]);
    setInputText("");
  };

  return (
    <div className="space-y-3">
      {/* Video Player Container with Danmaku Floating Canvas */}
      <div className="relative">
        {children}
        {enabled && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
            {activeItems.map((item) => (
              <div
                key={item.id}
                style={{
                  top: `${item.top}%`,
                  color: item.color,
                  animation: `danmaku-slide ${item.duration}s linear forwards`,
                  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)",
                }}
                className="absolute whitespace-nowrap text-sm font-bold tracking-wide sm:text-base md:text-lg"
              >
                {item.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danmaku Controls & Input Bar */}
      <div className="flex flex-col gap-2 rounded-lg border border-purple-500/30 bg-purple-950/20 p-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={enabled ? "default" : "outline"}
            size="sm"
            onClick={() => setEnabled(!enabled)}
            className={`h-7 gap-1.5 px-2.5 text-xs font-semibold ${
              enabled
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                : "border-purple-500/40 text-purple-300"
            }`}
          >
            {enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Danmaku {enabled ? "ON" : "OFF"}</span>
          </Button>

          <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-1 bg-purple-500/10 text-purple-300 text-[11px] border-purple-500/20">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>Komentar Melayang Animekompi</span>
          </Badge>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-1.5 sm:max-w-md sm:ml-auto">
          {/* Color Selectors */}
          <div className="flex items-center gap-1 shrink-0">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setSelectedColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`h-4 w-4 rounded-full border transition-transform ${
                  selectedColor === c.value ? "scale-125 ring-2 ring-purple-400 ring-offset-1 ring-offset-background" : "opacity-70 hover:opacity-100"
                }`}
                title={c.label}
              />
            ))}
          </div>

          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tulis komentar melayang..."
            className="h-7 text-xs bg-background/60 border-purple-500/30 focus-visible:ring-purple-500"
          />

          <Button
            type="submit"
            size="sm"
            disabled={!inputText.trim()}
            className="h-7 shrink-0 px-2.5 text-xs bg-purple-600 hover:bg-purple-500 text-white"
          >
            <Send className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Kirim</span>
          </Button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes danmaku-slide {
          from {
            transform: translateX(100vw);
          }
          to {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}
