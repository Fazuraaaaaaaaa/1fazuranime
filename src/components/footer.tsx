import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card/40">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground md:flex-row">
        <p>
          © {new Date().getFullYear()} FazurAnime — data provided by{" "}
          <a
            href="https://www.sankavollerei.web.id/anime/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline hover:text-foreground"
          >
            Sanka Vollerei API
          </a>
          . Not affiliated with any content owner.
        </p>
        <nav className="flex gap-4">
          <Link href="/ongoing" className="hover:text-foreground">Ongoing</Link>
          <Link href="/completed" className="hover:text-foreground">Completed</Link>
          <Link href="/my-list" className="hover:text-foreground">My List</Link>
        </nav>
      </div>
    </footer>
  );
}
