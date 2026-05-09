import { isValidIanaZone } from "@domain/timezone/iana";
import { offsetMinutesAt } from "@domain/timezone/offset";
import { logger } from "@infra/logger/index";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

const log = logger.scoped("api.timezone");

export const dynamic = "force-dynamic";

const FALLBACK_BY_LON: Record<string, string> = {
  "-12": "Pacific/Wake",
  "-11": "Pacific/Pago_Pago",
  "-10": "Pacific/Honolulu",
  "-9": "America/Anchorage",
  "-8": "America/Los_Angeles",
  "-7": "America/Denver",
  "-6": "America/Chicago",
  "-5": "America/New_York",
  "-4": "America/Halifax",
  "-3": "America/Sao_Paulo",
  "-2": "Atlantic/South_Georgia",
  "-1": "Atlantic/Azores",
  "0": "Europe/London",
  "1": "Europe/Paris",
  "2": "Europe/Berlin",
  "3": "Europe/Moscow",
  "4": "Asia/Dubai",
  "5": "Asia/Karachi",
  "6": "Asia/Dhaka",
  "7": "Asia/Bangkok",
  "8": "Asia/Shanghai",
  "9": "Asia/Tokyo",
  "10": "Australia/Sydney",
  "11": "Pacific/Norfolk",
  "12": "Pacific/Auckland",
};

function estimateZoneFromLon(lon: number): string {
  const key = String(Math.max(-12, Math.min(12, Math.round(lon / 15))));
  return FALLBACK_BY_LON[key] ?? "UTC";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const lat = latRaw === null ? NaN : parseFloat(latRaw);
  const lng = lngRaw === null ? NaN : parseFloat(lngRaw);
  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  let zone: string | null = null;
  let city: string | null = null;
  let country: string | null = null;

  // Provider 1: BigDataCloud
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (r.ok) {
      const j = (await r.json()) as Record<string, unknown>;
      const tz = typeof j.timezone === "string" ? j.timezone : null;
      if (tz && isValidIanaZone(tz)) zone = tz;
      city = (typeof j.city === "string" && j.city) || (typeof j.locality === "string" && j.locality) || null;
      country = (typeof j.countryName === "string" && j.countryName) || null;
    }
  } catch (e) {
    log.warn("bigdatacloud failed", { error: String(e) });
  }

  // Provider 2: Nominatim reverse geocode (only if needed)
  if (!city || !country) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            "User-Agent": "TimeGrid/0.2 (+https://github.com/mocarram/time-grid)",
            "Accept-Language": "en",
          },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (r.ok) {
        const j = (await r.json()) as Record<string, unknown>;
        const address = (j.address as Record<string, string> | undefined) ?? {};
        if (!city) {
          city = address.city ?? address.town ?? address.village ?? address.municipality ?? null;
        }
        if (!country) country = address.country ?? null;
      }
    } catch (e) {
      log.warn("nominatim reverse failed", { error: String(e) });
    }
  }

  if (!zone) zone = estimateZoneFromLon(lng);

  return NextResponse.json({
    city: city ?? "Unknown",
    country: country ?? "Unknown",
    timezone: zone,
    offsetMinutes: offsetMinutesAt(zone, new Date()),
  });
}
