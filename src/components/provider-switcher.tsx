"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Tv, Sparkles, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type ProviderType = "otakudesu" | "samehadaku" | "animekompi";

interface ProviderOption {
  id: ProviderType;
  name: string;
  badge: string;
  description: string;
  icon: typeof Tv;
  colorClass: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "otakudesu",
    name: "Otakudesu",
    badge: "Default",
    description: "Koleksi Terlengkap & Server Klasik",
    icon: Zap,
    colorClass: "hover:border-primary/50 data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
  },
  {
    id: "samehadaku",
    name: "Samehadaku",
    badge: "Blogger HD",
    description: "Google CDN HD 1080p & Cepat",
    icon: Sparkles,
    colorClass: "hover:border-amber-500/50 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500/10 data-[active=true]:text-amber-400",
  },
  {
    id: "animekompi",
    name: "Animekompi",
    badge: "Danmaku",
    description: "Direct Embed & Komentar Melayang",
    icon: MessageSquare,
    colorClass: "hover:border-purple-500/50 data-[active=true]:border-purple-500 data-[active=true]:bg-purple-500/10 data-[active=true]:text-purple-400",
  },
];

export function ProviderSwitcher({ current = "otakudesu" }: { current?: ProviderType }) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("provider") as ProviderType) || current;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/60 p-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex items-center gap-2">
        <Tv className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pilihan Sumber Provider
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PROVIDERS.map((p) => {
          const isActive = active === p.id;
          const Icon = p.icon;
          return (
            <Link
              key={p.id}
              href={`/?provider=${p.id}`}
              data-active={isActive}
              className={cn(
                "group relative flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-left transition-all",
                p.colorClass,
                isActive && "shadow-sm font-semibold ring-1 ring-border/80",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive && "text-current")} />
                <div className="truncate">
                  <div className="text-xs font-bold leading-tight">{p.name}</div>
                  <div className="hidden text-[10px] text-muted-foreground sm:block truncate">{p.description}</div>
                </div>
              </div>

              <Badge
                variant={isActive ? "default" : "secondary"}
                className="shrink-0 text-[10px] px-1.5 py-0 font-normal"
              >
                {p.badge}
              </Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
