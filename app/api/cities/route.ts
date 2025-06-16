import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  try {
    // Simple search - let the API do the work and show all results
    const searchUrl = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=15&` +
      `extratags=1&` +
      `dedupe=1`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "WorldClock/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ cities: [] });
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json({ cities: [] });
    }

    // Process results with minimal filtering - just ensure we have valid data
    const cities = data
      .filter((item: any) => {
        // Only filter out results that are clearly not places or lack basic data
        const hasCoordinates = item.lat && item.lon;
        const hasName = item.name || item.display_name;
        
        return hasCoordinates && hasName;
      })
      .map((item: any) => {
        const address = item.address || {};
        
        // Extract city name - prefer the main name, then address components
        const cityName = 
          item.name ||
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.hamlet ||
          address.suburb ||
          item.display_name.split(",")[0].trim();

        const country = address.country || "Unknown";
        const countryCode = address.country_code?.toUpperCase() || "";
        const state = address.state || address.province || "";

        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        // Add type information for user to see what kind of place it is
        const placeType = item.type;
        const placeClass = item.class;
        const addressType = item.addresstype;
        
        // Create a readable place type description
        let placeDescription = "";
        if (placeType === "administrative") {
          placeDescription = "Administrative Region";
        } else if (placeType === "city" || addressType === "city") {
          placeDescription = "City";
        } else if (placeType === "town" || addressType === "town") {
          placeDescription = "Town";
        } else if (placeType === "village" || addressType === "village") {
          placeDescription = "Village";
        } else if (placeType === "municipality") {
          placeDescription = "Municipality";
        } else if (placeType === "hamlet") {
          placeDescription = "Hamlet";
        } else if (placeType === "suburb") {
          placeDescription = "Suburb";
        } else {
          placeDescription = placeType || placeClass || "Place";
        }

        return {
          id: `${item.place_id}`,
          city: cityName.trim(),
          country: country.trim(),
          countryCode,
          state: state.trim(),
          latitude: lat,
          longitude: lon,
          displayName: item.display_name,
          placeType: placeDescription,
          importance: parseFloat(item.importance || 0)
        };
      })
      .filter((city: any) => {
        // Only filter out clearly invalid results
        return city.city && 
               city.country && 
               city.city !== "Unknown" &&
               !isNaN(city.latitude) && 
               !isNaN(city.longitude) &&
               Math.abs(city.latitude) <= 90 &&
               Math.abs(city.longitude) <= 180;
      })
      // Sort by importance (OSM's own relevance scoring)
      .sort((a: any, b: any) => b.importance - a.importance)
      // Take top 12 results to show more options
      .slice(0, 12);

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}