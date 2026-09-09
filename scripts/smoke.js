import http from "http";

const URL = "http://localhost:3000";

console.log(`Smoke testing ${URL}...`);

http.get(URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Smoke test failed: HTTP ${res.statusCode}`);
    process.exit(1);
  }

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    if (!data.includes("FazurAnime")) {
      console.error("Smoke test failed: 'FazurAnime' not found in response.");
      process.exit(1);
    }
    console.log("Smoke test passed: HTTP 200 and 'FazurAnime' found in HTML.");
    process.exit(0);
  });
}).on("error", (err) => {
  console.error("Smoke test failed:", err.message);
  process.exit(1);
});