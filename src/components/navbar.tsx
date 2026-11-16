"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, History, ListVideo, PlayCircle, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchModal } from "@/components/search-modal";

const NAV = [
  { href: "/", label: "Home", icon: PlayCircle },
  { href: "/ongoing", label: "Ongoing", icon: Flame },
  { href: "/completed", label: "Completed", icon: ListVideo },
  { href: "/genre", label: "Genre", icon: Tags },
  { href: "/my-list", label: "Riwayat", icon: History },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 transition-transform hover:opacity-90">
          <Logo className="h-9 w-9 drop-shadow-[0_2px_8px_rgba(139,92,246,0.45)] transition-transform duration-300 group-hover:scale-105" />
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            Fazur<span className="text-primary">Anime</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchModal />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Fixed bottom tab bar for mobile (hidden on md+). */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border/80 bg-background/90 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur-lg md:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors",
              active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute -top-1 h-0.5 w-6 rounded-full bg-primary" />
            )}
            <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
