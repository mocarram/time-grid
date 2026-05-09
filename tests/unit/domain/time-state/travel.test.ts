import {
  changeDateInZone,
  minutesToInstantInZone,
  msUntilNextMinuteBoundary,
  resetToNow,
  setWallClockInZone,
  timeToMinutesInZone,
} from "@domain/time-state/travel";
import { wallClockInZone } from "@domain/timezone/offset";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

describe("setWallClockInZone", () => {
  it("scrubs time within the same day in UTC", () => {
    const out = setWallClockInZone("2025-01-15T08:00:00.000Z", "UTC", 14, 30);
    const wc = wallClockInZone(new Date(out), "UTC");
    expect(wc.hour).toBe(14);
    expect(wc.minute).toBe(30);
    expect(wc.day).toBe(15);
  });

  it("scrubs in a +9 zone produces correct UTC instant", () => {
    const out = setWallClockInZone("2025-01-15T00:00:00.000Z", "Asia/Tokyo", 9, 0);
    // 09:00 Tokyo = 00:00 UTC
    expect(out).toBe("2025-01-15T00:00:00.000Z");
  });

  it("scrubs in a +5:30 zone produces correct UTC instant", () => {
    const out = setWallClockInZone("2025-01-15T00:00:00.000Z", "Asia/Kolkata", 17, 30);
    // 17:30 Kolkata = 12:00 UTC
    expect(out).toBe("2025-01-15T12:00:00.000Z");
  });

  it("DST spring-forward gap normalizes to a valid wall clock", () => {
    // 2025-03-09 02:30 in America/New_York does not exist (clocks jump 2 → 3).
    const out = setWallClockInZone("2025-03-09T05:00:00.000Z", "America/New_York", 2, 30);
    const wc = wallClockInZone(new Date(out), "America/New_York");
    // Implementation rule: result must be either the moved-forward 3:30 or
    // remain on a real wall-clock minute — never a phantom 2:30.
    expect(wc.hour).not.toBe(2);
  });

  it("DST fall-back ambiguity resolves deterministically (one of the two valid instants)", () => {
    // 01:30 on 2025-11-02 in America/New_York occurs twice. We accept either
    // valid instant, just not a phantom one.
    const out = setWallClockInZone("2025-11-02T05:00:00.000Z", "America/New_York", 1, 30);
    const wc = wallClockInZone(new Date(out), "America/New_York");
    expect(wc.hour).toBe(1);
    expect(wc.minute).toBe(30);
  });

  it("rejects out-of-range hour", () => {
    expect(() => setWallClockInZone("2025-01-15T00:00:00.000Z", "UTC", -1, 0)).toThrow(RangeError);
    expect(() => setWallClockInZone("2025-01-15T00:00:00.000Z", "UTC", 24, 0)).toThrow(RangeError);
    expect(() => setWallClockInZone("2025-01-15T00:00:00.000Z", "UTC", 1.5, 0)).toThrow(
      RangeError,
    );
  });

  it("rejects out-of-range minute", () => {
    expect(() => setWallClockInZone("2025-01-15T00:00:00.000Z", "UTC", 0, -1)).toThrow(RangeError);
    expect(() => setWallClockInZone("2025-01-15T00:00:00.000Z", "UTC", 0, 60)).toThrow(RangeError);
  });
});

describe("timeToMinutesInZone & minutesToInstantInZone", () => {
  it("round-trips minutes-of-day", () => {
    const base = "2025-01-15T00:00:00.000Z";
    const minutes = 15 * 60 + 30;
    const instant = minutesToInstantInZone(base, "America/New_York", minutes);
    expect(timeToMinutesInZone(instant, "America/New_York")).toBe(minutes);
  });

  it("rejects invalid minutesOfDay", () => {
    expect(() => minutesToInstantInZone("2025-01-15T00:00:00.000Z", "UTC", -1)).toThrow(
      RangeError,
    );
    expect(() => minutesToInstantInZone("2025-01-15T00:00:00.000Z", "UTC", 1440)).toThrow(
      RangeError,
    );
  });
});

describe("changeDateInZone", () => {
  it("changes the date while preserving the wall-clock time", () => {
    const out = changeDateInZone("2025-01-15T18:30:00.000Z", "Asia/Kolkata", 2025, 6, 1);
    const wc = wallClockInZone(new Date(out), "Asia/Kolkata");
    expect(wc.year).toBe(2025);
    expect(wc.month).toBe(6);
    expect(wc.day).toBe(1);
    // Original UTC 18:30 in IST = 00:00 next day. Wall clock minutes preserved.
    expect(wc.minute).toBe(0);
  });
});

describe("resetToNow", () => {
  it("returns isModified=false and a current instant", () => {
    const before = Date.now();
    const ts = resetToNow();
    const after = Date.now();
    expect(ts.isModified).toBe(false);
    const t = new Date(ts.instantUtc).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });
});

describe("msUntilNextMinuteBoundary", () => {
  it("returns positive value <= 60_000", () => {
    const ms = msUntilNextMinuteBoundary(new Date());
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(60_000);
  });

  it("computes correctly for known instant", () => {
    // 12:34:42.500 → 17500ms until next minute
    const d = new Date(2025, 0, 1, 12, 34, 42, 500);
    expect(msUntilNextMinuteBoundary(d)).toBe(17_500);
  });

  it("property: result is always in (0, 60_000]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59_999 }), (offsetMs) => {
        const d = new Date(2025, 0, 1, 0, 0, 0);
        d.setMilliseconds(d.getMilliseconds() + offsetMs);
        const ms = msUntilNextMinuteBoundary(d);
        return ms > 0 && ms <= 60_000;
      }),
      { numRuns: 200 },
    );
  });
});
