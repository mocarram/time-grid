"use client";

import { useStores } from "@app/stores/store-context";
import { createSyncEngine, type SyncEvent } from "@app/sync/engine";
import { ensureValidActiveWorkspace } from "@domain/workspace/operations";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useEffect, useMemo, useRef, useState } from "react";

export interface AuthSyncState {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: { given_name?: string | null; email?: string | null } | null;
  isSaving: boolean;
  isLoading: boolean;
  hasServerData: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  conflict: { kind: "conflict"; message: string } | null;
  saveNow: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  resolveConflictUseServer: () => Promise<void>;
  resolveConflictKeepLocal: () => Promise<void>;
}

const NO_REVISION = -1;

export function useAuthSync(): AuthSyncState {
  const { workspaceStore, userDataClient } = useStores();
  const kinde = useKindeBrowserClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasServerData, setHasServerData] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<AuthSyncState["conflict"]>(null);
  const revisionRef = useRef<number>(NO_REVISION);
  const conflictServerRef = useRef<ReturnType<typeof workspaceStore.getState>["workspaces"] | null>(null);
  const conflictActiveIdRef = useRef<string | null>(null);

  const engine = useMemo(
    () =>
      createSyncEngine({
        client: userDataClient,
        getState: () => {
          const s = workspaceStore.getState();
          return { workspaces: s.workspaces, activeWorkspaceId: s.activeWorkspaceId };
        },
        getRevision: () => revisionRef.current,
        setRevision: (r) => {
          revisionRef.current = r;
        },
        onEvent: (event: SyncEvent) => {
          if (event.kind === "started") {
            setIsSaving(true);
            setSyncError(null);
          } else if (event.kind === "succeeded") {
            setIsSaving(false);
            setLastSyncedAt(event.updatedAt);
            setHasServerData(true);
            setConflict(null);
          } else if (event.kind === "failed") {
            setIsSaving(false);
            setSyncError(event.reason);
          } else if (event.kind === "conflict") {
            setIsSaving(false);
            conflictServerRef.current = event.server.workspaces;
            conflictActiveIdRef.current = event.server.activeWorkspaceId;
            setConflict({ kind: "conflict", message: "Server has newer data" });
          }
        },
      }),
    [userDataClient, workspaceStore],
  );

  useEffect(() => () => engine.dispose(), [engine]);

  // Auto-sync on workspace state changes.
  useEffect(() => {
    if (!kinde.isAuthenticated || kinde.isLoading) return;
    const unsub = workspaceStore.subscribe((state, prev) => {
      if (
        state.workspaces !== prev.workspaces ||
        state.activeWorkspaceId !== prev.activeWorkspaceId
      ) {
        engine.scheduleSync();
      }
    });
    return unsub;
  }, [kinde.isAuthenticated, kinde.isLoading, workspaceStore, engine]);

  // On login, check server data — but never auto-load.
  useEffect(() => {
    if (!kinde.isAuthenticated || kinde.isLoading) return;
    let cancelled = false;
    void (async () => {
      const result = await userDataClient.check();
      if (cancelled) return;
      if (result.ok) {
        setHasServerData(result.value.hasData);
        setLastSyncedAt(result.value.lastSynced);
        if (typeof result.value.revision === "number") {
          revisionRef.current = result.value.revision;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kinde.isAuthenticated, kinde.isLoading, userDataClient]);

  const saveNow = async () => {
    if (!kinde.isAuthenticated) return;
    await engine.syncNow();
  };

  const loadFromServer = async () => {
    if (!kinde.isAuthenticated) return;
    setIsLoading(true);
    setSyncError(null);
    try {
      const result = await userDataClient.load();
      if (result.ok && result.value) {
        const fixed = ensureValidActiveWorkspace({
          workspaces: result.value.workspaces,
          activeWorkspaceId: result.value.activeWorkspaceId,
        });
        workspaceStore.getState().replaceState(fixed);
        revisionRef.current = result.value.revision;
        setHasServerData(true);
        setLastSyncedAt(result.value.updatedAt);
        setConflict(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resolveConflictUseServer = async () => {
    if (!conflictServerRef.current) return;
    workspaceStore.getState().replaceState({
      workspaces: conflictServerRef.current,
      activeWorkspaceId: conflictActiveIdRef.current,
    });
    setConflict(null);
    await engine.syncNow();
  };

  const resolveConflictKeepLocal = async () => {
    setConflict(null);
    await engine.syncNow();
  };

  // Reset on logout.
  useEffect(() => {
    if (!kinde.isAuthenticated) {
      revisionRef.current = NO_REVISION;
      setLastSyncedAt(null);
      setSyncError(null);
      setHasServerData(false);
      setConflict(null);
    }
  }, [kinde.isAuthenticated]);

  return {
    isAuthenticated: !!kinde.isAuthenticated,
    isAuthLoading: !!kinde.isLoading,
    user: kinde.user
      ? {
          given_name: kinde.user.given_name ?? null,
          email: kinde.user.email ?? null,
        }
      : null,
    isSaving,
    isLoading,
    hasServerData,
    lastSyncedAt,
    syncError,
    conflict,
    saveNow,
    loadFromServer,
    resolveConflictUseServer,
    resolveConflictKeepLocal,
  };
}
