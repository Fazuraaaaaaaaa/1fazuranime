const urls = [
  "https://filedon.co/embed/oDLcprUI0W",
  "https://odvidhide.com/embed/si3bhvgvizwn",
  "https://mega.nz/embed/A3YiBQIY#7D25JKkL7T84LVe0uI_CkjDaZeOEkacSFWU2YFcdXIM",
  "https://desustream.net/dstream/updesu/v5/index.php?id=MHV5VWhuQm1nVUFTb05tNk14aklMQT09",
  "https://desustream.net/dstream/ondesu/new/hd/index.php?id=MHV5VWhuQm1nVUFTb05tNk14aklMQT09",
  "https://www.blogger.com/video.g?token=AD6v5dxFKdoOl3saj_0X2WBVYzRjlUD3MN5-l75UYTwBVJxiZjkYnwm8Nx1lmHzVZGvGPb7tfGkC_qDsb0DyPDRnsckfelYtyAmzzhmUhnyRviOE_IgyrRxCDqEjCBHM20NNCk2Xb6o&origin=kcnwnuewnuwiwniejiscnwdesugoing.blogspot.com"
];

async function main() {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 AniVerse", "Accept": "text/html" } });
      const xFrame = r.headers.get("x-frame-options");
      const csp = r.headers.get("content-security-policy");
      console.log(`\nURL: ${u.split('/')[2]}`);
      console.log(`STATUS: ${r.status}`);
      if (xFrame) console.log(`X-Frame: ${xFrame}`);
      if (csp && csp.includes("frame-ancestors")) console.log(`CSP: ${csp.substring(0, 50)}...`);
      
      const txt = await r.text();
      if (txt.includes("File not found") || txt.includes("Video not found") || txt.includes("Deleted")) {
        console.log(`BODY: Video/File Not Found detected!`);
      }
    } catch (e) {
      console.log(`${u} -> ERR: ${e.message}`);
    }
  }
}
main();