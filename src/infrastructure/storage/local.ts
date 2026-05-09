// localStorage adapter with Zod-validated schema, versioned migrations, and
// graceful degradation when storage is unavailable (SSR, private mode, quota).

import { LIMITS, STORAGE_KEYS } from "@config/index";
import { ensureValidActiveWorkspace } from "@domain/workspace/operations";
import { createLogger } from "@infra/logger/index";
import { StorageStateV2Schema, type StorageStateV2 } from "@schemas/storage";
import type { Workspace, WorkspaceState } from "@schemas/workspace";

const log = createLogger("storage.local");

export interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  // Iteration is provided so tests can enumerate; not strictly required.
  readonly length?: number;
  key?(index: number): string | null;
}

export interface StorageAdapterOptions {
  storage?: LocalStorageLike;
  /** Override for the device id (testing). */
  deviceIdProvider?: () => string;
  /** Override for the current ISO timestamp (testing). */
  now?: () => string;
}

function safeGetStorage(provided?: LocalStorageLike): LocalStorageLike | null {
  if (provided) return provided;
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // Some environments (server, private mode) throw on access.
  }
  return null;
}

function getOrCreateDeviceId(storage: LocalStorageLike, override?: () => string): string {
  try {
    const existing = storage.getItem(STORAGE_KEYS.deviceId);
    if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  } catch {
    /* ignored */
  }
  const id = override ? override() : (globalThis.crypto?.randomUUID?.() ?? fallbackUuid());
  try {
    storage.setItem(STORAGE_KEYS.deviceId, id);
  } catch {
    /* in-memory only */
  }
  return id;
}

function fallbackUuid(): string {
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
}

function quarantine(storage: LocalStorageLike, raw: string, reason: string) {
  const key = `${LIMITS.storageQuarantinePrefix}${Date.now()}`;
  try {
    storage.setItem(key, JSON.stringify({ reason, raw }).slice(0, 64_000));
  } catch {
    /* drop on the floor — at least log */
  }
  log.warn("quarantined corrupt storage entry", { key, reason });
}

export interface StorageAdapter {
  load(): WorkspaceState;
  save(state: WorkspaceState): { ok: boolean; error?: "quota" | "denied" | "unavailable" };
  clear(): void;
  /**
   * Subscribes to cross-tab updates. Returns an unsubscribe function.
   */
  subscribe(handler: (next: WorkspaceState) => void): () => void;
}

const FALLBACK_STATE = (): WorkspaceState => {
  const fixed = ensureValidActiveWorkspace({ workspaces: [], activeWorkspaceId: null });
  return fixed;
};

export function createStorageAdapter(opts: StorageAdapterOptions = {}): StorageAdapter {
  const storage = safeGetStorage(opts.storage);
  const now = opts.now ?? (() => new Date().toISOString());

  const load = (): WorkspaceState => {
    if (!storage) {
      log.warn("localStorage unavailable; using in-memory defaults");
      return FALLBACK_STATE();
    }
    // Try v2 first.
    let raw: string | null = null;
    try {
      raw = storage.getItem(STORAGE_KEYS.v2);
    } catch (e) {
      log.warn("storage read denied", { error: String(e) });
      return FALLBACK_STATE();
    }
    if (raw) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        quarantine(storage, raw, "json_parse");
        return FALLBACK_STATE();
      }
      const result = StorageStateV2Schema.safeParse(parsed);
      if (!result.success) {
        // Schema-mismatched. Try a per-workspace recovery before quarantining
        // the whole state.
        const recovered = recoverFromPartial(parsed);
        if (recovered) return ensureValidActiveWorkspace(recovered);
        quarantine(storage, raw, `schema:${result.error.issues[0]?.message ?? "unknown"}`);
        return FALLBACK_STATE();
      }
      return ensureValidActiveWorkspace({
        workspaces: result.data.workspaces,
        activeWorkspaceId: result.data.activeWorkspaceId,
      });
    }
    // Fall back to v1 legacy migration.
    const v1 = readLegacyV1(storage);
    if (v1) {
      const fixed = ensureValidActiveWorkspace(v1);
      const ok = save(fixed);
      if (ok.ok) {
        // Successful migration → clear legacy keys.
        try {
          storage.removeItem(STORAGE_KEYS.legacyWorkspaces);
          storage.removeItem(STORAGE_KEYS.legacyActiveWorkspace);
        } catch {
          /* ignored */
        }
      }
      return fixed;
    }
    return FALLBACK_STATE();
  };

  const save = (
    state: WorkspaceState,
  ): { ok: boolean; error?: "quota" | "denied" | "unavailable" } => {
    if (!storage) return { ok: false, error: "unavailable" };
    const deviceId = getOrCreateDeviceId(storage, opts.deviceIdProvider);
    const blob: StorageStateV2 = {
      v: 2,
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
      updatedAt: now(),
      deviceId,
    };
    try {
      storage.setItem(STORAGE_KEYS.v2, JSON.stringify(blob));
      return { ok: true };
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name === "QuotaExceededError") {
        log.error("localStorage quota exceeded");
        return { ok: false, error: "quota" };
      }
      log.warn("storage write denied", { error: String(e) });
      return { ok: false, error: "denied" };
    }
  };

  const clear = () => {
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEYS.v2);
    } catch {
      /* ignored */
    }
  };

  const subscribe = (handler: (next: WorkspaceState) => void): (() => void) => {
    if (typeof window === "undefined") return () => {};
    const listener = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.v2 || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        const result = StorageStateV2Schema.safeParse(parsed);
        if (result.success) {
          handler(
            ensureValidActiveWorkspace({
              workspaces: result.data.workspaces,
              activeWorkspaceId: result.data.activeWorkspaceId,
            }),
          );
        }
      } catch {
        /* ignored */
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  };

  return { load, save, clear, subscribe };
}

