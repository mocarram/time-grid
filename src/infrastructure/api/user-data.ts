import {
  SyncCheckResponseSchema,
  SyncConflictResponseSchema,
  SyncGetResponseSchema,
  SyncPostBodySchema,
  SyncPostResponseSchema,
  type UserDataV2,
} from "@schemas/sync";
import type { Workspace } from "@schemas/workspace";
import { z } from "zod";

import { type ApiError,apiFetch, type ApiResult } from "./fetch";

const DeleteResponseSchema = z.object({ success: z.literal(true) }).strict();

export interface UserDataClient {
  check(signal?: AbortSignal): Promise<ApiResult<{ hasData: boolean; lastSynced: string | null; revision: number | null }>>;
  load(signal?: AbortSignal): Promise<ApiResult<UserDataV2 | null>>;
  save(
    body: { workspaces: Workspace[]; activeWorkspaceId: string | null; expectedRevision?: number },
    signal?: AbortSignal,
  ): Promise<
    | { ok: true; value: { revision: number; updatedAt: string } }
    | { ok: false; error: ApiError | { kind: "conflict"; server: UserDataV2 } }
  >;
  delete(signal?: AbortSignal): Promise<ApiResult<{ success: true }>>;
}

export function createUserDataClient(): UserDataClient {
  return {
    check(signal) {
      return apiFetch("/api/user-data/check", SyncCheckResponseSchema, { signal });
    },
    async load(signal) {
      const result = await apiFetch("/api/user-data", SyncGetResponseSchema, { signal });
      if (!result.ok) return result;
      return { ok: true, value: result.value.data };
    },
    async save(body, signal) {
      // Pre-validate locally so we don't send junk.
      const valid = SyncPostBodySchema.safeParse(body);
      if (!valid.success) {
        return {
          ok: false,
          error: { kind: "schema", issues: valid.error.issues.map((i) => i.message) },
        };
      }
      const result = await apiFetch("/api/user-data", SyncPostResponseSchema, {
        method: "POST",
        body,
        signal,
      });
      if (result.ok) return result;
      // Promote 409 conflicts into a typed conflict error.
      if (result.error.kind === "http" && result.error.status === 409) {
        const parsed = SyncConflictResponseSchema.safeParse(result.error.body);
        if (parsed.success) {
          return { ok: false, error: { kind: "conflict", server: parsed.data.server } };
        }
      }
      return result;
    },
    delete(signal) {
      return apiFetch("/api/user-data", DeleteResponseSchema, { method: "DELETE", signal });
    },
  };
}
