import { formatRelativeTime } from "@ui/features/relative-time";
import { describe, expect, it } from "vitest";

const NOW = new Date("2025-07-04T12:00:00.000Z").getTime();
const at = (sec: number) => new Date(NOW - sec * 1000).toISOString();

describe("formatRelativeTime", () => {
  it("returns null for null/invalid input", () => {
    expect(formatRelativeTime(null)).toBeNull();
    expect(formatRelativeTime("not-a-date", NOW)).toBeNull();
  });

  it("seconds: 'just now' for ≤ 1s", () => {
    expect(formatRelativeTime(at(0), NOW)).toBe("just now");
    expect(formatRelativeTime(at(1), NOW)).toBe("just now");
  });

  it("seconds: plural form > 1s", () => {
    expect(formatRelativeTime(at(45), NOW)).toBe("45 seconds ago");
  });

  it("minutes / hours / days / months / years", () => {
    expect(formatRelativeTime(at(60 * 5), NOW)).toBe("5 minutes ago");
    expect(formatRelativeTime(at(60 * 60 * 1), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(at(60 * 60 * 24 * 1), NOW)).toBe("1 day ago");
    expect(formatRelativeTime(at(60 * 60 * 24 * 35), NOW)).toBe("1 month ago");
    expect(formatRelativeTime(at(60 * 60 * 24 * 30 * 13), NOW)).toBe("1 year ago");
  });

  it("never returns negative durations (future timestamps clamp to 'just now')", () => {
    const future = new Date(NOW + 10_000).toISOString();
    expect(formatRelativeTime(future, NOW)).toBe("just now");
  });
});
