// IANA zone validation. We prefer Intl.supportedValuesOf("timeZone") when
// available (Node 18.13+, modern browsers). Otherwise we probe with
// Intl.DateTimeFormat — an invalid zone throws RangeError.

let cachedSupportedZones: Set<string> | null = null;

function getSupportedZones(): Set<string> | null {
  if (cachedSupportedZones) return cachedSupportedZones;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intlAny = Intl as any;
  if (typeof intlAny.supportedValuesOf === "function") {
    try {
      const list = intlAny.supportedValuesOf("timeZone") as string[];
      if (Array.isArray(list) && list.length > 0) {
        cachedSupportedZones = new Set(list);
        cachedSupportedZones.add("UTC");
        return cachedSupportedZones;
      }
    } catch {
      // fall through
    }
  }
  return null;
}

const probeCache = new Map<string, boolean>();

export function isValidIanaZone(zone: string): boolean {
  if (typeof zone !== "string") return false;
  if (zone.length === 0 || zone.length > 80) return false;
  // Reject obviously malformed values early — IANA names are ASCII and use
  // alnum, /, _, -, +, ".".
  if (!/^[A-Za-z0-9+_/.-]+$/.test(zone)) return false;
  const supported = getSupportedZones();
  if (supported && supported.has(zone)) return true;
  // Fall through to a Date-time-format probe so legacy/canonical names
  // (e.g. Asia/Kolkata canonicalized to Asia/Calcutta in some Node builds)
  // are still recognised.
  const cached = probeCache.get(zone);
  if (cached !== undefined) return cached;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    probeCache.set(zone, true);
    return true;
  } catch {
    probeCache.set(zone, false);
    return false;
  }
}

export function listSupportedZones(): readonly string[] {
  const set = getSupportedZones();
  if (set) return [...set].sort();
  // Minimal fallback if runtime lacks supportedValuesOf
  return [
    "UTC",
    "America/Los_Angeles",
    "America/New_York",
    "Europe/London",
    "Europe/Paris",
    "Asia/Kolkata",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
}
