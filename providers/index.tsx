"use client";

import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const finish = () => useAuthStore.getState().finishHydration();
    const unsub = useAuthStore.persist.onFinishHydration(finish);
    void useAuthStore.persist.rehydrate();
    const timer = window.setTimeout(finish, 250);
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
