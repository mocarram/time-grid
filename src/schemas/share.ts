import { z } from "zod";

import { LIMITS } from "@config/index";

import { ImportableTimezoneSchema, IanaZoneSchema } from "./timezone";
import { WorkspaceColorSchema, WorkspaceIconSchema } from "./workspace";

export const ShareSnapshotV2Schema = z
  .object({
    v: z.literal(2),
    ref: z
      .object({
        city: z.string().min(1).max(LIMITS.cityNameMax),
        country: z.string().min(1).max(LIMITS.countryNameMax),
        timezone: IanaZoneSchema,
      })
      .strict(),
    zones: z.array(ImportableTimezoneSchema).max(200),
    instantUtc: z.string().datetime(),
    isModified: z.boolean(),
    workspace: z
      .object({
        name: z.string().min(1).max(LIMITS.workspaceNameMax),
        description: z.string().max(LIMITS.workspaceDescriptionMax).optional(),
        color: WorkspaceColorSchema,
        icon: WorkspaceIconSchema,
      })
      .strict()
      .optional(),
  })
  .strict();

export type ShareSnapshotV2 = z.infer<typeof ShareSnapshotV2Schema>;
