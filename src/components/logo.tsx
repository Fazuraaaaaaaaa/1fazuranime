import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * FazurAnime logo mark — violet squircle, rounded play triangle, anime sparkle.
 * Pure inline SVG (no asset fetch), theme-independent, scales to any size.
 */
export function Logo({ className }: { className?: string }) {
  const id = useId();
  const grad = `${id}-grad`;
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      {/* squircle container */}
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${grad})`} />
      {/* top-left sheen */}
      <ellipse cx="21" cy="13" rx="15" ry="9" fill="#ffffff" opacity="0.16" />
      {/* rounded play triangle */}
      <path
        d="M24.5 22.8 L41 32 L24.5 41.2 Z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* anime sparkle, top-right */}
      <path
        d="M47 9 C48 13.4 49.6 15 54 16 C49.6 17 48 18.6 47 23 C46 18.6 44.4 17 40 16 C44.4 15 46 13.4 47 9 Z"
        fill="#e9d5ff"
      />
      {/* small accent dot, bottom-right */}
      <circle cx="51" cy="46" r="2.4" fill="#e9d5ff" opacity="0.85" />
    </svg>
  );
}