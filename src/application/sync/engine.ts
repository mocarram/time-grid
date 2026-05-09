// Debounced sync engine with optimistic concurrency, exponential backoff
// retries, and a typed event stream the UI can subscribe to.

import { LIMITS } from "@config/index";
import { logger } from "@infra/logger/index";
import type { UserDataClient } from "@infra/api/user-data";
import type { UserDataV2 } from "@schemas/sync";
import type { Workspace } from "@schemas/workspace";

const log = logger.scoped("sync");

export type SyncEvent =
  | { kind: "started" }
  | { kind: "succeeded"; revision: number; updatedAt: string }
  | { kind: "failed"; reason: string; willRetry: boolean }
  | { kind: "conflict"; server: UserDataV2 };

export interface SyncEngineOptions {
  client: UserDataClient;
  /** Returns the current state to sync. */
  getState: () => { workspaces: Workspace[]; activeWorkspaceId: string | null };
  /** Returns the current revision the client believes the server is on. */
  getRevision: () => number;
  /** Setter for revision once the server confirms. */
  setRevision: (revision: number) => void;
  /** Subscribe to events. */
  onEvent?: (event: SyncEvent) => void;
  /** Debounce window for auto-sync. */
  debounceMs?: number;
  /** Override timer factory for tests. */
  timers?: TimerFactory;
}

export interface TimerFactory {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

const DEFAULT_TIMERS: TimerFactory = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface SyncEngine {
  /** Schedule a debounced sync. */
  scheduleSync: () => void;
  /** Trigger an immediate sync (cancels any pending debounce). */
  syncNow: () => Promise<void>;
  /** Cancel any pending work. */
  dispose: () => void;
}

export function createSyncEngine(opts: SyncEngineOptions): SyncEngine {
  const {
    client,
    getState,
    getRevision,
    setRevision,
    onEvent,
    debounceMs = LIMITS.syncDebounceMs,
    timers = DEFAULT_TIMERS,
  } = opts;

  let pendingTimer: unknown | null = null;
  let inFlight: Promise<void> | null = null;
  let attempt = 0;
  let disposed = false;

  const emit = (event: SyncEvent) => {
    try {
      onEvent?.(event);
    } catch (e) {
      log.warn("onEvent threw", { error: String(e) });
    }
  };

  const cancelPending = () => {
    if (pendingTimer !== null) {
      timers.clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  };

  const performSync = async (): Promise<void> => {
    if (disposed) return;
    if (inFlight) return inFlight;
    cancelPending();
    emit({ kind: "started" });
    const state = getState();
    const expectedRevision = getRevision();
    inFlight = (async () => {
      const result = await client.save(
        {
          workspaces: state.workspaces,
          activeWorkspaceId: state.activeWorkspaceId,
          expectedRevision: expectedRevision >= 0 ? expectedRevision : undefined,
        },
      );
      if (result.ok) {
        attempt = 0;
        setRevision(result.value.revision);
        emit({
          kind: "succeeded",
          revision: result.value.revision,
          updatedAt: result.value.updatedAt,
        });
        return;
      }
      const error = result.error;
      if ("kind" in error && error.kind === "conflict") {
        attempt = 0;
        setRevision(error.server.revision);
        emit({ kind: "conflict", server: error.server });
        return;
      }
      const retryable =
        "kind" in error &&
        (error.kind === "network" ||
          error.kind === "timeout" ||
          (error.kind === "http" && error.status >= 500));
      if (retryable && attempt < LIMITS.syncRetryMaxAttempts - 1) {
        attempt++;
        const delay = LIMITS.syncRetryBaseMs * 2 ** (attempt - 1);
        emit({ kind: "failed", reason: errorString(error), willRetry: true });
        pendingTimer = timers.setTimeout(() => {
          pendingTimer = null;
          inFlight = null;
          void performSync();
        }, delay);
        return;
      }
      attempt = 0;
      emit({ kind: "failed", reason: errorString(error), willRetry: false });
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    scheduleSync() {
      if (disposed) return;
      cancelPending();
      pendingTimer = timers.setTimeout(() => {
        pendingTimer = null;
        void performSync();
      }, debounceMs);
    },
    syncNow() {
      if (disposed) return Promise.resolve();
      cancelPending();
      return performSync();
    },
    dispose() {
      disposed = true;
      cancelPending();
    },
  };
}

function errorString(err: unknown): string {
  if (typeof err !== "object" || !err) return String(err);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  if (e.kind === "http") return `http_${e.status}`;
  return e.kind ?? "unknown";
}
