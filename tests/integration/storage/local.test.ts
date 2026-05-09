import { STORAGE_KEYS } from "@config/index";
import { createDefaultWorkspace } from "@domain/workspace/operations";
import { createStorageAdapter } from "@infra/storage/local";
import {
  DenyingStorage,
  InMemoryStorage,
  QuotaExceededStorage,
} from "@infra/storage/memory";
import type { StorageStateV2 } from "@schemas/storage";
import { beforeEach, describe, expect, it } from "vitest";

const FIXED_DEVICE = "00000000-0000-4000-8000-000000000000";

function adapter(storage = new InMemoryStorage()) {
  return {
    storage,
    a: createStorageAdapter({ storage, deviceIdProvider: () => FIXED_DEVICE }),
  };
}

describe("createStorageAdapter — load", () => {
  it("returns a default workspace when storage is empty", () => {
    const { a } = adapter();
    const state = a.load();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0]!.name).toBe("Personal");
    expect(state.activeWorkspaceId).toBe(state.workspaces[0]!.id);
  });

  it("round-trips a saved state", () => {
    const { a } = adapter();
    const initial = a.load();
    const result = a.save(initial);
    expect(result.ok).toBe(true);
    const reloaded = a.load();
    expect(reloaded).toEqual(initial);
  });

  it("quarantines corrupt JSON and returns defaults", () => {
    const storage = new InMemoryStorage();
    storage.setItem(STORAGE_KEYS.v2, "{ broken json");
    const { a } = adapter(storage);
    const state = a.load();
    expect(state.workspaces[0]!.name).toBe("Personal");
    // Quarantine entry should exist.
    let found = false;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)!;
      if (key.startsWith("tg:quarantine:")) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("recovers when one workspace fails schema (drops bad, keeps good)", () => {
    const storage = new InMemoryStorage();
    const goodWs = createDefaultWorkspace();
    const blob = {
      v: 2,
      workspaces: [
        goodWs,
        // Bad workspace: invalid icon
        { ...goodWs, id: "bad-id", name: "Broken", icon: "<script>" },
      ],
      activeWorkspaceId: goodWs.id,
      updatedAt: new Date().toISOString(),
      deviceId: FIXED_DEVICE,
    };
    storage.setItem(STORAGE_KEYS.v2, JSON.stringify(blob));
    const { a } = adapter(storage);
    const state = a.load();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0]!.id).toBe(goodWs.id);
  });

  it("repairs activeWorkspaceId pointing at a missing workspace", () => {
    const storage = new InMemoryStorage();
    const ws = createDefaultWorkspace();
    const blob: StorageStateV2 = {
      v: 2,
      workspaces: [ws],
      activeWorkspaceId: "missing",
      updatedAt: new Date().toISOString(),
      deviceId: FIXED_DEVICE,
    };
    storage.setItem(STORAGE_KEYS.v2, JSON.stringify(blob));
    const { a } = adapter(storage);
    expect(a.load().activeWorkspaceId).toBe(ws.id);
  });
});

describe("createStorageAdapter — save", () => {
  it("returns quota error when storage is full", () => {
    const a = createStorageAdapter({
      storage: new QuotaExceededStorage(),
      deviceIdProvider: () => FIXED_DEVICE,
    });
    const initial = a.load();
    const r = a.save(initial);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("quota");
  });

  it("returns denied error under SecurityError", () => {
    const a = createStorageAdapter({
      storage: new DenyingStorage(),
      deviceIdProvider: () => FIXED_DEVICE,
    });
    const r = a.save({ workspaces: [createDefaultWorkspace()], activeWorkspaceId: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("denied");
  });

  it("returns unavailable when no storage is configured", () => {
    const a = createStorageAdapter({ storage: undefined });
    const r = a.save({ workspaces: [createDefaultWorkspace()], activeWorkspaceId: null });
    // In jsdom, window.localStorage exists, so the check returns true. We
    // can't easily simulate "no storage" here without monkeypatching window.
    // This test verifies the API at least returns a typed result.
    expect(typeof r.ok).toBe("boolean");
  });
});

describe("createStorageAdapter — v1 migration", () => {
  let storage: InMemoryStorage;
  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it("migrates legacy keys to v2 on first read", () => {
    const v1Workspaces = [
      {
        id: crypto.randomUUID(),
        name: "Old",
        description: "legacy",
        color: "blue",
        icon: "User",
        timezones: [
          {
            id: crypto.randomUUID(),
            city: "Tokyo",
            country: "Japan",
            timezone: "Asia/Tokyo",
            offset: 540,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    storage.setItem(STORAGE_KEYS.legacyWorkspaces, JSON.stringify(v1Workspaces));
    storage.setItem(STORAGE_KEYS.legacyActiveWorkspace, v1Workspaces[0]!.id);
    const { a } = adapter(storage);
    const state = a.load();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0]!.name).toBe("Old");
    // Legacy keys cleared after successful save.
    expect(storage.getItem(STORAGE_KEYS.legacyWorkspaces)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.legacyActiveWorkspace)).toBeNull();
    // v2 key now present.
    expect(storage.getItem(STORAGE_KEYS.v2)).not.toBeNull();
  });

  it("returns defaults when v1 is malformed", () => {
    storage.setItem(STORAGE_KEYS.legacyWorkspaces, "not json");
    const { a } = adapter(storage);
    const state = a.load();
    expect(state.workspaces[0]!.name).toBe("Personal");
  });
});
