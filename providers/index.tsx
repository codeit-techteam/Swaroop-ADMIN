"use client";

import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/auth-store";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const finish = () => useAuthStore.getState().setHydrated();
    const unsub = useAuthStore.persist.onFinishHydration(finish);
    if (useAuthStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
