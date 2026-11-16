import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/80 bg-card/40">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 pb-24 text-sm text-muted-foreground md:flex-row md:pb-8">
        <p className="text-center md:text-left">
          © {new Date().getFullYear()} FazurAnime — data provided by{" "}
          <a
            href="https://www.sankavollerei.web.id/anime/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Sanka Vollerei API
          </a>
          . Not affiliated with any content owner.
        </p>
        <nav className="flex items-center gap-4 text-xs sm:text-sm">
          <Link href="/ongoing" className="hover:text-foreground transition-colors">Ongoing</Link>
          <Link href="/completed" className="hover:text-foreground transition-colors">Completed</Link>
          <Link href="/genre" className="hover:text-foreground transition-colors">Genre</Link>
          <Link href="/my-list" className="hover:text-foreground transition-colors">Riwayat</Link>
        </nav>
      </div>
    </footer>
  );
}
