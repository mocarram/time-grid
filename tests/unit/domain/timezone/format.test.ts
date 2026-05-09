import {
  formatCardLabels,
  formatDateInZone,
  formatDayInZone,
  formatTimeInZone,
} from "@domain/timezone/format";
import { describe, expect, it } from "vitest";

describe("formatTimeInZone", () => {
  it("12-hour format by default", () => {
    expect(formatTimeInZone(new Date("2025-01-15T00:00:00Z"), "UTC")).toBe("12:00 AM");
    expect(formatTimeInZone(new Date("2025-01-15T12:00:00Z"), "UTC")).toBe("12:00 PM");
    expect(formatTimeInZone(new Date("2025-01-15T13:30:00Z"), "UTC")).toBe("1:30 PM");
  });

  it("24-hour format when requested", () => {
    expect(formatTimeInZone(new Date("2025-01-15T00:00:00Z"), "UTC", { hour12: false })).toBe(
      "00:00",
    );
    expect(formatTimeInZone(new Date("2025-01-15T13:30:00Z"), "UTC", { hour12: false })).toBe(
      "13:30",
    );
  });

  it("respects the target timezone, not the local one", () => {
    expect(formatTimeInZone(new Date("2025-01-15T00:00:00Z"), "Asia/Tokyo")).toBe("9:00 AM");
    expect(formatTimeInZone(new Date("2025-01-15T00:00:00Z"), "Asia/Kolkata")).toBe("5:30 AM");
    expect(formatTimeInZone(new Date("2025-01-15T00:00:00Z"), "Asia/Kathmandu")).toBe("5:45 AM");
  });
});

describe("formatDateInZone", () => {
  it("formats with ordinal suffix", () => {
    expect(formatDateInZone(new Date("2025-01-01T12:00:00Z"), "UTC")).toBe("1st January");
    expect(formatDateInZone(new Date("2025-01-02T12:00:00Z"), "UTC")).toBe("2nd January");
    expect(formatDateInZone(new Date("2025-01-03T12:00:00Z"), "UTC")).toBe("3rd January");
    expect(formatDateInZone(new Date("2025-01-04T12:00:00Z"), "UTC")).toBe("4th January");
    expect(formatDateInZone(new Date("2025-01-11T12:00:00Z"), "UTC")).toBe("11th January");
    expect(formatDateInZone(new Date("2025-01-21T12:00:00Z"), "UTC")).toBe("21st January");
  });

  it("respects target zone for cross-day moments", () => {
    // 23:00 UTC on Dec 31 is Jan 1 in Auckland (+13)
    expect(
      formatDateInZone(new Date("2024-12-31T23:00:00Z"), "Pacific/Auckland"),
    ).toBe("1st January");
  });
});

describe("formatDayInZone", () => {
  it("returns weekday name in target zone", () => {
    // 2025-01-15 was a Wednesday in UTC.
    expect(formatDayInZone(new Date("2025-01-15T00:00:00Z"), "UTC")).toBe("Wednesday");
    // Same instant in Tokyo is still 2025-01-15, but in Pacific/Auckland
    // (+13) it is also Wednesday — checked separately for cross-day.
  });

  it("rolls correctly when the date crosses in the target zone", () => {
    // Jan 1 00:00 UTC, in Honolulu (-10) is still Dec 31, a Tuesday.
    expect(formatDayInZone(new Date("2025-01-01T00:00:00Z"), "Pacific/Honolulu")).toBe("Tuesday");
  });
});

describe("formatCardLabels", () => {
  it("returns time/date/day bag", () => {
    const labels = formatCardLabels(new Date("2025-07-04T16:00:00Z"), "America/New_York");
    expect(labels.time).toBe("12:00 PM");
    expect(labels.date).toBe("4th July");
    expect(labels.day).toBe("Friday");
  });
});
