import { z } from "zod";

import { WorkspaceSchema } from "./workspace";

export const StorageStateV2Schema = z
  .object({
    v: z.literal(2),
    workspaces: z.array(WorkspaceSchema).min(1),
    activeWorkspaceId: z.string().uuid().nullable(),
    updatedAt: z.string().datetime(),
    deviceId: z.string().uuid(),
  })
  .strict();

export type StorageStateV2 = z.infer<typeof StorageStateV2Schema>;
