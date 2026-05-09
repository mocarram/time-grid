import { zoneDisplay } from "@domain/timezone/abbreviation";
import { describe, expect, it } from "vitest";

describe("zoneDisplay", () => {
  it("New York winter is EST", () => {
    const display = zoneDisplay("America/New_York", new Date("2025-01-15T17:00:00Z"));
    expect(display.abbreviation).toBe("EST");
    expect(display.description).toBe("Eastern Standard Time");
  });

  it("New York summer is EDT", () => {
    const display = zoneDisplay("America/New_York", new Date("2025-07-15T17:00:00Z"));
    expect(display.abbreviation).toBe("EDT");
    expect(display.description).toBe("Eastern Daylight Time");
  });

  it("disambiguates IST for India", () => {
    const display = zoneDisplay("Asia/Kolkata", new Date("2025-01-15T00:00:00Z"));
    expect(display.abbreviation).toBe("IST");
    expect(display.description).toBe("India Standard Time");
  });

  it("disambiguates IST for Israel", () => {
    const display = zoneDisplay("Asia/Jerusalem", new Date("2025-01-15T00:00:00Z"));
    expect(display.abbreviation).toBe("IST");
    expect(display.description).toBe("Israel Standard Time");
  });

  it("falls back to GMT offset for zones without a named abbreviation", () => {
    // Asia/Kolkata's runtime abbreviation is well-known IST. For an exotic
    // zone like Asia/Kathmandu, Intl typically returns "GMT+5:45".
    const display = zoneDisplay("Asia/Kathmandu", new Date("2025-01-15T00:00:00Z"));
    expect(display.abbreviation).toMatch(/GMT\+5:45/);
  });

  it("returns description fallback for unknown abbreviations", () => {
    const display = zoneDisplay("Antarctica/Troll", new Date("2025-01-15T00:00:00Z"));
    // Result varies by runtime; we just assert structure.
    expect(typeof display.abbreviation).toBe("string");
    expect(display.abbreviation.length).toBeGreaterThan(0);
    expect(typeof display.description).toBe("string");
  });
});
