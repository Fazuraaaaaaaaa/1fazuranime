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
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days cache for optimized images
    remotePatterns: [
      { protocol: "https", hostname: "media.kitsu.app" },
      { protocol: "https", hostname: "**.kitsu.app" },
      { protocol: "https", hostname: "**.kitsu.io" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "**.myanimelist.net" },
      { protocol: "https", hostname: "**.jikan.moe" },
      { protocol: "https", hostname: "**.backblazeb2.com" },
      { protocol: "https", hostname: "**.sankavollerei.web.id" },
      { protocol: "https", hostname: "sankavollerei.web.id" },
      { protocol: "https", hostname: "**.otakudesu.**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/image(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, s-maxage=31536000, immutable" },
        ],
      },
      {
        source: "/api/poster(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/(icon.svg|manifest.json|favicon.ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
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
