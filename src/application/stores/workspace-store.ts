// The single source of truth for workspaces and their timezones, persisted
// via the storage adapter. UI consumes this through selector hooks.

import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
  addTimezoneToWorkspace as addTimezoneOp,
  addWorkspaceToState,
  buildTimezoneData,
  createDefaultWorkspace,
  createWorkspace,
  deleteWorkspaceFromState,
  ensureValidActiveWorkspace,
  removeTimezoneFromWorkspace as removeTimezoneOp,
  reorderTimezones as reorderTimezonesOp,
  setActiveWorkspaceInState,
  setReferenceTimezone as setReferenceOp,
  updateWorkspaceInState,
} from "@domain/workspace/operations";
import type { TimezoneData } from "@schemas/timezone";
import {
  WorkspaceCreateInputSchema,
  WorkspaceUpdateInputSchema,
} from "@schemas/workspace";
import type {
  Workspace,
  WorkspaceCreateInput,
  WorkspaceState,
  WorkspaceUpdateInput,
} from "@schemas/workspace";

import type { StorageAdapter } from "@infra/storage/local";

export interface WorkspaceStoreState extends WorkspaceState {
  hydrated: boolean;
  hydrate: () => void;
  // Workspace ops
  createWorkspace: (input: WorkspaceCreateInput) => string | null;
  updateWorkspace: (id: string, updates: WorkspaceUpdateInput) => boolean;
  deleteWorkspace: (id: string) => boolean;
  setActiveWorkspace: (id: string) => boolean;
  // Timezone ops within active workspace
  addTimezone: (timezone: TimezoneData) => boolean;
  removeTimezone: (timezoneId: string) => boolean;
  reorderTimezones: (fromIndex: number, toIndex: number) => boolean;
  setReferenceTimezone: (timezone: TimezoneData) => boolean;
  // Bulk ops
  replaceState: (state: WorkspaceState) => void;
}

export interface CreateWorkspaceStoreOptions {
  storage: StorageAdapter;
  onError?: (error: string, message?: string) => void;
}

export function createWorkspaceStore(opts: CreateWorkspaceStoreOptions) {
  const { storage, onError } = opts;

  const persist = (state: WorkspaceState) => {
    const result = storage.save(state);
    if (!result.ok) onError?.(result.error ?? "save_failed");
  };

  const update = (
    state: WorkspaceStoreState,
    next: WorkspaceState,
  ): Partial<WorkspaceStoreState> => {
    persist(next);
    return next;
  };

  return create<WorkspaceStoreState>()(
    devtools(
      (set, get) => ({
        workspaces: [],
        activeWorkspaceId: null,
        hydrated: false,

        hydrate: () => {
          if (get().hydrated) return;
          const loaded = storage.load();
          set({ ...loaded, hydrated: true }, false, "hydrate");
        },

        createWorkspace: (input) => {
          const validated = WorkspaceCreateInputSchema.safeParse(input);
          if (!validated.success) {
            const issue = validated.error.issues[0]?.message ?? "invalid_input";
            throw new RangeError(`createWorkspace: ${issue}`);
          }
          const ws = createWorkspace(validated.data);
          const next = addWorkspaceToState(get(), ws);
          if (!next.ok) {
            onError?.(next.error, next.message);
            return null;
          }
          set(update(get(), next.value), false, "createWorkspace");
          return ws.id;
        },

        updateWorkspace: (id, updates) => {
          const validated = WorkspaceUpdateInputSchema.safeParse(updates);
          if (!validated.success) {
            const issue = validated.error.issues[0]?.message ?? "invalid_input";
            throw new RangeError(`updateWorkspace: ${issue}`);
          }
          const next = updateWorkspaceInState(get(), id, validated.data);
          if (!next.ok) {
            onError?.(next.error, next.message);
            return false;
          }
          set(update(get(), next.value), false, "updateWorkspace");
          return true;
        },

        deleteWorkspace: (id) => {
          const next = deleteWorkspaceFromState(get(), id);
          if (!next.ok) {
            onError?.(next.error, next.message);
            return false;
          }
          set(update(get(), next.value), false, "deleteWorkspace");
          return true;
        },

        setActiveWorkspace: (id) => {
          const next = setActiveWorkspaceInState(get(), id);
          if (!next.ok) {
            onError?.(next.error, next.message);
            return false;
          }
          set(update(get(), next.value), false, "setActiveWorkspace");
          return true;
        },

        addTimezone: (timezone) =>
          updateActive(get, set, persist, onError, "addTimezone", (ws) =>
            addTimezoneOp(ws, timezone),
          ),

        removeTimezone: (timezoneId) =>
          updateActive(get, set, persist, onError, "removeTimezone", (ws) =>
            removeTimezoneOp(ws, timezoneId),
          ),

        reorderTimezones: (fromIndex, toIndex) =>
          updateActive(get, set, persist, onError, "reorderTimezones", (ws) =>
            reorderTimezonesOp(ws, fromIndex, toIndex),
          ),

        setReferenceTimezone: (timezone) =>
          updateActive(get, set, persist, onError, "setReferenceTimezone", (ws) =>
            setReferenceOp(ws, timezone),
          ),

        replaceState: (state) => {
          const fixed = ensureValidActiveWorkspace(state);
          set({ ...fixed }, false, "replaceState");
          persist(fixed);
        },
      }),
      { name: "workspace-store", enabled: process.env.NODE_ENV !== "production" },
    ),
  );
}

function updateActive(
  get: () => WorkspaceStoreState,
  set: (
    partial: Partial<WorkspaceStoreState>,
    replace?: false,
    actionName?: string,
  ) => void,
  persist: (state: WorkspaceState) => void,
  onError: ((error: string, message?: string) => void) | undefined,
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  op: (ws: Workspace) => { ok: true; value: Workspace } | { ok: false; error: string; message?: string },
): boolean {
  const state = get();
  if (!state.activeWorkspaceId) return false;
  const idx = state.workspaces.findIndex((w) => w.id === state.activeWorkspaceId);
  if (idx < 0) return false;
  const result = op(state.workspaces[idx]!);
  if (!result.ok) {
    onError?.(result.error, result.message);
    return false;
  }
  const workspaces = [...state.workspaces];
  workspaces[idx] = result.value;
  const next = { workspaces, activeWorkspaceId: state.activeWorkspaceId };
  set(next, false, action);
  persist(next);
  return true;
}

// Convenience: build TimezoneData from a partial input.
export const buildTimezone = buildTimezoneData;
export const defaultWorkspace = createDefaultWorkspace;
