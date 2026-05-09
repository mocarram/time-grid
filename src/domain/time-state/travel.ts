import { offsetMinutesAt, wallClockInZone } from "@domain/timezone/offset";

import type { TimeState } from "./types";

export function nowInstant(): string {
  return new Date().toISOString();
}

export function instantToDate(instantUtc: string): Date {
  return new Date(instantUtc);
}

/**
 * Replace the wall-clock hour/minute in a given zone, keeping the date stable.
 * If the resulting wall clock falls in a DST gap, the result is normalized to
 * the next valid instant (≈ +offset jump). If the wall clock is ambiguous
 * (fall-back), we deterministically pick the EARLIER instant.
 */
export function setWallClockInZone(
  baseInstantUtc: string,
  zone: string,
  hour: number,
  minute: number,
): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`invalid hour: ${hour}`);
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError(`invalid minute: ${minute}`);
  }
  const wc = wallClockInZone(new Date(baseInstantUtc), zone);
  // Naive UTC instant assuming the wall clock is UTC, then subtract the
  // zone's offset to get the actual UTC instant. Because offset can change at
  // DST transitions, we iterate at most twice for stability.
  const naiveUtcMs = Date.UTC(wc.year, wc.month - 1, wc.day, hour, minute, 0);
  let candidateMs = naiveUtcMs - offsetMinutesAt(zone, new Date(naiveUtcMs)) * 60_000;
  for (let i = 0; i < 2; i++) {
    const reConverted = wallClockInZone(new Date(candidateMs), zone);
    if (reConverted.hour === hour && reConverted.minute === minute) {
      return new Date(candidateMs).toISOString();
    }
    // Adjust by current offset and try once more.
    candidateMs = naiveUtcMs - offsetMinutesAt(zone, new Date(candidateMs)) * 60_000;
  }
  return new Date(candidateMs).toISOString();
}

export function timeToMinutesInZone(instantUtc: string, zone: string): number {
  const wc = wallClockInZone(new Date(instantUtc), zone);
  return wc.hour * 60 + wc.minute;
}

export function minutesToInstantInZone(
  baseInstantUtc: string,
  zone: string,
  minutesOfDay: number,
): string {
  if (!Number.isInteger(minutesOfDay) || minutesOfDay < 0 || minutesOfDay > 1439) {
    throw new RangeError(`invalid minutesOfDay: ${minutesOfDay}`);
  }
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return setWallClockInZone(baseInstantUtc, zone, hour, minute);
}

export function changeDateInZone(
  baseInstantUtc: string,
  zone: string,
  year: number,
  month: number, // 1-12
  day: number, // 1-31
): string {
  const wc = wallClockInZone(new Date(baseInstantUtc), zone);
  const naiveUtcMs = Date.UTC(year, month - 1, day, wc.hour, wc.minute, 0);
  const candidateMs = naiveUtcMs - offsetMinutesAt(zone, new Date(naiveUtcMs)) * 60_000;
  return new Date(candidateMs).toISOString();
}

export function resetToNow(): TimeState {
  return { instantUtc: nowInstant(), isModified: false };
}

/**
 * Milliseconds remaining until the next minute boundary in **device** local
 * time. Used to schedule the live tick.
 */
export function msUntilNextMinuteBoundary(now: Date = new Date()): number {
  const seconds = now.getSeconds();
  const ms = now.getMilliseconds();
  return (60 - seconds) * 1000 - ms;
}
