import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=10&` +
        `featuretype=city&` +
        `extratags=1`,
      {
        headers: {
          "User-Agent": "WorldClock/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch cities");
    }

    const data = await response.json();

    const cities = data
      .filter((item: any) => {
        const placeType = item.type;
        return (
          ["city", "town", "village", "municipality"].includes(placeType) ||
          item.class === "place"
        );
      })
      .map((item: any) => {
        const address = item.address || {};
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          item.display_name.split(",")[0];
        const country = address.country || "Unknown";
        const countryCode = address.country_code?.toUpperCase() || "";

        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        return {
          id: `${item.place_id}`,
          city: city.trim(),
          country: country.trim(),
          countryCode,
          latitude: lat,
          longitude: lon,
          displayName: item.display_name,
        };
      })
      .filter((city: any) => city.city && city.country)
      .slice(0, 8);

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}