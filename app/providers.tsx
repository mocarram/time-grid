"use client";

import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <KindeProvider>
      {children}
      <Toaster />
    </KindeProvider>
  );
}
