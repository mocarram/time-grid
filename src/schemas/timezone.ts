import { z } from "zod";

import { LIMITS } from "@config/index";
import { isValidIanaZone } from "@domain/timezone/iana";

const TrimmedString = (max: number, label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: `${label} required` })
    .refine((s) => s.length <= max, { message: `${label} too long` });

export const IanaZoneSchema = z
  .string()
  .min(1, "timezone required")
  .max(80, "timezone too long")
  .refine(isValidIanaZone, { message: "invalid timezone" });

export const TimezoneKindSchema = z.enum(["city", "abbreviation"]);

export const TimezoneDataSchema = z
  .object({
    id: z.string().min(1),
    city: TrimmedString(LIMITS.cityNameMax, "city"),
    country: TrimmedString(LIMITS.countryNameMax, "country"),
    timezone: IanaZoneSchema,
    offsetMinutes: z
      .number()
      .int()
      .min(-12 * 60 - 60)
      .max(14 * 60 + 60),
    kind: TimezoneKindSchema.default("city"),
    abbreviation: z.string().max(8).optional(),
    region: z.string().max(80).optional(),
  })
  .strict();

export type TimezoneData = z.infer<typeof TimezoneDataSchema>;

// Loose schema for shared/imported data — id and offsetMinutes may be missing
// and will be re-derived during import.
export const ImportableTimezoneSchema = z
  .object({
    city: TrimmedString(LIMITS.cityNameMax, "city"),
    country: TrimmedString(LIMITS.countryNameMax, "country"),
    timezone: IanaZoneSchema,
    kind: TimezoneKindSchema.default("city"),
    abbreviation: z.string().max(8).optional(),
    region: z.string().max(80).optional(),
  })
  .strict();

export type ImportableTimezone = z.infer<typeof ImportableTimezoneSchema>;
