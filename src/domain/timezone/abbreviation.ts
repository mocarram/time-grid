// Resolve display abbreviations (e.g. "PST", "IST") for a (zone, instant) pair.
// We rely on Intl.DateTimeFormat with timeZoneName: "short". Some zones return
// GMT-offset strings ("GMT+5") which we keep as-is.

import { offsetMinutesAt, formatOffsetGmt } from "./offset";

export interface ZoneDisplay {
  abbreviation: string;
  description: string;
}

const DESCRIPTIONS: Record<string, string> = {
  EST: "Eastern Standard Time",
  EDT: "Eastern Daylight Time",
  CDT: "Central Daylight Time",
  CST: "Central Standard Time",
  MST: "Mountain Standard Time",
  MDT: "Mountain Daylight Time",
  PST: "Pacific Standard Time",
  PDT: "Pacific Daylight Time",
  AKST: "Alaska Standard Time",
  AKDT: "Alaska Daylight Time",
  HST: "Hawaii Standard Time",
  GMT: "Greenwich Mean Time",
  BST: "British Summer Time",
  CET: "Central European Time",
  CEST: "Central European Summer Time",
  EET: "Eastern European Time",
  EEST: "Eastern European Summer Time",
  WET: "Western European Time",
  WEST: "Western European Summer Time",
  MSK: "Moscow Standard Time",
  JST: "Japan Standard Time",
  KST: "Korea Standard Time",
  IST: "India Standard Time",
  PKT: "Pakistan Standard Time",
  SGT: "Singapore Standard Time",
  HKT: "Hong Kong Time",
  ICT: "Indochina Time",
  WIB: "Western Indonesian Time",
  WIT: "Eastern Indonesian Time",
  WITA: "Central Indonesian Time",
  AEST: "Australian Eastern Standard Time",
  AEDT: "Australian Eastern Daylight Time",
  ACST: "Australian Central Standard Time",
  ACDT: "Australian Central Daylight Time",
  AWST: "Australian Western Standard Time",
  NZST: "New Zealand Standard Time",
  NZDT: "New Zealand Daylight Time",
  CAT: "Central Africa Time",
  EAT: "East Africa Time",
  WAT: "West Africa Time",
  SAST: "South Africa Standard Time",
  BRT: "Brasília Time",
  ART: "Argentina Time",
  CLT: "Chile Standard Time",
  CLST: "Chile Summer Time",
  PET: "Peru Time",
  COT: "Colombia Time",
  VET: "Venezuela Time",
  AST: "Atlantic Standard Time",
  ADT: "Atlantic Daylight Time",
  NST: "Newfoundland Standard Time",
  NDT: "Newfoundland Daylight Time",
};

/**
 * Some runtimes (e.g. older Node ICU builds) return "GMT+5:30" instead of
 * "IST" for IANA zones we treat as canonical. This map enforces a stable
 * abbreviation across platforms for the zones our users care about.
 */
const CANONICAL_ABBREVIATIONS: Record<string, string> = {
  "Asia/Kolkata": "IST",
  "Asia/Calcutta": "IST",
  "Asia/Jerusalem": "IST",
  "Europe/Dublin": "IST",
};

function describe(abbr: string, zone: string): string {
  // Disambiguate a few collisions where the abbreviation is reused.
  if (abbr === "CST") {
    if (zone.startsWith("America/") || zone.startsWith("US/")) return "Central Standard Time";
    if (zone.startsWith("Asia/")) return "China Standard Time";
  }
  if (abbr === "IST") {
    if (zone === "Asia/Kolkata") return "India Standard Time";
    if (zone === "Asia/Jerusalem") return "Israel Standard Time";
    if (zone === "Europe/Dublin") return "Irish Standard Time";
  }
  return DESCRIPTIONS[abbr] ?? "Local Time";
}

export function zoneDisplay(zone: string, instant: Date = new Date()): ZoneDisplay {
  let abbreviation = "";
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    });
    const parts = fmt.formatToParts(instant);
    abbreviation = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    abbreviation = "";
  }
  // If the runtime returned a GMT-style fallback for a zone we treat as
  // canonical (e.g. IST), prefer the canonical short name.
  if (!abbreviation || /^GMT/i.test(abbreviation) || abbreviation === "Z") {
    const canonical = CANONICAL_ABBREVIATIONS[zone];
    if (canonical) abbreviation = canonical;
  }
  if (!abbreviation || abbreviation === "Z") {
    abbreviation = formatOffsetGmt(offsetMinutesAt(zone, instant));
  }
  return { abbreviation, description: describe(abbreviation, zone) };
}
