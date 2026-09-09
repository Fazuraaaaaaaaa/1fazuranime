"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, History, ListVideo, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchModal } from "@/components/search-modal";

const NAV = [
  { href: "/", label: "Home", icon: PlayCircle },
  { href: "/ongoing", label: "Ongoing", icon: Flame },
  { href: "/completed", label: "Completed", icon: ListVideo },
  { href: "/my-list", label: "Riwayat", icon: History },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Logo className="h-9 w-9 drop-shadow-[0_2px_8px_rgba(139,92,246,0.45)]" />
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
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
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
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
            (href === "/" ? pathname === "/" : pathname.startsWith(href))
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
