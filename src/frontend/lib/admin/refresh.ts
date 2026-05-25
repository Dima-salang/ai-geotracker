"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

export function useAdminRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);
  return { refresh, pending };
}
