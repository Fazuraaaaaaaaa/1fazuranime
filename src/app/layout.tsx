import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar, MobileNav } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BusyNotice } from "@/components/busy-notice";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Anime Streaming & Info`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["anime sub indo", "streaming anime", "nonton anime", "fazuranime", "otakudesu"],
  authors: [{ name: "FazurAnime" }],
  openGraph: {
    title: `${SITE_NAME} — Streaming Anime Subtitle Indonesia`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Streaming Anime Sub Indo`,
    description: SITE_DESCRIPTION,
  },
  manifest: "/manifest.json",
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
