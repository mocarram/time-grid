import { describe, expect, it } from "vitest";

import { isValidIanaZone, listSupportedZones } from "@domain/timezone/iana";

describe("iana.isValidIanaZone", () => {
  it("accepts well-known zones", () => {
    expect(isValidIanaZone("UTC")).toBe(true);
    expect(isValidIanaZone("America/New_York")).toBe(true);
    expect(isValidIanaZone("Asia/Kolkata")).toBe(true);
    expect(isValidIanaZone("Asia/Kathmandu")).toBe(true);
    expect(isValidIanaZone("Pacific/Chatham")).toBe(true);
    expect(isValidIanaZone("Antarctica/Troll")).toBe(true);
  });

  it("rejects empty / non-string / oversize", () => {
    expect(isValidIanaZone("")).toBe(false);
    // @ts-expect-error - intentional bad type
    expect(isValidIanaZone(undefined)).toBe(false);
    // @ts-expect-error - intentional bad type
    expect(isValidIanaZone(123)).toBe(false);
    expect(isValidIanaZone("a".repeat(81))).toBe(false);
  });

  it("rejects characters outside the IANA charset (XSS / unicode / shell metas)", () => {
    expect(isValidIanaZone("<script>alert(1)</script>")).toBe(false);
    expect(isValidIanaZone("America/New_York; rm -rf /")).toBe(false);
    expect(isValidIanaZone("東京")).toBe(false);
  });

  it("rejects unknown zones", () => {
    expect(isValidIanaZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidIanaZone("NotAZone")).toBe(false);
    expect(isValidIanaZone("America/Notreal")).toBe(false);
  });

  it("listSupportedZones returns at least UTC and includes major IANA zones", () => {
    const zones = listSupportedZones();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("UTC");
  });
});
