import { isValidIanaZone } from "@domain/timezone/iana";
import { logger } from "@infra/logger/index";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

const log = logger.scoped("api.ip-timezone");

export const dynamic = "force-dynamic";

interface DetectionResult {
  city: string;
  country: string;
  timezone: string;
  source: "ip" | "browser";
}

function clientIp(request: NextRequest): string | null {
  const headers = request.headers;
  const candidates = [
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-real-ip"),
  ];
  for (const c of candidates) {
    if (c && c.length > 0) {
      const lower = c.toLowerCase();
      if (lower === "127.0.0.1" || lower === "::1" || lower.includes("localhost")) {
        return null;
      }
      return c;
    }
  }
  return null;
}

async function tryIpapi(ip: string): Promise<DetectionResult | null> {
  try {
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { "User-Agent": "TimeGrid/0.2" },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    if (j.error) return null;
    const tz = typeof j.timezone === "string" ? j.timezone : null;
    if (!tz || !isValidIanaZone(tz)) return null;
    return {
      city: typeof j.city === "string" ? j.city : "Unknown",
      country: typeof j.country_name === "string" ? j.country_name : "Unknown",
      timezone: tz,
      source: "ip",
    };
  } catch (e) {
    log.warn("ipapi.co failed", { error: String(e) });
    return null;
  }
}

async function tryIpApi(ip: string): Promise<DetectionResult | null> {
  try {
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,timezone`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    if (j.status !== "success") return null;
    const tz = typeof j.timezone === "string" ? j.timezone : null;
    if (!tz || !isValidIanaZone(tz)) return null;
    return {
      city: typeof j.city === "string" ? j.city : "Unknown",
      country: typeof j.country === "string" ? j.country : "Unknown",
      timezone: tz,
      source: "ip",
    };
  } catch (e) {
    log.warn("ip-api.com failed", { error: String(e) });
    return null;
  }
}

function browserFallback(request: NextRequest): DetectionResult {
  const browserTz = request.headers.get("x-timezone")?.trim();
  if (browserTz && isValidIanaZone(browserTz) && browserTz !== "UTC") {
    const city = browserTz.split("/").pop()?.replace(/_/g, " ") ?? "Local";
    const country = browserTz.split("/")[0] ?? "Local";
    return { city, country, timezone: browserTz, source: "browser" };
  }
  return { city: "UTC", country: "UTC", timezone: "UTC", source: "browser" };
}

export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  if (ip) {
    const result = (await tryIpapi(ip)) ?? (await tryIpApi(ip));
    if (result) return NextResponse.json(result);
  }
  return NextResponse.json(browserFallback(request));
}
