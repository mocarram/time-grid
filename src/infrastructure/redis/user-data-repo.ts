// Server-side repository for user-data v2 with revision-based optimistic
// concurrency. Supports v1 → v2 migration on first read.

import { REDIS_KEYS } from "@config/index";
import { logger } from "@infra/logger/index";
import { UserDataV2Schema, type UserDataV2 } from "@schemas/sync";
import type { Workspace } from "@schemas/workspace";
import { ensureValidActiveWorkspace } from "@domain/workspace/operations";

const log = logger.scoped("redis.user-data");

const TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

export type SaveResult =
  | { kind: "ok"; data: UserDataV2 }
  | { kind: "conflict"; server: UserDataV2 }
  | { kind: "unavailable" };

export interface UserDataRepo {
  get(userId: string): Promise<UserDataV2 | null>;
  has(userId: string): Promise<boolean>;
  save(input: {
    userId: string;
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    expectedRevision?: number;
  }): Promise<SaveResult>;
  delete(userId: string): Promise<boolean>;
}

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  setex?(key: string, ttl: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  exists(key: string): Promise<number>;
}

export function createUserDataRepo(redis: RedisLike | null): UserDataRepo {
  return {
    async get(userId) {
      if (!redis) return null;
      const v2Raw = await redis.get(REDIS_KEYS.userV2(userId));
      if (v2Raw) {
        return parseV2(v2Raw, userId);
      }
      const v1Raw = await redis.get(REDIS_KEYS.userV1(userId));
      if (!v1Raw) return null;
      const migrated = migrateV1(v1Raw, userId);
      if (!migrated) return null;
      // Persist the migrated payload under v2 (kept legacy intact for one release).
      await writeV2(redis, migrated);
      return migrated;
    },

    async has(userId) {
      if (!redis) return false;
      const v2 = await redis.exists(REDIS_KEYS.userV2(userId));
      if (v2 === 1) return true;
      const v1 = await redis.exists(REDIS_KEYS.userV1(userId));
      return v1 === 1;
    },

    async save(input) {
      if (!redis) return { kind: "unavailable" };
      const existingRaw = await redis.get(REDIS_KEYS.userV2(input.userId));
      const existing = existingRaw ? parseV2(existingRaw, input.userId) : null;
      const currentRevision = existing?.revision ?? 0;
      if (input.expectedRevision !== undefined && input.expectedRevision !== currentRevision) {
        if (existing) return { kind: "conflict", server: existing };
      }
      const fixed = ensureValidActiveWorkspace({
        workspaces: input.workspaces,
        activeWorkspaceId: input.activeWorkspaceId,
      });
      const payload: UserDataV2 = {
        v: 2,
        workspaces: fixed.workspaces,
        activeWorkspaceId: fixed.activeWorkspaceId,
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString(),
        userId: input.userId,
      };
      await writeV2(redis, payload);
      return { kind: "ok", data: payload };
    },

    async delete(userId) {
      if (!redis) return false;
      const removed = await redis.del(REDIS_KEYS.userV2(userId), REDIS_KEYS.userV1(userId));
      return removed > 0;
    },
  };
}

async function writeV2(redis: RedisLike, payload: UserDataV2) {
  const json = JSON.stringify(payload);
  if (typeof redis.setex === "function") {
    await redis.setex(REDIS_KEYS.userV2(payload.userId), TTL_SECONDS, json);
  } else {
    await redis.set(REDIS_KEYS.userV2(payload.userId), json, "EX", TTL_SECONDS);
  }
}

function parseV2(raw: string, userId: string): UserDataV2 | null {
  try {
    const result = UserDataV2Schema.safeParse(JSON.parse(raw));
    if (!result.success) {
      log.warn("invalid v2 payload in redis", { userId, issue: result.error.issues[0]?.message });
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

function migrateV1(raw: string, userId: string): UserDataV2 | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.workspaces)) return null;
    // Best-effort cast — server-side migration intentionally lenient. Schema
    // failures are dropped; the user effectively starts fresh from local.
    const candidate = {
      v: 2 as const,
      workspaces: parsed.workspaces,
      activeWorkspaceId: typeof parsed.activeWorkspaceId === "string" ? parsed.activeWorkspaceId : null,
      revision: 0,
      updatedAt:
        typeof parsed.lastSynced === "string"
          ? parsed.lastSynced
          : new Date().toISOString(),
      userId,
    };
    const result = UserDataV2Schema.safeParse(candidate);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
