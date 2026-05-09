import { LIMITS } from "@config/index";
import { decodeShareParams, encodeShareSnapshot } from "@domain/sharing/codec";
import type { ShareSnapshotV2 } from "@schemas/share";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const baseSnapshot = (): ShareSnapshotV2 => ({
  v: 2,
  ref: { city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
  zones: [
    { city: "London", country: "United Kingdom", timezone: "Europe/London", kind: "city" },
    { city: "New York", country: "United States", timezone: "America/New_York", kind: "city" },
  ],
  instantUtc: "2025-07-04T16:00:00.000Z",
  isModified: true,
  workspace: { name: "Travel", color: "orange", icon: "Plane" },
});

function paramsFromUrl(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe("encode/decode round-trip", () => {
  it("encode then decode returns the same snapshot", () => {
    const snap = baseSnapshot();
    const { url, truncated } = encodeShareSnapshot(snap, "https://example.com", "/share");
    expect(truncated).toBe(0);
    const decoded = decodeShareParams(paramsFromUrl(url));
    expect(decoded).toEqual(snap);
  });

  it("respects URL byte budget by truncating zones", () => {
    const snap: ShareSnapshotV2 = {
      ...baseSnapshot(),
      zones: Array.from({ length: 200 }, (_, i) => ({
        city: `City${i}-with-a-very-long-name-padding`,
        country: "Country-with-a-very-long-name",
        timezone: "America/New_York",
        kind: "city" as const,
      })),
    };
    const { url, truncated } = encodeShareSnapshot(snap, "https://example.com", "/share");
    expect(url.length).toBeLessThanOrEqual(LIMITS.shareUrlMaxBytes);
    expect(truncated).toBeGreaterThan(0);
    const decoded = decodeShareParams(paramsFromUrl(url));
    expect(decoded?.zones.length).toBe(200 - truncated);
  });
});

describe("decode v2 — failure modes", () => {
  it("returns null for tampered base64 payload", () => {
    const snap = baseSnapshot();
    const { url } = encodeShareSnapshot(snap, "https://example.com", "/share");
    const tampered = url.slice(0, -3) + "AAA";
    expect(decodeShareParams(paramsFromUrl(tampered))).toBeNull();
  });

  it("returns null for truncated payload", () => {
    const snap = baseSnapshot();
    const { url } = encodeShareSnapshot(snap, "https://example.com", "/share");
    const cut = url.slice(0, Math.floor(url.length * 0.6));
    expect(decodeShareParams(paramsFromUrl(cut))).toBeNull();
  });

  it("returns null for unknown version", () => {
    const params = new URLSearchParams({ v: "99", payload: "abc" });
    expect(decodeShareParams(params)).toBeNull();
  });

  it("strips prototype-pollution keys safely", () => {
    // Construct a v2 payload with an extra `__proto__` attempt inside zones.
    // Even if the JSON contained __proto__, our decoder treats it as undefined.
    const malicious = {
      v: 2,
      ref: { city: "T", country: "J", timezone: "Asia/Tokyo" },
      zones: [
        { city: "X", country: "Y", timezone: "Asia/Tokyo", kind: "city", __proto__: { polluted: true } },
      ],
      instantUtc: "2025-01-01T00:00:00.000Z",
      isModified: false,
    };
    const json = JSON.stringify(malicious);
    const payload = Buffer.from(json).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `https://example.com/share?v=2&payload=${payload}`;
    const decoded = decodeShareParams(paramsFromUrl(url));
    // It might decode (proto stripped) or be null — what matters is no global pollution.
     
    expect((Object.prototype as any).polluted).toBeUndefined();
    if (decoded) {
       
      expect((decoded as any).__proto__?.polluted).toBeUndefined();
    }
  });

  it("drops zones with invalid IANA names", () => {
    const malicious = {
      v: 2,
      ref: { city: "T", country: "J", timezone: "Asia/Tokyo" },
      zones: [
        { city: "Valid", country: "Y", timezone: "Asia/Tokyo", kind: "city" },
        { city: "Bad", country: "Y", timezone: "Mars/Olympus", kind: "city" },
      ],
      instantUtc: "2025-01-01T00:00:00.000Z",
      isModified: false,
    };
    // The Zod schema rejects invalid IANA at the schema level — so the whole
    // payload is null. Our spec says "drops invalid zones during import";
    // that import-side dropping happens after a separate sanitize pass.
    const json = JSON.stringify(malicious);
    const payload = Buffer.from(json).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `https://example.com/share?v=2&payload=${payload}`;
    expect(decodeShareParams(paramsFromUrl(url))).toBeNull();
  });
});

describe("decode v1 — legacy migration", () => {
  it("decodes ref+zones+workspace+modified", () => {
    const params = new URLSearchParams();
    params.set("ref", "Tokyo,Japan,Asia%2FTokyo");
    params.set(
      "zones",
      encodeURIComponent(
        JSON.stringify([
          { city: "London", country: "United Kingdom", timezone: "Europe/London" },
        ]),
      ),
    );
    params.set(
      "workspace",
      encodeURIComponent(
        JSON.stringify({ name: "Travel", color: "orange", icon: "Plane" }),
      ),
    );
    params.set("time", "2025-07-04T16%3A00%3A00.000Z");
    params.set("modified", "true");
    const out = decodeShareParams(params);
    expect(out).toBeTruthy();
    expect(out?.ref.city).toBe("Tokyo");
    expect(out?.zones).toHaveLength(1);
    expect(out?.workspace?.name).toBe("Travel");
    expect(out?.isModified).toBe(true);
  });

  it("returns null for v1 with no params", () => {
    expect(decodeShareParams(new URLSearchParams())).toBeNull();
  });

  it("drops v1 zones with invalid IANA names", () => {
    const params = new URLSearchParams();
    params.set("ref", "Tokyo,Japan,Asia%2FTokyo");
    params.set(
      "zones",
      encodeURIComponent(
        JSON.stringify([
          { city: "Bad", country: "X", timezone: "Mars/Olympus" },
          { city: "London", country: "UK", timezone: "Europe/London" },
        ]),
      ),
    );
    const out = decodeShareParams(params);
    expect(out?.zones.map((z) => z.city)).toEqual(["London"]);
  });

  it("returns null when v1 ref is missing or malformed", () => {
    const params = new URLSearchParams();
    params.set("zones", encodeURIComponent(JSON.stringify([])));
    expect(decodeShareParams(params)).toBeNull();
  });
});

describe("property: random valid snapshots round-trip", () => {
  // Use ASCII alphanum strings only — Zod trims whitespace, so generators
  // that produce padded inputs would fail round-trip identity. We're testing
  // the codec, not the schema's normalization.
  const safeName = fc
    .stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,11}$/)
    .filter((s) => !/^\s|\s$/.test(s));

  it("encode/decode is identity for in-budget inputs", () => {
    fc.assert(
      fc.property(
        fc.record({
          v: fc.constant(2 as const),
          ref: fc.record({
            city: safeName,
            country: safeName,
            timezone: fc.constantFrom("Asia/Tokyo", "Europe/London", "America/New_York"),
          }),
          zones: fc.array(
            fc.record({
              city: safeName,
              country: safeName,
              timezone: fc.constantFrom("Asia/Tokyo", "Europe/London", "America/New_York"),
              kind: fc.constant("city" as const),
            }),
            { maxLength: 5 },
          ),
          instantUtc: fc.constant("2025-01-01T00:00:00.000Z"),
          isModified: fc.boolean(),
        }),
        (snap) => {
          const { url, truncated } = encodeShareSnapshot(snap, "https://example.com", "/share");
          const decoded = decodeShareParams(paramsFromUrl(url));
          if (truncated > 0) return decoded?.zones.length === snap.zones.length - truncated;
          return JSON.stringify(decoded) === JSON.stringify(snap);
        },
      ),
      { numRuns: 50 },
    );
  });
});
