import { z } from "zod";

import {
  LIMITS,
  WORKSPACE_COLOR_VALUES,
  WORKSPACE_ICON_VALUES,
} from "@config/index";

import { TimezoneDataSchema } from "./timezone";

export const WorkspaceColorSchema = z.enum(WORKSPACE_COLOR_VALUES);
export const WorkspaceIconSchema = z.enum(WORKSPACE_ICON_VALUES);

const TrimmedName = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length >= LIMITS.workspaceNameMin, { message: "name required" })
  .refine((s) => s.length <= LIMITS.workspaceNameMax, { message: "name too long" });

const TrimmedDescription = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length <= LIMITS.workspaceDescriptionMax, {
    message: "description too long",
  });

export const WorkspaceSchema = z
  .object({
    id: z.string().uuid(),
    name: TrimmedName,
    description: TrimmedDescription.optional(),
    color: WorkspaceColorSchema,
    icon: WorkspaceIconSchema,
    timezones: z.array(TimezoneDataSchema).max(LIMITS.timezonesPerWorkspaceMax),
    referenceTimezone: TimezoneDataSchema.optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceCreateInputSchema = z
  .object({
    name: TrimmedName,
    description: TrimmedDescription.optional(),
    color: WorkspaceColorSchema,
    icon: WorkspaceIconSchema,
  })
  .strict();

export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateInputSchema>;

export const WorkspaceUpdateInputSchema = z
  .object({
    name: TrimmedName.optional(),
    description: TrimmedDescription.optional(),
    color: WorkspaceColorSchema.optional(),
    icon: WorkspaceIconSchema.optional(),
  })
  .strict();

export type WorkspaceUpdateInput = z.infer<typeof WorkspaceUpdateInputSchema>;

export const WorkspaceStateSchema = z
  .object({
    workspaces: z.array(WorkspaceSchema).min(1).max(LIMITS.workspacesPerUserMax),
    activeWorkspaceId: z.string().uuid().nullable(),
  })
  .strict();

export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;