function recoverFromPartial(parsed: unknown): WorkspaceState | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = parsed as any;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.workspaces)) return null;
  const workspaces: Workspace[] = [];
  for (const candidate of obj.workspaces) {
    const result = StorageStateV2Schema.shape.workspaces.element.safeParse(candidate);
    if (result.success) workspaces.push(result.data);
  }
  if (workspaces.length === 0) return null;
  const activeId =
    typeof obj.activeWorkspaceId === "string" &&
    workspaces.some((w) => w.id === obj.activeWorkspaceId)
      ? obj.activeWorkspaceId
      : workspaces[0]!.id;
  return { workspaces, activeWorkspaceId: activeId };
}

function readLegacyV1(storage: LocalStorageLike): WorkspaceState | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEYS.legacyWorkspaces);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  // Best-effort: drop entries that don't look like workspaces, normalize
  // dates and ids.
  const workspaces: Workspace[] = [];
  for (const w of parsed) {
    if (!w || typeof w !== "object") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = w as any;
    const candidate = {
      id: typeof obj.id === "string" && /[0-9a-f-]{8,}/.test(obj.id) ? obj.id : crypto.randomUUID(),
      name: typeof obj.name === "string" ? obj.name : "Workspace",
      description: typeof obj.description === "string" ? obj.description : undefined,
      color: typeof obj.color === "string" ? obj.color : "blue",
      icon: typeof obj.icon === "string" ? obj.icon : "User",
      timezones: Array.isArray(obj.timezones)
        ? obj.timezones
            .filter((tz: unknown) => tz && typeof tz === "object")
            .map((tz: unknown) => normaliseLegacyTimezone(tz))
            .filter((tz: unknown): tz is NonNullable<typeof tz> => tz !== null)
        : [],
      referenceTimezone: obj.referenceTimezone
        ? normaliseLegacyTimezone(obj.referenceTimezone) ?? undefined
        : undefined,
      createdAt: parseDate(obj.createdAt),
      updatedAt: parseDate(obj.updatedAt),
    };
    const result = StorageStateV2Schema.shape.workspaces.element.safeParse(candidate);
    if (result.success) workspaces.push(result.data);
  }
  if (workspaces.length === 0) return null;
  let activeId: string | null = null;
  try {
    activeId = storage.getItem(STORAGE_KEYS.legacyActiveWorkspace);
  } catch {
    activeId = null;
  }
  if (!activeId || !workspaces.some((w) => w.id === activeId)) {
    activeId = workspaces[0]!.id;
  }
  return { workspaces, activeWorkspaceId: activeId };
}

function parseDate(raw: unknown): string {
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseLegacyTimezone(raw: any) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.timezone !== "string") return null;
  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    city: typeof raw.city === "string" ? raw.city : "Unknown",
    country: typeof raw.country === "string" ? raw.country : "Unknown",
    timezone: raw.timezone,
    offsetMinutes:
      typeof raw.offsetMinutes === "number"
        ? raw.offsetMinutes
        : typeof raw.offset === "number"
          ? raw.offset
          : 0,
    kind: raw.isAbbreviation ? ("abbreviation" as const) : ("city" as const),
    abbreviation: typeof raw.abbreviation === "string" ? raw.abbreviation : undefined,
    region: typeof raw.region === "string" ? raw.region : undefined,
  };
}
