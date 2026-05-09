import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw-server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

if (typeof globalThis.crypto?.randomUUID !== "function") {
  // jsdom has crypto, but ensure UUID exists for older runtimes
  // @ts-expect-error - polyfill
  globalThis.crypto = { ...globalThis.crypto, randomUUID: () => "test-uuid-" + Math.random().toString(16).slice(2) };
}
