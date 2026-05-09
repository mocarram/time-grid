import RedisMock from "ioredis-mock";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { REDIS_KEYS } from "@config/index";
import { createDefaultWorkspace } from "@domain/workspace/operations";
import { createUserDataRepo } from "@infra/redis/user-data-repo";
import type { Workspace } from "@schemas/workspace";

const USER = "user-1";

// ioredis-mock shares an in-memory keyspace across instances; flush per test.
let _sharedRedis: RedisMock | null = null;

function build() {
  if (!_sharedRedis) _sharedRedis = new RedisMock();
  const repo = createUserDataRepo(_sharedRedis);
  return { redis: _sharedRedis, repo };
}

beforeEach(async () => {
  if (!_sharedRedis) _sharedRedis = new RedisMock();
  await _sharedRedis.flushall();
});

afterEach(async () => {
  await _sharedRedis?.flushall();
});

describe("UserDataRepo.save / get", () => {
  it("save then get round-trips and increments revision", async () => {
    const { repo } = build();
    const ws = createDefaultWorkspace();
    const r1 = await repo.save({
      userId: USER,
      workspaces: [ws],
      activeWorkspaceId: ws.id,
    });
    expect(r1.kind).toBe("ok");
    if (r1.kind === "ok") expect(r1.data.revision).toBe(1);

    const got = await repo.get(USER);
    expect(got).not.toBeNull();
    expect(got?.workspaces[0]!.id).toBe(ws.id);

    const r2 = await repo.save({
      userId: USER,
      workspaces: [ws],
      activeWorkspaceId: ws.id,
    });
    if (r2.kind === "ok") expect(r2.data.revision).toBe(2);
  });

  it("returns conflict when expectedRevision is stale", async () => {
    const { repo } = build();
    const ws = createDefaultWorkspace();
    await repo.save({ userId: USER, workspaces: [ws], activeWorkspaceId: ws.id });
    await repo.save({ userId: USER, workspaces: [ws], activeWorkspaceId: ws.id });
    const r = await repo.save({
      userId: USER,
      workspaces: [ws],
      activeWorkspaceId: ws.id,
      expectedRevision: 0,
    });
    expect(r.kind).toBe("conflict");
    if (r.kind === "conflict") expect(r.server.revision).toBe(2);
  });

  it("accepts when expectedRevision matches", async () => {
    const { repo } = build();
    const ws = createDefaultWorkspace();
    const r1 = await repo.save({ userId: USER, workspaces: [ws], activeWorkspaceId: ws.id });
    if (r1.kind !== "ok") throw new Error("seed failed");
    const r2 = await repo.save({
      userId: USER,
      workspaces: [ws],
      activeWorkspaceId: ws.id,
      expectedRevision: r1.data.revision,
    });
    expect(r2.kind).toBe("ok");
  });

  it("delete removes user data", async () => {
    const { redis, repo } = build();
    const ws = createDefaultWorkspace();
    await repo.save({ userId: USER, workspaces: [ws], activeWorkspaceId: ws.id });
    expect(await repo.has(USER)).toBe(true);
    expect(await repo.delete(USER)).toBe(true);
    expect(await repo.has(USER)).toBe(false);
    expect(await redis.get(REDIS_KEYS.userV2(USER))).toBeNull();
  });

  it("returns unavailable when redis is null", async () => {
    const repo = createUserDataRepo(null);
    const r = await repo.save({
      userId: USER,
      workspaces: [createDefaultWorkspace()],
      activeWorkspaceId: null,
    });
    expect(r.kind).toBe("unavailable");
    expect(await repo.get(USER)).toBeNull();
    expect(await repo.has(USER)).toBe(false);
    expect(await repo.delete(USER)).toBe(false);
  });
});

describe("UserDataRepo.get — v1 migration", () => {
  it("migrates v1 payload into v2 on first read", async () => {
    const { redis, repo } = build();
    const v1Workspace: Workspace = createDefaultWorkspace();
    const v1Payload = {
      workspaces: [v1Workspace],
      activeWorkspaceId: v1Workspace.id,
      lastSynced: new Date().toISOString(),
      userId: USER,
    };
    await redis.set(REDIS_KEYS.userV1(USER), JSON.stringify(v1Payload));
    const got = await repo.get(USER);
    expect(got).not.toBeNull();
    expect(got?.revision).toBe(0);
    expect(got?.workspaces[0]!.id).toBe(v1Workspace.id);
    // v2 key should now exist.
    expect(await redis.get(REDIS_KEYS.userV2(USER))).not.toBeNull();
    // v1 key intact for one release.
    expect(await redis.get(REDIS_KEYS.userV1(USER))).not.toBeNull();
  });

  it("returns null when v1 payload is malformed", async () => {
    const { redis, repo } = build();
    await redis.set(REDIS_KEYS.userV1(USER), "{ broken");
    expect(await repo.get(USER)).toBeNull();
  });
});

describe("UserDataRepo.has / delete edge cases", () => {
  let setup: ReturnType<typeof build>;
  beforeEach(() => {
    setup = build();
  });

  it("has returns false for unknown user", async () => {
    expect(await setup.repo.has("ghost")).toBe(false);
  });

  it("delete returns false when nothing was deleted", async () => {
    expect(await setup.repo.delete("ghost")).toBe(false);
  });
});
