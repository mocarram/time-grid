"use client";

import { StoresProvider } from "@app/stores/store-context";
import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );
  return (
    <KindeProvider>
      <QueryClientProvider client={queryClient}>
        <StoresProvider>{children}</StoresProvider>
      </QueryClientProvider>
    </KindeProvider>
  );
}
