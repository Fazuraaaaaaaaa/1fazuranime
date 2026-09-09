"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // server proxy layer is the source of truth for TTLs
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // never retry 429-style busy responses — show cached notice instead
              const status = (error as { status?: number }).status;
              if (status === 503 || status === 429) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
