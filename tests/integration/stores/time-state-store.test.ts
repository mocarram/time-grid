import { describe, expect, it } from "vitest";

import { createTimeStateStore } from "@app/stores/time-state-store";
import { wallClockInZone } from "@domain/timezone/offset";

describe("timeStateStore", () => {
  it("setWallClock marks isModified true", () => {
    const store = createTimeStateStore();
    store.getState().setWallClock("Asia/Tokyo", 9, 0);
    expect(store.getState().isModified).toBe(true);
    const wc = wallClockInZone(new Date(store.getState().instantUtc), "Asia/Tokyo");
    expect(wc.hour).toBe(9);
    expect(wc.minute).toBe(0);
  });

  it("setInstantUtc updates instant directly", () => {
    const store = createTimeStateStore();
    store.getState().setInstantUtc("2025-07-04T16:00:00.000Z", false);
    expect(store.getState().instantUtc).toBe("2025-07-04T16:00:00.000Z");
    expect(store.getState().isModified).toBe(false);
  });

  it("reset returns to current time and isModified=false", () => {
    const store = createTimeStateStore();
    store.getState().setWallClock("UTC", 1, 0);
    expect(store.getState().isModified).toBe(true);
    store.getState().reset();
    expect(store.getState().isModified).toBe(false);
  });

  it("rejects out-of-range hour/minute", () => {
    const store = createTimeStateStore();
    expect(() => store.getState().setWallClock("UTC", 25, 0)).toThrow();
    expect(() => store.getState().setWallClock("UTC", 0, -1)).toThrow();
  });
});
