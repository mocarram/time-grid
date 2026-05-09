import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWorkspaceStore, buildTimezone } from "@app/stores/workspace-store";
import { createStorageAdapter } from "@infra/storage/local";
import { InMemoryStorage } from "@infra/storage/memory";

function setup() {
  const storage = new InMemoryStorage();
  const adapter = createStorageAdapter({
    storage,
    deviceIdProvider: () => "00000000-0000-4000-8000-000000000000",
  });
  const errors: { error: string; message?: string }[] = [];
  const store = createWorkspaceStore({
    storage: adapter,
    onError: (error, message) => errors.push({ error, message }),
  });
  store.getState().hydrate();
  return { storage, adapter, store, errors };
}

describe("workspaceStore - hydration", () => {
  it("creates a default workspace on first hydrate", () => {
    const { store } = setup();
    const state = store.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0]!.name).toBe("Personal");
    expect(state.activeWorkspaceId).toBe(state.workspaces[0]!.id);
    expect(state.hydrated).toBe(true);
  });

  it("idempotent: second hydrate is a no-op", () => {
    const { store } = setup();
    const before = store.getState().workspaces[0]!.id;
    store.getState().hydrate();
    expect(store.getState().workspaces[0]!.id).toBe(before);
  });
});

describe("workspaceStore - workspace ops", () => {
  it("creates and switches to a new workspace", () => {
    const { store } = setup();
    const id = store.getState().createWorkspace({ name: "Travel", color: "orange", icon: "Plane" });
    expect(id).not.toBeNull();
    expect(store.getState().activeWorkspaceId).toBe(id);
    expect(store.getState().workspaces).toHaveLength(2);
  });

  it("rejects creating a workspace with invalid color", () => {
    const { store, errors } = setup();
    expect(() =>
      // @ts-expect-error - invalid color
      store.getState().createWorkspace({ name: "X", color: "neon", icon: "Star" }),
    ).toThrow();
    expect(errors).toEqual([]);
  });

  it("updates a workspace name", () => {
    const { store } = setup();
    const id = store.getState().workspaces[0]!.id;
    expect(store.getState().updateWorkspace(id, { name: "Home" })).toBe(true);
    expect(store.getState().workspaces[0]!.name).toBe("Home");
  });

  it("rejects renaming with a whitespace-only name", () => {
    const { store } = setup();
    const id = store.getState().workspaces[0]!.id;
    expect(() => store.getState().updateWorkspace(id, { name: "   " })).toThrow();
  });

  it("rejects deletion of the last workspace", () => {
    const { store, errors } = setup();
    const id = store.getState().workspaces[0]!.id;
    expect(store.getState().deleteWorkspace(id)).toBe(false);
    expect(errors[0]?.error).toBe("last_workspace");
  });

  it("falls back to first remaining when active is deleted", () => {
    const { store } = setup();
    const a = store.getState().workspaces[0]!.id;
    const b = store.getState().createWorkspace({ name: "B", color: "green", icon: "Plane" })!;
    store.getState().setActiveWorkspace(b);
    expect(store.getState().deleteWorkspace(b)).toBe(true);
    expect(store.getState().activeWorkspaceId).toBe(a);
  });
});

describe("workspaceStore - timezone ops", () => {
  it("adds and removes a timezone", () => {
    const { store } = setup();
    const tz = buildTimezone({ city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" });
    expect(store.getState().addTimezone(tz)).toBe(true);
    const ws = store.getState().workspaces[0]!;
    expect(ws.timezones).toHaveLength(1);
    expect(store.getState().removeTimezone(tz.id)).toBe(true);
    expect(store.getState().workspaces[0]!.timezones).toHaveLength(0);
  });

  it("rejects duplicate timezones", () => {
    const { store, errors } = setup();
    const tz = buildTimezone({ city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" });
    expect(store.getState().addTimezone(tz)).toBe(true);
    const dupe = buildTimezone({ city: "TOKYO", country: "Japan", timezone: "Asia/Tokyo" });
    expect(store.getState().addTimezone(dupe)).toBe(false);
    expect(errors.some((e) => e.error === "duplicate")).toBe(true);
  });

  it("reorders within bounds", () => {
    const { store } = setup();
    const a = buildTimezone({ city: "A", country: "X", timezone: "UTC" });
    const b = buildTimezone({ city: "B", country: "X", timezone: "Asia/Tokyo" });
    const c = buildTimezone({ city: "C", country: "X", timezone: "Europe/London" });
    store.getState().addTimezone(a);
    store.getState().addTimezone(b);
    store.getState().addTimezone(c);
    expect(store.getState().reorderTimezones(2, 0)).toBe(true);
    expect(store.getState().workspaces[0]!.timezones.map((t) => t.city)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("rejects out-of-bounds reorder", () => {
    const { store, errors } = setup();
    expect(store.getState().reorderTimezones(0, 99)).toBe(false);
    expect(errors[0]?.error).toBe("out_of_bounds");
  });

  it("setReferenceTimezone moves previous reference into list", () => {
    const { store } = setup();
    const tokyo = buildTimezone({ city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" });
    const london = buildTimezone({ city: "London", country: "UK", timezone: "Europe/London" });
    store.getState().setReferenceTimezone(london);
    store.getState().addTimezone(tokyo);
    store.getState().setReferenceTimezone(tokyo);
    expect(store.getState().workspaces[0]!.referenceTimezone?.id).toBe(tokyo.id);
    expect(store.getState().workspaces[0]!.timezones[0]!.id).toBe(london.id);
  });
});

describe("workspaceStore - persistence", () => {
  it("persists across re-hydration", () => {
    const storage = new InMemoryStorage();
    const adapter = createStorageAdapter({
      storage,
      deviceIdProvider: () => "00000000-0000-4000-8000-000000000000",
    });
    const a = createWorkspaceStore({ storage: adapter });
    a.getState().hydrate();
    a.getState().createWorkspace({ name: "Travel", color: "orange", icon: "Plane" });
    // Fresh store from same storage should see it.
    const b = createWorkspaceStore({ storage: adapter });
    b.getState().hydrate();
    expect(b.getState().workspaces.find((w) => w.name === "Travel")).toBeDefined();
  });
});

describe("workspaceStore - replaceState", () => {
  it("repairs invalid active id", () => {
    const { store } = setup();
    store.getState().replaceState({
      workspaces: store.getState().workspaces,
      activeWorkspaceId: "missing-id",
    });
    expect(store.getState().activeWorkspaceId).toBe(store.getState().workspaces[0]!.id);
  });
});

describe("workspaceStore - error callback fires", () => {
  it("on quota exceeded, error callback fires with quota", () => {
    const onError = vi.fn();
    const adapter = {
      load: () => ({
        workspaces: [],
        activeWorkspaceId: null,
      }),
      save: () => ({ ok: false as const, error: "quota" as const }),
      clear: () => {},
      subscribe: () => () => {},
    };
    const store = createWorkspaceStore({ storage: adapter, onError });
    store.getState().hydrate();
    store.getState().createWorkspace({ name: "X", color: "blue", icon: "Star" });
    expect(onError).toHaveBeenCalledWith("quota");
  });
});
