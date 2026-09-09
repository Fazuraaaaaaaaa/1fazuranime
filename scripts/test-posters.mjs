const BASE = "http://localhost:3000";

(async () => {
  const html = await (await fetch(BASE + "/")).text();
  const refs = [...html.matchAll(/\/api\/poster\?[^"&]*&amp;?[^"]*"/g)].map((m) =>
    m[0].replace(/"/g, "").replace(/&amp;/g, "&")
  );
  console.log("poster refs on homepage:", refs.length);
  console.log(refs.slice(0, 3).join("\n"));

  // Resolve the first 12 through the proxy the same way a browser would.
  const samples = refs.slice(0, 12);
  const t0 = Date.now();
  const results = await Promise.all(
    samples.map(async (r) => {
      const res = await fetch(BASE + r, { redirect: "follow" });
      return { r: r.slice(0, 60), status: res.status, type: res.headers.get("content-type"), final: res.url.slice(0, 70) };
    })
  );
  for (const x of results) console.log(x.status, x.type, "|", x.final);
  console.log("elapsed ms:", Date.now() - t0);
})();
