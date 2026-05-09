import {
  TimezoneLookupResponseSchema,
  type TimezoneLookupResponse,
} from "@schemas/api";

import { apiFetch, type ApiResult } from "./fetch";

export interface TimezoneClient {
  resolve(
    lat: number,
    lng: number,
    signal?: AbortSignal,
  ): Promise<ApiResult<TimezoneLookupResponse>>;
}

export function createTimezoneClient(): TimezoneClient {
  return {
    resolve(lat, lng, signal) {
      const url = `/api/timezone?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
      return apiFetch(url, TimezoneLookupResponseSchema, { signal, timeoutMs: 8000 });
    },
  };
}
