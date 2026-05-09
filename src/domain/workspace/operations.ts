// Pure operations on Workspace and WorkspaceState. No React, no I/O.
// Each operation returns a new value (immutable) and surfaces failures via
// a discriminated `Result` so callers can show toasts for errors.

import { LIMITS } from "@config/index";
import { isValidIanaZone } from "@domain/timezone/iana";
import { offsetMinutesAt } from "@domain/timezone/offset";
import type { TimezoneData } from "@schemas/timezone";
import type {
  Workspace,
  WorkspaceCreateInput,
  WorkspaceState,
  WorkspaceUpdateInput,
} from "@schemas/workspace";

export type Result<T, E extends string = string> =
  | { ok: true; value: T }
  | { ok: false; error: E; message?: string };

const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const err = (error: string, message?: string): Result<never> => ({
  ok: false,
  error,
  message,
});

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // RFC 4122 v4 fallback (used only when crypto.randomUUID is missing — rare).
  const r = (n: number) => Math.floor(Math.random() * n);
  const hex = (n: number, len: number) => n.toString(16).padStart(len, "0");
  return `${hex(r(2 ** 32), 8)}-${hex(r(2 ** 16), 4)}-${hex(0x4000 | r(0x0fff), 4)}-${hex(0x8000 | r(0x3fff), 4)}-${hex(r(2 ** 32), 8)}${hex(r(2 ** 16), 4)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createDefaultWorkspace(): Workspace {
  const now = nowIso();
  return {
    id: newId(),
    name: "Personal",
    description: "Your personal timezone collection",
    color: "blue",
    icon: "User",
    timezones: [],
    referenceTimezone: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function createWorkspace(input: WorkspaceCreateInput): Workspace {
  const now = nowIso();
  return {
    id: newId(),
    name: input.name,
    description: input.description,
    color: input.color,
    icon: input.icon,
    timezones: [],
    referenceTimezone: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function addWorkspaceToState(
  state: WorkspaceState,
  workspace: Workspace,
): Result<WorkspaceState> {
  if (state.workspaces.length >= LIMITS.workspacesPerUserMax) {
    return err("workspaces_full", `max ${LIMITS.workspacesPerUserMax} workspaces`);
  }
  return ok({
    workspaces: [...state.workspaces, workspace],
    activeWorkspaceId: workspace.id, // newly created becomes active
  });
}

export function updateWorkspaceInState(
  state: WorkspaceState,
  id: string,
  updates: WorkspaceUpdateInput,
): Result<WorkspaceState> {
  const idx = state.workspaces.findIndex((w) => w.id === id);
  if (idx < 0) return err("not_found", `workspace ${id}`);
  const current = state.workspaces[idx]!;
  const next: Workspace = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
  };
  const workspaces = [...state.workspaces];
  workspaces[idx] = next;
  return ok({ ...state, workspaces });
}

export function deleteWorkspaceFromState(
  state: WorkspaceState,
  id: string,
): Result<WorkspaceState> {
  if (state.workspaces.length <= LIMITS.workspaceMin) {
    return err("last_workspace", "at least one workspace must remain");
  }
  const filtered = state.workspaces.filter((w) => w.id !== id);
  if (filtered.length === state.workspaces.length) return err("not_found", `workspace ${id}`);
  let activeWorkspaceId = state.activeWorkspaceId;
  if (activeWorkspaceId === id) {
    activeWorkspaceId = filtered[0]!.id;
  }
  return ok({ workspaces: filtered, activeWorkspaceId });
}

export function setActiveWorkspaceInState(
  state: WorkspaceState,
  id: string,
): Result<WorkspaceState> {
  if (!state.workspaces.some((w) => w.id === id)) return err("not_found", `workspace ${id}`);
  return ok({ ...state, activeWorkspaceId: id });
}

export function addTimezoneToWorkspace(
  workspace: Workspace,
  timezone: TimezoneData,
): Result<Workspace> {
  if (!isValidIanaZone(timezone.timezone)) return err("invalid_timezone", timezone.timezone);
  if (workspace.timezones.length >= LIMITS.timezonesPerWorkspaceMax) {
    return err("timezones_full", `max ${LIMITS.timezonesPerWorkspaceMax} timezones`);
  }
  // Duplicate against existing list (case-insensitive city+country and same kind).
  const isDup = workspace.timezones.some((t) => isSameLocation(t, timezone));
  if (isDup) return err("duplicate", `${timezone.city}, ${timezone.country}`);
  // Duplicate against the reference (unless reference is auto-detected "local").
  const ref = workspace.referenceTimezone;
  if (ref && ref.id !== "local" && isSameLocation(ref, timezone)) {
    return err("duplicate_of_reference", `${timezone.city}, ${timezone.country}`);
  }
  return ok({
    ...workspace,
    timezones: [...workspace.timezones, timezone],
    updatedAt: nowIso(),
  });
}

export function removeTimezoneFromWorkspace(
  workspace: Workspace,
  timezoneId: string,
): Result<Workspace> {
  const filtered = workspace.timezones.filter((t) => t.id !== timezoneId);
  if (filtered.length === workspace.timezones.length) return err("not_found", timezoneId);
  return ok({
    ...workspace,
    timezones: filtered,
    updatedAt: nowIso(),
  });
}

export function reorderTimezones(
  workspace: Workspace,
  fromIndex: number,
  toIndex: number,
): Result<Workspace> {
  const len = workspace.timezones.length;
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    fromIndex >= len ||
    toIndex < 0 ||
    toIndex >= len
  ) {
    return err("out_of_bounds", `from=${fromIndex} to=${toIndex} len=${len}`);
  }
  if (fromIndex === toIndex) return ok(workspace);
  const next = [...workspace.timezones];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return err("out_of_bounds", `from=${fromIndex}`);
  next.splice(toIndex, 0, moved);
  return ok({ ...workspace, timezones: next, updatedAt: nowIso() });
}

/**
 * Promote a secondary timezone to be the workspace reference. The current
 * reference (if any) is moved into the secondary list. The same instant is
 * preserved by the caller — this operation only reshuffles structure.
 */
export function setReferenceTimezone(
  workspace: Workspace,
  timezone: TimezoneData,
): Result<Workspace> {
  if (workspace.referenceTimezone?.id === timezone.id) return ok(workspace);
  const previous = workspace.referenceTimezone;
  // Remove the candidate from the secondary list if it was there.
  const remaining = workspace.timezones.filter((t) => t.id !== timezone.id);
  // Append the previous reference (if not the same and not already present).
  const next =
    previous && previous.id !== timezone.id && !remaining.some((t) => isSameLocation(t, previous))
      ? [...remaining, previous]
      : remaining;
  return ok({
    ...workspace,
    referenceTimezone: timezone,
    timezones: next,
    updatedAt: nowIso(),
  });
}

export function clearReferenceTimezone(workspace: Workspace): Workspace {
  return { ...workspace, referenceTimezone: undefined, updatedAt: nowIso() };
}

/**
 * Build a TimezoneData from the minimal triple (city/country/zone) that comes
 * from URL share or popular-cities pick. Computes offset for "now".
 */
export function buildTimezoneData(input: {
  id?: string;
  city: string;
  country: string;
  timezone: string;
  kind?: "city" | "abbreviation";
  abbreviation?: string;
  region?: string;
}): TimezoneData {
  const id = input.id ?? newId();
  return {
    id,
    city: input.city.trim(),
    country: input.country.trim(),
    timezone: input.timezone,
    offsetMinutes: offsetMinutesAt(input.timezone),
    kind: input.kind ?? "city",
    abbreviation: input.abbreviation,
    region: input.region,
  };
}

export function isSameLocation(a: TimezoneData, b: TimezoneData): boolean {
  return (
    a.city.toLowerCase() === b.city.toLowerCase() &&
    a.country.toLowerCase() === b.country.toLowerCase() &&
    a.kind === b.kind
  );
}

export function ensureValidActiveWorkspace(state: WorkspaceState): WorkspaceState {
  if (state.workspaces.length === 0) {
    const def = createDefaultWorkspace();
    return { workspaces: [def], activeWorkspaceId: def.id };
  }
  if (
    !state.activeWorkspaceId ||
    !state.workspaces.some((w) => w.id === state.activeWorkspaceId)
  ) {
    return { ...state, activeWorkspaceId: state.workspaces[0]!.id };
  }
  return state;
}
