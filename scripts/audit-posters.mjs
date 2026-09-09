const BASE = "http://localhost:3000";

async function extractPosters(path) {
  const html = await (await fetch(BASE + path)).text();
  const urls = [...html.matchAll(/\/api\/poster\?[^"'>\s\\]+/g)].map((m) =>
    m[0].replace(/&amp;/g, "&").replace(/\\u0026/g, "&")
  );
  return [...new Set(urls)];
}

async function run() {
  const pages = ["/", "/ongoing", "/completed"];
  const all = new Set();
  for (const p of pages) {
    try {
      const urls = await extractPosters(p);
      console.log(`${p}: ${urls.length} unique posters`);
      for (const u of urls) all.add(u);
    } catch (e) {
      console.log(`${p}: FAILED (${e.message})`);
    }
  }

  console.log(`\nTotal unique posters: ${all.size}\n`);
  let ok = 0;
  let miss = 0;
  let redir = 0;
  let proxied = 0;
  let svg = 0;
  const misses = [];

  for (const p of all) {
    try {
      const res = await fetch(BASE + p, { redirect: "manual", signal: AbortSignal.timeout(30000) });
      const loc = res.headers.get("location");
      const ct = res.headers.get("content-type") || "";
      if (loc) {
        ok++;
        redir++; // 302 -> Kitsu/MAL CDN
      } else if (res.status === 200 && ct.startsWith("image/svg")) {
        miss++; // placeholder = not a real poster
        svg++;
        const t = new URL(BASE + p).searchParams.get("title") || "?";
        misses.push(`${t} [SVG placeholder]`);
      } else if (res.status === 200 && ct.startsWith("image/")) {
        ok++;
        proxied++; // proxied upstream image (200 + real image body)
      } else {
        miss++;
        const t = new URL(BASE + p).searchParams.get("title") || "?";
        misses.push(`${t} [${res.status} ${ct}]`);
      }
    } catch (e) {
      miss++;
      const t = new URL(BASE + p).searchParams.get("title") || "?";
      misses.push(`${t} [ERROR: ${e.message}]`);
    }
  }

  console.log(`MATCHED: ${ok}  MISSED: ${miss}  (${all.size ? Math.round((ok / all.size) * 100) : 0}% filled)`);
  console.log(`  breakdown: ${redir} via CDN redirect, ${proxied} via server proxy, ${svg} SVG placeholder`);
  if (misses.length) {
    console.log("\n--- Misses ---");
    for (const m of misses) console.log(" -", m);
  }
}

run().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

