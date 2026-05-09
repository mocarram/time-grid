import { LIMITS } from "@config/index";
import { type IpTimezoneResponse,IpTimezoneResponseSchema } from "@schemas/api";

import { apiFetch, type ApiResult } from "./fetch";

export interface IpTimezoneClient {
  detect(signal?: AbortSignal): Promise<ApiResult<IpTimezoneResponse>>;
}

export function createIpTimezoneClient(): IpTimezoneClient {
  return {
    detect(signal) {
      return apiFetch("/api/ip-timezone", IpTimezoneResponseSchema, {
        signal,
        timeoutMs: LIMITS.ipDetectionTimeoutMs,
      });
    },
  };
}
