// Reliable offset math built on Intl.DateTimeFormat parts. We extract the wall
// clock components in the target zone for a UTC instant, reassemble them as
// "what UTC instant would represent that wall clock?" and compare. The
// difference is the zone's offset at that instant — DST-correct.

import { isValidIanaZone } from "./iana";

const DT_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = DT_FORMATTER_CACHE.get(timeZone);
  if (cached) return cached;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  DT_FORMATTER_CACHE.set(timeZone, fmt);
  return fmt;
}

export interface WallClock {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
}

export function wallClockInZone(instant: Date, timeZone: string): WallClock {
  if (!isValidIanaZone(timeZone)) {
    throw new RangeError(`invalid timezone: ${timeZone}`);
  }
  const parts = getFormatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`missing ${type} in formatted parts`);
    return parseInt(part.value, 10);
  };
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24, // h23 may render 24 for midnight in older runtimes
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Offset of `timeZone` at `instant` in minutes east of UTC.
 * Positive = ahead of UTC (e.g. Asia/Tokyo → +540).
 * Negative = behind UTC (e.g. America/Los_Angeles → -480 / -420 in DST).
 */
export function offsetMinutesAt(timeZone: string, instant: Date = new Date()): number {
  const wc = wallClockInZone(instant, timeZone);
  // Reassemble the wall-clock as if it were UTC, then subtract the original UTC instant.
  const asUtcMs = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
  const diffMs = asUtcMs - instant.getTime();
  return Math.round(diffMs / 60_000);
}

/**
 * Format an offset like "GMT+5:30" or "GMT-8".
 */
export function formatOffsetGmt(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0
    ? `GMT${sign}${hours}`
    : `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}
