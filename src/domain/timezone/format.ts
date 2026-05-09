// Pure formatting helpers that operate on a (UTC instant, IANA zone) pair.
// They never depend on the host machine's local timezone.

import { wallClockInZone } from "./offset";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0]!;
}

export interface FormatOptions {
  hour12?: boolean;
}

export function formatTimeInZone(
  instant: Date,
  timeZone: string,
  opts: FormatOptions = {},
): string {
  const wc = wallClockInZone(instant, timeZone);
  const { hour12 = true } = opts;
  if (!hour12) {
    return `${wc.hour.toString().padStart(2, "0")}:${wc.minute.toString().padStart(2, "0")}`;
  }
  const period = wc.hour >= 12 ? "PM" : "AM";
  const h12 = wc.hour % 12 === 0 ? 12 : wc.hour % 12;
  return `${h12}:${wc.minute.toString().padStart(2, "0")} ${period}`;
}

export function formatDateInZone(instant: Date, timeZone: string): string {
  const wc = wallClockInZone(instant, timeZone);
  return `${wc.day}${ordinalSuffix(wc.day)} ${MONTH_NAMES[wc.month - 1]}`;
}

export function formatDayInZone(instant: Date, timeZone: string): string {
  const wc = wallClockInZone(instant, timeZone);
  // Compute weekday from the wall-clock components — DST-stable.
  const utcMs = Date.UTC(wc.year, wc.month - 1, wc.day);
  const weekday = new Date(utcMs).getUTCDay();
  return DAY_NAMES[weekday]!;
}

/**
 * Combined formatter: returns a UI bag for a card.
 */
export function formatCardLabels(instant: Date, timeZone: string, opts: FormatOptions = {}) {
  return {
    time: formatTimeInZone(instant, timeZone, opts),
    date: formatDateInZone(instant, timeZone),
    day: formatDayInZone(instant, timeZone),
  };
}
