# FazurAnime 🎬

Anime streaming & info web app built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and the **Sanka Vollerei API** — with a hardened proxy/cache layer to survive the API's strict rate limit (60 req/min, 3 violations = permanent ban).

## Quick start

```bash
npm install
cp .env.example .env.local   # adjust if needed
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

## Architecture

```
Browser ──► Next.js RSC pages ──────────────┐
                                            ▼
Browser ──► /api/proxy/<path> ──►  src/lib/api.ts (TTL policy)
                                            ▼
                              src/lib/upstream.ts  ◄── ONLY place that
                              • token-bucket limiter (50/min default)     touches upstream
                              • single-flight dedupe
                              • 429 cooldown + Retry-After
                              • stale fallback (up to 24h)
                                            ▼
                              src/lib/cache.ts (node-cache, SWR)
                                            ▼
                        https://www.sankavollerei.web.id/anime
```

### Cache TTLs (env-overridable)

| Kind    | TTL      | Env var             |
| ------- | -------- | ------------------- |
| Lists   | 15 min   | `CACHE_TTL_LIST`    |
| Detail  | 60 min   | `CACHE_TTL_DETAIL`  |
| Episode | 30 min   | `CACHE_TTL_EPISODE` |
| Search  | 30 min   | `CACHE_TTL_SEARCH`  |
| Server  | 5 min    | `CACHE_TTL_SERVER`  |
| Outbound rate limit | 50 req/min | `RATE_LIMIT_PER_MIN` |

## Routes

| Path                | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `/`                 | Hero carousel + ongoing/completed sections              |
| `/ongoing`          | Paginated ongoing anime                                 |
| `/completed`        | Paginated completed anime                               |
| `/search?q=`        | Search results (also Ctrl+K modal with 500ms debounce)  |
| `/anime/[slug]`     | Detail: synopsis, genres, episode list, recommendations |
| `/watch/[slug]`     | iframe player, server/quality switcher, playlist, downloads, prev/next |
| `/genre/[slug]`     | Genre listing with chips + pagination                   |
| `/my-list`          | Watchlist + continue-watching (localStorage, no auth)   |
| `/api/proxy/*`      | Cached proxy for client components (allowlisted paths)  |
| `/api/proxy/resolve` | Download-host link → embeddable player URL (e.g. Filedon) |
| `/api/proxy/stats`  | Cache keys / rate-limit token debug endpoint            |

## Notes

- Pages are `force-dynamic`; freshness is entirely governed by the server-side SWR cache, so a cold page render never burns upstream quota when data is warm.
- When upstream returns 429/5xx, expired cache entries are served as `fallback` and the client shows a "server busy" notice.
- Watchlist/history are stored in `localStorage` (`fazuranime:watchlist`, `fazuranime:history`) — no accounts needed.
- Dark theme is the default (next-themes); toggle in the navbar.
- 1080p is usually download-only upstream, but some download hosts expose an `/embed/` player. `sanitizeWatchServers()` (in `src/lib/api.ts`) builds the watch-page server list: it drops the desustream mirror family (`odstream`/`odcdn`/`ondesu*`/`otakuwatch*`/`updesu` — they send `X-Frame-Options: SAMEORIGIN` and can never play in an iframe) and synthesizes a **1080p** group from `MKV_1080p` download links on embeddable hosts (**Filedon**, **VikingFile**, **Mega**; redirects are followed manually server-side so Mega's `#key` fragment survives). On the watch page the client health-probes every button once via `/api/proxy/resolve` / `/api/proxy/server/<id>`: hosts without an embed player (Pixeldrain, GoFile, Acefile, …) answer `502` and their button is removed, then the player auto-selects the highest-quality healthy mirror (1080p embeds as last resort). Embed URLs are cached 5 min (negative results 10 min). Upstream occasionally sends quality groups with an empty `serverList` — these are filtered out.
