import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  try {
    // Single comprehensive search with better parameters
    const searchUrl = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=20&` +
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

    // Process and filter results with improved logic
    const cities = data
      .filter((item: any) => {
        const placeType = item.type;
        const placeClass = item.class;
        const addressType = item.addresstype;
        
        // Prioritize actual cities, towns, villages over administrative boundaries
        const validCityTypes = ["city", "town", "village", "municipality", "hamlet", "suburb"];
        const isActualPlace = validCityTypes.includes(placeType) || 
                             validCityTypes.includes(addressType) ||
                             (placeClass === "place" && placeType !== "administrative");
        
        // Exclude administrative boundaries unless they're the only option
        const isAdministrative = placeType === "administrative" || addressType === "state" || addressType === "province";
        
        // Ensure we have basic location data
        const hasCoordinates = item.lat && item.lon;
        const hasAddress = item.address || item.display_name;
        
        return isActualPlace && !isAdministrative && hasCoordinates && hasAddress;
      })
      .map((item: any) => {
        const address = item.address || {};
        
        // Extract city name with better fallback logic
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

        // Calculate relevance score with improved logic
        const queryLower = query.toLowerCase();
        const cityLower = cityName.toLowerCase();
        
        let relevanceScore = 0;
        
        // Exact match gets highest score
        if (cityLower === queryLower) {
          relevanceScore = 1000;
        }
        // Starts with query gets high score
        else if (cityLower.startsWith(queryLower)) {
          relevanceScore = 800;
        }
        // Contains query gets medium score
        else if (cityLower.includes(queryLower)) {
          relevanceScore = 600;
        }
        // Partial match gets lower score
        else {
          relevanceScore = 300;
        }

        // Boost score based on place type priority
        const placeType = item.type;
        const addressType = item.addresstype;
        
        if (placeType === "city" || addressType === "city") {
          relevanceScore += 200;
        } else if (placeType === "town" || addressType === "town") {
          relevanceScore += 150;
        } else if (placeType === "village" || addressType === "village") {
          relevanceScore += 100;
        }

        // Boost score for higher importance in OSM (but don't let it override exact matches)
        const importance = parseFloat(item.importance || 0);
        relevanceScore += importance * 50;

        // Boost score for higher place rank (lower numbers are more important)
        const placeRank = parseInt(item.place_rank || 30);
        relevanceScore += Math.max(0, (30 - placeRank) * 5);

        return {
          id: `${item.place_id}`,
          city: cityName.trim(),
          country: country.trim(),
          countryCode,
          state: state.trim(),
          latitude: lat,
          longitude: lon,
          displayName: item.display_name,
          relevanceScore,
          importance,
          placeType,
          addressType,
          placeRank
        };
      })
      .filter((city: any) => {
        // Filter out results with empty city names or invalid coordinates
        return city.city && 
               city.country && 
               city.city !== "Unknown" &&
               !isNaN(city.latitude) && 
               !isNaN(city.longitude) &&
               Math.abs(city.latitude) <= 90 &&
               Math.abs(city.longitude) <= 180;
      })
      // Remove duplicates based on city name and country, keeping the highest scored one
      .reduce((unique: any[], current: any) => {
        const existingIndex = unique.findIndex(item => 
          item.city.toLowerCase() === current.city.toLowerCase() &&
          item.country.toLowerCase() === current.country.toLowerCase()
        );
        
        if (existingIndex === -1) {
          unique.push(current);
        } else {
          // Keep the one with higher relevance score
          if (current.relevanceScore > unique[existingIndex].relevanceScore) {
            unique[existingIndex] = current;
          }
        }
        
        return unique;
      }, [])
      // Sort by relevance score (highest first)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      // Take top 8 results
      .slice(0, 8)
      // Clean up the response
      .map(({ relevanceScore, importance, placeType, addressType, placeRank, ...city }) => city);

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}