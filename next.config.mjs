// Node ≥ 17 changed the default DNS resolution order to "ipv4first".
// On networks where IPv4 to Cloudflare times out but IPv6 works fine,
// this causes `fetch failed – ConnectTimeoutError`.  Setting "verbatim"
// lets the OS resolver decide the address order (usually IPv6-first),
// which fixes the upstream API connection on such networks.
import dns from "node:dns";
dns.setDefaultResultOrder("verbatim");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Semua poster diroutekan secara lokal via /api/poster yang mereturn 302 atau streaming langsung
    formats: ["image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src https: http:; frame-ancestors 'none';" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
