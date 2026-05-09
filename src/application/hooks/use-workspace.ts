"use client";

import { useStores } from "@app/stores/store-context";
import { useEffect } from "react";

/** Hydrates workspace state once on mount and returns the store hook. */
export function useWorkspaceStore() {
  const { workspaceStore } = useStores();
  useEffect(() => {
    workspaceStore.getState().hydrate();
    const unsub = workspaceStore.subscribe(() => {
      // No-op; presence ensures the store stays alive.
    });
    return unsub;
  }, [workspaceStore]);
  return workspaceStore;
}

export function useActiveWorkspace() {
  const store = useWorkspaceStore();
  return store((s) => {
    const id = s.activeWorkspaceId;
    if (!id) return null;
    return s.workspaces.find((w) => w.id === id) ?? null;
  });
}
