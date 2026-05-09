import { describe, expect, it, vi } from "vitest";

import { createSyncEngine, type SyncEvent } from "@app/sync/engine";
import { createDefaultWorkspace } from "@domain/workspace/operations";
import type { UserDataClient } from "@infra/api/user-data";
import type { UserDataV2 } from "@schemas/sync";

class FakeTimers {
  pending = new Map<unknown, { fn: () => void; due: number }>();
  now = 0;
  next = 1;
  setTimeout = (fn: () => void, ms: number) => {
    const handle = this.next++;
    this.pending.set(handle, { fn, due: this.now + ms });
    return handle;
  };
  clearTimeout = (handle: unknown) => {
    this.pending.delete(handle);
  };
  advance(ms: number) {
    this.now += ms;
    for (const [handle, entry] of [...this.pending.entries()]) {
      if (entry.due <= this.now) {
        this.pending.delete(handle);
        entry.fn();
      }
    }
  }
}

function makeServerData(rev: number): UserDataV2 {
  const ws = createDefaultWorkspace();
  return {
    v: 2,
    workspaces: [ws],
    activeWorkspaceId: ws.id,
    revision: rev,
    updatedAt: new Date().toISOString(),
    userId: "user-1",
  };
}

interface FakeClientOptions {
  /** Sequence of responses for save(). */
  responses: Array<
    | { kind: "ok"; revision: number; updatedAt?: string }
    | { kind: "http"; status: number; body?: unknown }
    | { kind: "network" }
    | { kind: "timeout" }
    | { kind: "conflict"; server: UserDataV2 }
  >;
}

function makeFakeClient(opts: FakeClientOptions): UserDataClient {
  let i = 0;
  return {
    check: () => Promise.resolve({ ok: true, value: { hasData: false, lastSynced: null, revision: null } }),
    load: () => Promise.resolve({ ok: true, value: null }),
    save: () => {
      const next = opts.responses[i++] ?? opts.responses[opts.responses.length - 1]!;
      switch (next.kind) {
        case "ok":
          return Promise.resolve({
            ok: true,
            value: { revision: next.revision, updatedAt: next.updatedAt ?? new Date().toISOString() },
          });
        case "http":
          return Promise.resolve({ ok: false, error: { kind: "http", status: next.status, body: next.body } });
        case "network":
          return Promise.resolve({ ok: false, error: { kind: "network", cause: new Error("net") } });
        case "timeout":
          return Promise.resolve({ ok: false, error: { kind: "timeout" } });
        case "conflict":
          return Promise.resolve({ ok: false, error: { kind: "conflict", server: next.server } });
      }
    },
    delete: () => Promise.resolve({ ok: true, value: { success: true } }),
  };
}

describe("syncEngine - debounce", () => {
  it("coalesces a burst of scheduleSync calls into one POST", async () => {
    const timers = new FakeTimers();
    const client = makeFakeClient({ responses: [{ kind: "ok", revision: 1 }] });
    const events: SyncEvent[] = [];
    let revision = 0;
    const ws = createDefaultWorkspace();
    const engine = createSyncEngine({
      client,
      getState: () => ({ workspaces: [ws], activeWorkspaceId: ws.id }),
      getRevision: () => revision,
      setRevision: (r) => {
        revision = r;
      },
      onEvent: (e) => events.push(e),
      timers,
    });
    const spy = vi.spyOn(client, "save");
    engine.scheduleSync();
    engine.scheduleSync();
    engine.scheduleSync();
    timers.advance(1999);
    expect(spy).not.toHaveBeenCalled();
    timers.advance(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(events).toEqual([
      { kind: "started" },
      expect.objectContaining({ kind: "succeeded", revision: 1 }),
    ]);
    expect(revision).toBe(1);
  });
});

describe("syncEngine - retry with backoff", () => {
  it("retries on 500 with 1s, 2s, 4s ... and stops after max attempts", async () => {
    const timers = new FakeTimers();
    const client = makeFakeClient({
      responses: [
        { kind: "http", status: 500 },
        { kind: "http", status: 500 },
        { kind: "http", status: 500 },
        { kind: "http", status: 500 },
        { kind: "http", status: 500 },
      ],
    });
    const events: SyncEvent[] = [];
    const ws = createDefaultWorkspace();
    const engine = createSyncEngine({
      client,
      getState: () => ({ workspaces: [ws], activeWorkspaceId: ws.id }),
      getRevision: () => 0,
      setRevision: () => {},
      onEvent: (e) => events.push(e),
      timers,
    });
    void engine.syncNow();
    await flush();
    timers.advance(1000); // first retry
    await flush();
    timers.advance(2000); // second retry
    await flush();
    timers.advance(4000); // third retry
    await flush();
    timers.advance(8000); // fourth retry
    await flush();
    // After 5 attempts, we expect the engine to give up.
    const failedFinal = events.findIndex(
      (e) => e.kind === "failed" && e.willRetry === false,
    );
    expect(failedFinal).toBeGreaterThanOrEqual(0);
    const startedCount = events.filter((e) => e.kind === "started").length;
    expect(startedCount).toBe(5);
  });

  it("does NOT retry on 4xx (except 409 — handled separately as conflict)", async () => {
    const timers = new FakeTimers();
    const client = makeFakeClient({ responses: [{ kind: "http", status: 400 }] });
    const events: SyncEvent[] = [];
    const ws = createDefaultWorkspace();
    const engine = createSyncEngine({
      client,
      getState: () => ({ workspaces: [ws], activeWorkspaceId: ws.id }),
      getRevision: () => 0,
      setRevision: () => {},
      onEvent: (e) => events.push(e),
      timers,
    });
    await engine.syncNow();
    expect(events.some((e) => e.kind === "failed" && e.willRetry === false)).toBe(true);
  });
});

describe("syncEngine - conflict resolution", () => {
  it("emits a conflict event with the server payload", async () => {
    const timers = new FakeTimers();
    const server = makeServerData(7);
    const client = makeFakeClient({ responses: [{ kind: "conflict", server }] });
    const events: SyncEvent[] = [];
    let revision = 3;
    const ws = createDefaultWorkspace();
    const engine = createSyncEngine({
      client,
      getState: () => ({ workspaces: [ws], activeWorkspaceId: ws.id }),
      getRevision: () => revision,
      setRevision: (r) => {
        revision = r;
      },
      onEvent: (e) => events.push(e),
      timers,
    });
    await engine.syncNow();
    expect(events.some((e) => e.kind === "conflict")).toBe(true);
    expect(revision).toBe(7);
  });
});

describe("syncEngine - dispose", () => {
  it("cancels pending timers", async () => {
    const timers = new FakeTimers();
    const client = makeFakeClient({ responses: [{ kind: "ok", revision: 1 }] });
    const ws = createDefaultWorkspace();
    const spy = vi.spyOn(client, "save");
    const engine = createSyncEngine({
      client,
      getState: () => ({ workspaces: [ws], activeWorkspaceId: ws.id }),
      getRevision: () => 0,
      setRevision: () => {},
      timers,
    });
    engine.scheduleSync();
    engine.dispose();
    timers.advance(60_000);
    expect(spy).not.toHaveBeenCalled();
  });
});

async function flush() {
  // Drain queued microtasks.
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
