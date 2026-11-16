import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground border-border bg-background/50",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium",
        destructive: "border-destructive/30 bg-destructive/15 text-destructive font-medium",
        hd: "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold tracking-wider uppercase text-[10px]",
        episode: "border-primary/30 bg-primary/20 text-primary font-bold tracking-wide uppercase text-[11px]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
