import Link from "next/link";
import { Tags } from "lucide-react";
import { getGenres } from "@/lib/api";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Genre Anime",
  description: "Cari anime berdasarkan genre favorit Anda.",
};

export default async function GenresPage() {
  const result = await getGenres().catch(() => null);
  const genres = result?.data.genreList ?? [];

  return (
    <div className="container py-8">
      <SectionHeader title="Jelajahi Genre" className="mb-3">
        <Badge variant="success">{genres.length} genre</Badge>
      </SectionHeader>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Pilih genre untuk menemukan anime yang sesuai dengan selera Anda.
      </p>

      {genres.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {genres.map((genre) => (
            <Link
              key={genre.genreId}
              href={`/genre/${encodeURIComponent(genre.genreId)}`}
              className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-accent"
            >
              <Tags className="mb-3 h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              <span className="text-sm font-semibold group-hover:text-primary">{genre.title}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Daftar genre belum tersedia. Silakan coba lagi beberapa saat lagi.
        </p>
      )}
    </div>
  );
}

