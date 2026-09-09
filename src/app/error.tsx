"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container flex flex-col items-center gap-3 py-24 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The upstream API may be rate-limited or temporarily unavailable. Cached data will be served
        again shortly — try reloading in a moment.
      </p>
      {error?.digest && (
        <code className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          {error.digest}
        </code>
      )}
      <Button onClick={reset} size="sm" className="mt-2 gap-1.5">
        <RotateCcw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
