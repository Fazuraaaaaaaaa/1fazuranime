import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar, MobileNav } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BusyNotice } from "@/components/busy-notice";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "FazurAnime — Anime Streaming & Info", template: "%s | FazurAnime" },
  description: "Watch anime with subtitle Indonesia — gratis, tanpa iklan. Powered by Sanka Vollerei API.",
  metadataBase: new URL("https://fazuranime.example.com"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0a14" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <MobileNav />
          </div>
          <BusyNotice />
        </Providers>
      </body>
    </html>
  );
}
