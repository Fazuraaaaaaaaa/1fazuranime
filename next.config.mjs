/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Posters/stream assets come from many upstream hosts (otakudesu.blog, dll)
    // Otakudesu kadang menggunakan http:// untuk gambar lamanya
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }
    ],
    formats: ["image/webp"],
  },
};

export default nextConfig;
