import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  basePath: string;
  className?: string;
}

/** Simple prev/next + windowed page numbers driven by upstream pagination. */
export function PaginationNav({ currentPage, hasNextPage, hasPrevPage, basePath, className }: Props) {
  const href = (p: number) => `${basePath}?page=${p}`;

  return (
    <nav
      className={cn("mt-8 flex items-center justify-center gap-1.5", className)}
      aria-label="Pagination"
    >
      <PageLink href={hasPrevPage ? href(currentPage - 1) : undefined} disabled={!hasPrevPage}>
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </PageLink>

      {/* windowed numbers: current-2..current+2 */}
      {[-2, -1, 0, 1, 2]
        .map((o) => currentPage + o)
        .filter((p) => p >= 1 && (p <= currentPage + 2))
        .map((p) => (
          <PageLink key={p} href={href(p)} active={p === currentPage}>
            {p}
          </PageLink>
        ))}

      <PageLink href={hasNextPage ? href(currentPage + 1) : undefined} disabled={!hasNextPage}>
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
}: {
  href?: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border px-2 text-sm font-medium transition-colors";
  if (disabled || !href) {
    return <span className={cn(base, "cursor-not-allowed opacity-40")}>{children}</span>;
  }
  return (
    <Link
      href={href}
      className={cn(
        base,
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:border-primary/50 hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}
