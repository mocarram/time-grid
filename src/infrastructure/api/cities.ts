import { LIMITS } from "@config/index";
import { CitiesResponseSchema, type CitySearchResult } from "@schemas/api";

import { apiFetch, type ApiResult } from "./fetch";

export interface CitiesClient {
  search(query: string, signal?: AbortSignal): Promise<ApiResult<CitySearchResult[]>>;
}

export function createCitiesClient(): CitiesClient {
  return {
    async search(query, signal) {
      const trimmed = query.trim();
      if (trimmed.length < LIMITS.searchMinChars) {
        return { ok: true, value: [] };
      }
      const url = `/api/cities?q=${encodeURIComponent(trimmed)}`;
      const result = await apiFetch(url, CitiesResponseSchema, {
        signal,
        timeoutMs: LIMITS.searchUpstreamTimeoutMs,
      });
      if (!result.ok) return result;
      return { ok: true, value: result.value.cities };
    },
  };
}
