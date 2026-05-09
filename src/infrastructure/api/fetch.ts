// Typed fetch helper with timeout/abort and Zod validation.

import type { ZodTypeAny } from "zod";

import { logger } from "@infra/logger/index";

const log = logger.scoped("api");

export type ApiError =
  | { kind: "network"; cause: unknown }
  | { kind: "timeout" }
  | { kind: "http"; status: number; body?: unknown }
  | { kind: "schema"; issues: string[] }
  | { kind: "abort" };

export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

export interface FetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: HeadersInit;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export async function apiFetch<T>(
  url: string,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } } & Pick<ZodTypeAny, never>,
  opts: FetchOptions = {},
): Promise<ApiResult<T>> {
  const { timeoutMs = 8000, signal, headers, method = "GET", body } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = undefined;
      }
      return { ok: false, error: { kind: "http", status: response.status, body: errorBody } };
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch (e) {
      return { ok: false, error: { kind: "schema", issues: [`invalid json: ${String(e)}`] } };
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message);
      log.warn("response failed validation", { url, issues });
      return { ok: false, error: { kind: "schema", issues } };
    }
    return { ok: true, value: parsed.data };
  } catch (e) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason as unknown;
      if (reason instanceof DOMException && reason.name === "TimeoutError") {
        return { ok: false, error: { kind: "timeout" } };
      }
      return { ok: false, error: { kind: "abort" } };
    }
    return { ok: false, error: { kind: "network", cause: e } };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
