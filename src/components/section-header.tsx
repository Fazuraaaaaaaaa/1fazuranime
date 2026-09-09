import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, href, className, children }: Props) {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      <div className="flex items-center gap-2.5">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        {children}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
