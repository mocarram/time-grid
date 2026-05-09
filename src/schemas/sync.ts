import { z } from "zod";

import { WorkspaceSchema } from "./workspace";

export const UserDataV2Schema = z
  .object({
    v: z.literal(2),
    workspaces: z.array(WorkspaceSchema),
    activeWorkspaceId: z.string().uuid().nullable(),
    revision: z.number().int().nonnegative(),
    updatedAt: z.string().datetime(),
    userId: z.string().min(1),
  })
  .strict();

export type UserDataV2 = z.infer<typeof UserDataV2Schema>;

export const SyncPostBodySchema = z
  .object({
    workspaces: z.array(WorkspaceSchema),
    activeWorkspaceId: z.string().uuid().nullable(),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();

export type SyncPostBody = z.infer<typeof SyncPostBodySchema>;

export const SyncCheckResponseSchema = z
  .object({
    hasData: z.boolean(),
    lastSynced: z.string().datetime().nullable(),
    revision: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const SyncGetResponseSchema = z
  .object({
    success: z.literal(true),
    data: UserDataV2Schema.nullable(),
  })
  .strict();

export const SyncPostResponseSchema = z
  .object({
    success: z.literal(true),
    revision: z.number().int().nonnegative(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const SyncConflictResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.literal("revision_conflict"),
    server: UserDataV2Schema,
  })
  .strict();
