import { LIMITS } from "@config/index";
import {
  addTimezoneToWorkspace,
  addWorkspaceToState,
  buildTimezoneData,
  createDefaultWorkspace,
  createWorkspace,
  deleteWorkspaceFromState,
  ensureValidActiveWorkspace,
  removeTimezoneFromWorkspace,
  reorderTimezones,
  setActiveWorkspaceInState,
  setReferenceTimezone,
  updateWorkspaceInState,
} from "@domain/workspace/operations";
import type { Workspace, WorkspaceState } from "@schemas/workspace";
import { describe, expect, it } from "vitest";

const tz = (overrides: Partial<ReturnType<typeof buildTimezoneData>> = {}) => ({
  ...buildTimezoneData({
    city: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
  }),
  ...overrides,
});

const baseState = (): WorkspaceState => {
  const ws = createDefaultWorkspace();
  return { workspaces: [ws], activeWorkspaceId: ws.id };
};

describe("createDefaultWorkspace", () => {
  it("has a UUID id, the canonical name, and empty timezones", () => {
    const ws = createDefaultWorkspace();
    expect(ws.name).toBe("Personal");
    expect(ws.icon).toBe("User");
    expect(ws.color).toBe("blue");
    expect(ws.timezones).toEqual([]);
    expect(ws.referenceTimezone).toBeUndefined();
    expect(ws.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(ws.createdAt).toBe(ws.updatedAt);
  });
});

describe("createWorkspace", () => {
  it("uses the input fields", () => {
    const ws = createWorkspace({
      name: "Travel",
      description: "trips",
      color: "orange",
      icon: "Plane",
    });
    expect(ws.name).toBe("Travel");
    expect(ws.description).toBe("trips");
    expect(ws.color).toBe("orange");
    expect(ws.icon).toBe("Plane");
  });
});

describe("addWorkspaceToState", () => {
  it("appends the workspace and makes it active", () => {
    const state = baseState();
    const ws = createWorkspace({ name: "Travel", color: "orange", icon: "Plane" });
    const r = addWorkspaceToState(state, ws);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.workspaces).toHaveLength(2);
      expect(r.value.activeWorkspaceId).toBe(ws.id);
    }
  });

  it("rejects when the user is at the workspace limit", () => {
    const workspaces = Array.from({ length: LIMITS.workspacesPerUserMax }, () =>
      createDefaultWorkspace(),
    );
    const state: WorkspaceState = { workspaces, activeWorkspaceId: workspaces[0]!.id };
    const r = addWorkspaceToState(state, createWorkspace({ name: "X", color: "blue", icon: "Star" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("workspaces_full");
  });
});

describe("updateWorkspaceInState", () => {
  it("updates fields and bumps updatedAt", async () => {
    const state = baseState();
    const id = state.workspaces[0]!.id;
    await new Promise((r) => setTimeout(r, 5));
    const r = updateWorkspaceInState(state, id, { name: "Home" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const updated = r.value.workspaces[0]!;
      expect(updated.name).toBe("Home");
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(updated.createdAt).getTime(),
      );
    }
  });

  it("returns not_found for unknown id", () => {
    const r = updateWorkspaceInState(baseState(), "nope", { name: "x" });
    expect(r.ok).toBe(false);
  });
});

describe("deleteWorkspaceFromState", () => {
  it("rejects deleting the last remaining workspace", () => {
    const r = deleteWorkspaceFromState(baseState(), baseState().workspaces[0]!.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("last_workspace");
  });

  it("falls back to the first remaining when active is deleted", () => {
    const a = createDefaultWorkspace();
    const b = createWorkspace({ name: "B", color: "green", icon: "Plane" });
    const c = createWorkspace({ name: "C", color: "red", icon: "Star" });
    const state: WorkspaceState = { workspaces: [a, b, c], activeWorkspaceId: b.id };
    const r = deleteWorkspaceFromState(state, b.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.activeWorkspaceId).toBe(a.id);
  });

  it("preserves active when deleting a non-active workspace", () => {
    const a = createDefaultWorkspace();
    const b = createWorkspace({ name: "B", color: "green", icon: "Plane" });
    const state: WorkspaceState = { workspaces: [a, b], activeWorkspaceId: a.id };
    const r = deleteWorkspaceFromState(state, b.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.activeWorkspaceId).toBe(a.id);
  });

  it("returns not_found for unknown id", () => {
    const a = createDefaultWorkspace();
    const b = createWorkspace({ name: "B", color: "green", icon: "Plane" });
    const state: WorkspaceState = { workspaces: [a, b], activeWorkspaceId: a.id };
    const r = deleteWorkspaceFromState(state, "nope");
    expect(r.ok).toBe(false);
  });
});

describe("setActiveWorkspaceInState", () => {
  it("switches active id", () => {
    const a = createDefaultWorkspace();
    const b = createWorkspace({ name: "B", color: "green", icon: "Plane" });
    const state: WorkspaceState = { workspaces: [a, b], activeWorkspaceId: a.id };
    const r = setActiveWorkspaceInState(state, b.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.activeWorkspaceId).toBe(b.id);
  });

  it("rejects unknown id", () => {
    const r = setActiveWorkspaceInState(baseState(), "nope");
    expect(r.ok).toBe(false);
  });
});

describe("addTimezoneToWorkspace", () => {
  const ws = (): Workspace => createDefaultWorkspace();

  it("appends a timezone", () => {
    const r = addTimezoneToWorkspace(ws(), tz());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.timezones).toHaveLength(1);
  });

  it("rejects duplicate (case-insensitive city+country and same kind)", () => {
    const w = { ...ws(), timezones: [tz()] };
    const dupe = tz({ city: "TOKYO", country: "japan" });
    const r = addTimezoneToWorkspace(w, dupe);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("duplicate");
  });

  it("allows two cities sharing the same IANA zone", () => {
    const w = { ...ws(), timezones: [tz({ city: "Mumbai", country: "India", timezone: "Asia/Kolkata" })] };
    const second = tz({ city: "Chennai", country: "India", timezone: "Asia/Kolkata" });
    const r = addTimezoneToWorkspace(w, second);
    expect(r.ok).toBe(true);
  });

  it("rejects when matching the user-set reference", () => {
    const w: Workspace = { ...ws(), referenceTimezone: { ...tz(), id: "user-set" } };
    const r = addTimezoneToWorkspace(w, tz());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("duplicate_of_reference");
  });

  it("permits adding when reference is auto-detected (id='local')", () => {
    const w: Workspace = { ...ws(), referenceTimezone: { ...tz(), id: "local" } };
    const r = addTimezoneToWorkspace(w, tz());
    expect(r.ok).toBe(true);
  });

  it("rejects when at the per-workspace limit", () => {
    const max = LIMITS.timezonesPerWorkspaceMax;
    const w: Workspace = {
      ...ws(),
      timezones: Array.from({ length: max }, (_, i) =>
        tz({ id: `id-${i}`, city: `City${i}`, country: `Country${i}` }),
      ),
    };
    const r = addTimezoneToWorkspace(w, tz({ id: "extra", city: "Extra", country: "Country" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("timezones_full");
  });

  it("rejects invalid IANA zone", () => {
    const r = addTimezoneToWorkspace(ws(), tz({ timezone: "Mars/Olympus" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_timezone");
  });
});

describe("removeTimezoneFromWorkspace", () => {
  it("removes a timezone by id", () => {
    const w: Workspace = { ...createDefaultWorkspace(), timezones: [tz()] };
    const r = removeTimezoneFromWorkspace(w, w.timezones[0]!.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.timezones).toEqual([]);
  });

  it("returns not_found for unknown id", () => {
    const r = removeTimezoneFromWorkspace(createDefaultWorkspace(), "nope");
    expect(r.ok).toBe(false);
  });
});

describe("reorderTimezones", () => {
  const a = tz({ city: "A", country: "X" });
  const b = tz({ city: "B", country: "X" });
  const c = tz({ city: "C", country: "X" });

  it("moves an item from index 2 to 0", () => {
    const w: Workspace = { ...createDefaultWorkspace(), timezones: [a, b, c] };
    const r = reorderTimezones(w, 2, 0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.timezones.map((t) => t.city)).toEqual(["C", "A", "B"]);
  });

  it("no-op when from === to", () => {
    const w: Workspace = { ...createDefaultWorkspace(), timezones: [a, b, c] };
    const r = reorderTimezones(w, 1, 1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(w);
  });

  it("rejects out-of-bounds", () => {
    const w: Workspace = { ...createDefaultWorkspace(), timezones: [a, b, c] };
    expect(reorderTimezones(w, 5, 0).ok).toBe(false);
    expect(reorderTimezones(w, -1, 0).ok).toBe(false);
    expect(reorderTimezones(w, 0, 5).ok).toBe(false);
    expect(reorderTimezones(w, 1.5, 0).ok).toBe(false);
  });

  it("does not mutate the input", () => {
    const w: Workspace = { ...createDefaultWorkspace(), timezones: [a, b, c] };
    const original = [...w.timezones];
    reorderTimezones(w, 0, 2);
    expect(w.timezones).toEqual(original);
  });
});

describe("setReferenceTimezone", () => {
  it("promotes a secondary zone and demotes the previous reference", () => {
    const london = buildTimezoneData({
      city: "London",
      country: "UK",
      timezone: "Europe/London",
    });
    const tokyo = buildTimezoneData({ city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" });
    const w: Workspace = {
      ...createDefaultWorkspace(),
      referenceTimezone: london,
      timezones: [tokyo],
    };
    const r = setReferenceTimezone(w, tokyo);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.referenceTimezone?.id).toBe(tokyo.id);
      expect(r.value.timezones.map((t) => t.id)).toEqual([london.id]);
    }
  });

  it("no-op when promoting the current reference", () => {
    const tokyo = buildTimezoneData({ city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" });
    const w: Workspace = { ...createDefaultWorkspace(), referenceTimezone: tokyo };
    const r = setReferenceTimezone(w, tokyo);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(w);
  });
});

describe("ensureValidActiveWorkspace", () => {
  it("creates a default when state is empty", () => {
    const fixed = ensureValidActiveWorkspace({ workspaces: [], activeWorkspaceId: null });
    expect(fixed.workspaces).toHaveLength(1);
    expect(fixed.activeWorkspaceId).toBe(fixed.workspaces[0]!.id);
  });

  it("repairs activeWorkspaceId when it points at a missing workspace", () => {
    const a = createDefaultWorkspace();
    const fixed = ensureValidActiveWorkspace({ workspaces: [a], activeWorkspaceId: "missing" });
    expect(fixed.activeWorkspaceId).toBe(a.id);
  });
});

describe("buildTimezoneData", () => {
  it("computes offset for the given zone", () => {
    const td = buildTimezoneData({ city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" });
    expect(td.offsetMinutes).toBe(540);
    expect(td.kind).toBe("city");
  });

  it("trims city and country names", () => {
    const td = buildTimezoneData({ city: "  Tokyo ", country: " Japan ", timezone: "Asia/Tokyo" });
    expect(td.city).toBe("Tokyo");
    expect(td.country).toBe("Japan");
  });

  it("uses provided id when given", () => {
    const td = buildTimezoneData({
      id: "fixed-id",
      city: "Tokyo",
      country: "Japan",
      timezone: "Asia/Tokyo",
    });
    expect(td.id).toBe("fixed-id");
  });
});
