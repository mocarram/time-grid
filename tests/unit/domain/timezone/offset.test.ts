import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  formatOffsetGmt,
  offsetMinutesAt,
  wallClockInZone,
} from "@domain/timezone/offset";

describe("offsetMinutesAt", () => {
  it("UTC is always 0", () => {
    expect(offsetMinutesAt("UTC", new Date("2025-01-15T00:00:00Z"))).toBe(0);
    expect(offsetMinutesAt("UTC", new Date("2025-07-15T00:00:00Z"))).toBe(0);
  });

  it("Asia/Kolkata is +330 (IST has no DST)", () => {
    expect(offsetMinutesAt("Asia/Kolkata", new Date("2025-01-15T00:00:00Z"))).toBe(330);
    expect(offsetMinutesAt("Asia/Kolkata", new Date("2025-07-15T00:00:00Z"))).toBe(330);
  });

  it("Asia/Kathmandu is +345 (45-minute offset)", () => {
    expect(offsetMinutesAt("Asia/Kathmandu", new Date("2025-01-15T00:00:00Z"))).toBe(345);
  });

  it("Asia/Tokyo is +540", () => {
    expect(offsetMinutesAt("Asia/Tokyo", new Date("2025-01-15T00:00:00Z"))).toBe(540);
  });

  it("Pacific/Chatham summer is +825 (13h45)", () => {
    // NZ DST in effect Jan
    expect(offsetMinutesAt("Pacific/Chatham", new Date("2025-01-15T00:00:00Z"))).toBe(825);
  });

  it("America/New_York switches across DST", () => {
    // Late winter (EST = -300)
    expect(offsetMinutesAt("America/New_York", new Date("2025-02-15T17:00:00Z"))).toBe(-300);
    // Mid summer (EDT = -240)
    expect(offsetMinutesAt("America/New_York", new Date("2025-07-15T17:00:00Z"))).toBe(-240);
  });

  it("Australia/Sydney switches across DST (opposite hemisphere)", () => {
    // Jan in Sydney = AEDT = +660
    expect(offsetMinutesAt("Australia/Sydney", new Date("2025-01-15T03:00:00Z"))).toBe(660);
    // July in Sydney = AEST = +600
    expect(offsetMinutesAt("Australia/Sydney", new Date("2025-07-15T03:00:00Z"))).toBe(600);
  });

  it("throws for invalid IANA zones", () => {
    expect(() => offsetMinutesAt("Mars/Olympus", new Date())).toThrow(RangeError);
    expect(() => offsetMinutesAt("", new Date())).toThrow(RangeError);
  });

  // Property: for any zone we know of, two neighbouring minutes must differ by at
  // most a 60-minute jump (DST transitions).
  it("property: offset never moves more than ±60 minutes across one minute", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "UTC",
          "America/New_York",
          "Europe/London",
          "Asia/Tokyo",
          "Australia/Sydney",
          "Pacific/Auckland",
        ),
        // Random instant in 2025
        fc.integer({ min: 0, max: 365 * 24 * 60 - 1 }),
        (zone, minute) => {
          const a = new Date(Date.UTC(2025, 0, 1) + minute * 60_000);
          const b = new Date(a.getTime() + 60_000);
          const diff = Math.abs(offsetMinutesAt(zone, b) - offsetMinutesAt(zone, a));
          return diff === 0 || diff === 60;
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("wallClockInZone", () => {
  it("Tokyo at UTC midnight is 09:00 local", () => {
    const wc = wallClockInZone(new Date("2025-01-15T00:00:00Z"), "Asia/Tokyo");
    expect(wc.hour).toBe(9);
    expect(wc.minute).toBe(0);
    expect(wc.day).toBe(15);
  });

  it("Asia/Kolkata at UTC noon is 17:30 local", () => {
    const wc = wallClockInZone(new Date("2025-01-15T12:00:00Z"), "Asia/Kolkata");
    expect(wc.hour).toBe(17);
    expect(wc.minute).toBe(30);
  });

  it("midnight rolls forward correctly across the date line", () => {
    const wc = wallClockInZone(new Date("2025-01-01T20:00:00Z"), "Pacific/Auckland");
    expect(wc.day).toBe(2);
  });

  it("rejects invalid zones", () => {
    expect(() => wallClockInZone(new Date(), "NotAZone")).toThrow(RangeError);
  });
});

describe("formatOffsetGmt", () => {
  it("formats whole-hour offsets", () => {
    expect(formatOffsetGmt(0)).toBe("GMT+0");
    expect(formatOffsetGmt(540)).toBe("GMT+9");
    expect(formatOffsetGmt(-480)).toBe("GMT-8");
  });

  it("formats fractional offsets with minutes", () => {
    expect(formatOffsetGmt(330)).toBe("GMT+5:30");
    expect(formatOffsetGmt(345)).toBe("GMT+5:45");
    expect(formatOffsetGmt(-570)).toBe("GMT-9:30");
  });
});
