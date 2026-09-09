import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center gap-3 py-24 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-4xl font-extrabold tracking-tight">404</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page or anime you are looking for does not exist, or it may have been removed from the
        catalog.
      </p>
      <div className="mt-3 flex gap-2">
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ongoing">Browse Ongoing</Link>
        </Button>
      </div>
    </div>
  );
}
