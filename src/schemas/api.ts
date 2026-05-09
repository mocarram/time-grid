import { z } from "zod";

import { LIMITS } from "@config/index";

import { IanaZoneSchema } from "./timezone";

export const CitySearchResultSchema = z
  .object({
    id: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    countryCode: z.string().max(8),
    state: z.string().optional().default(""),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    displayName: z.string(),
    placeType: z.string(),
    importance: z.number().optional().default(0),
  })
  .strict();

export type CitySearchResult = z.infer<typeof CitySearchResultSchema>;

export const CitiesResponseSchema = z
  .object({
    cities: z.array(CitySearchResultSchema).max(LIMITS.searchResultsCap),
  })
  .strict();

export const TimezoneLookupResponseSchema = z
  .object({
    city: z.string(),
    country: z.string(),
    timezone: IanaZoneSchema,
    offsetMinutes: z.number().int(),
  })
  .strict();

export type TimezoneLookupResponse = z.infer<typeof TimezoneLookupResponseSchema>;

export const IpTimezoneResponseSchema = z
  .object({
    city: z.string(),
    country: z.string(),
    timezone: IanaZoneSchema,
    source: z.enum(["ip", "browser"]),
  })
  .strict();

export type IpTimezoneResponse = z.infer<typeof IpTimezoneResponseSchema>;
