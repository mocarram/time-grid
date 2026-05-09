import { LIMITS } from "@config/index";
import { logger } from "@infra/logger/index";
import { CitiesResponseSchema } from "@schemas/api";
import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const log = logger.scoped("api.cities");

const NominatimItem = z.object({
  place_id: z.union([z.string(), z.number()]).optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  name: z.string().optional(),
  display_name: z.string().optional(),
  type: z.string().optional(),
  class: z.string().optional(),
  addresstype: z.string().optional(),
  importance: z.union([z.number(), z.string()]).optional(),
  address: z
    .object({
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      municipality: z.string().optional(),
      hamlet: z.string().optional(),
      suburb: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
      state: z.string().optional(),
      province: z.string().optional(),
    })
    .optional(),
});

const NominatimResponse = z.array(NominatimItem);

const placeTypeOf = (item: z.infer<typeof NominatimItem>): string => {
  const t = item.type ?? item.class ?? item.addresstype ?? "Place";
  const map: Record<string, string> = {
    administrative: "Administrative Region",
    city: "City",
    town: "Town",
    village: "Village",
    municipality: "Municipality",
    hamlet: "Hamlet",
    suburb: "Suburb",
  };
  return map[t] ?? t;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (query.length < LIMITS.searchMinChars) {
    return NextResponse.json({ cities: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "15");
  url.searchParams.set("accept-language", "en");
  url.searchParams.set("dedupe", "1");

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "TimeGrid/0.2 (+https://github.com/mocarram/time-grid)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(LIMITS.searchUpstreamTimeoutMs),
    });
    if (!upstream.ok) {
      log.warn("nominatim non-ok", { status: upstream.status });
      return NextResponse.json({ cities: [] });
    }
    const json = await upstream.json();
    const parsed = NominatimResponse.safeParse(json);
    if (!parsed.success) {
      log.warn("nominatim shape unexpected", {
        issue: parsed.error.issues[0]?.message,
      });
      return NextResponse.json({ cities: [] });
    }
    const cities = parsed.data
      .filter((item) => Boolean(item.lat && item.lon && (item.name || item.display_name)))
      .map((item) => {
        const lat = parseFloat(item.lat ?? "");
        const lon = parseFloat(item.lon ?? "");
        const address = item.address ?? {};
        const cityName = (
          item.name ||
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.hamlet ||
          address.suburb ||
          item.display_name?.split(",")[0]?.trim() ||
          ""
        ).trim();
        return {
          id: String(item.place_id ?? `${lat},${lon}`),
          city: cityName,
          country: (address.country ?? "Unknown").trim(),
          countryCode: (address.country_code ?? "").toUpperCase(),
          state: (address.state ?? address.province ?? "").trim(),
          latitude: lat,
          longitude: lon,
          displayName: item.display_name ?? cityName,
          placeType: placeTypeOf(item),
          importance:
            typeof item.importance === "string"
              ? parseFloat(item.importance) || 0
              : item.importance ?? 0,
        };
      })
      .filter(
        (city) =>
          city.city &&
          city.country &&
          city.city !== "Unknown" &&
          !Number.isNaN(city.latitude) &&
          !Number.isNaN(city.longitude) &&
          Math.abs(city.latitude) <= 90 &&
          Math.abs(city.longitude) <= 180,
      )
      .sort((a, b) => b.importance - a.importance)
      .slice(0, LIMITS.searchResultsCap);

    const validated = CitiesResponseSchema.safeParse({ cities });
    if (!validated.success) {
      log.warn("validation failed for outgoing payload", {
        issue: validated.error.issues[0]?.message,
      });
      return NextResponse.json({ cities: [] });
    }
    return NextResponse.json(validated.data);
  } catch (error) {
    log.error("cities upstream failure", { error: String(error) });
    return NextResponse.json({ cities: [] });
  }
}
