import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  try {
    // Try multiple search strategies for better results
    const searchStrategies = [
      // Strategy 1: Exact city search with high priority
      {
        url: `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=15&` +
          `featuretype=city&` +
          `extratags=1&` +
          `countrycodes=&` +
          `dedupe=1`,
        priority: 1
      },
      // Strategy 2: Broader search including towns and villages
      {
        url: `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=10&` +
          `class=place&` +
          `type=city,town,village,municipality&` +
          `extratags=1&` +
          `dedupe=1`,
        priority: 2
      }
    ];

    let allResults: any[] = [];

    // Execute search strategies
    for (const strategy of searchStrategies) {
      try {
        const response = await fetch(strategy.url, {
          headers: {
            "User-Agent": "WorldClock/1.0",
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Add priority to results
          const resultsWithPriority = data.map((item: any) => ({
            ...item,
            searchPriority: strategy.priority
          }));
          allResults = [...allResults, ...resultsWithPriority];
        }
      } catch (error) {
        console.error(`Search strategy ${strategy.priority} failed:`, error);
      }
    }

    if (allResults.length === 0) {
      return NextResponse.json({ cities: [] });
    }

    // Process and filter results
    const cities = allResults
      .filter((item: any) => {
        const placeType = item.type;
        const placeClass = item.class;
        
        // Accept various place types
        const validTypes = ["city", "town", "village", "municipality", "hamlet", "suburb"];
        const isValidPlace = validTypes.includes(placeType) || placeClass === "place";
        
        // Ensure we have basic location data
        const hasCoordinates = item.lat && item.lon;
        const hasAddress = item.address || item.display_name;
        
        return isValidPlace && hasCoordinates && hasAddress;
      })
      .map((item: any) => {
        const address = item.address || {};
        
        // Extract city name with better fallback logic
        const cityName = 
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

        // Calculate relevance score
        const queryLower = query.toLowerCase();
        const cityLower = cityName.toLowerCase();
        
        let relevanceScore = 0;
        
        // Exact match gets highest score
        if (cityLower === queryLower) {
          relevanceScore = 100;
        }
        // Starts with query gets high score
        else if (cityLower.startsWith(queryLower)) {
          relevanceScore = 80;
        }
        // Contains query gets medium score
        else if (cityLower.includes(queryLower)) {
          relevanceScore = 60;
        }
        // Partial match gets lower score
        else {
          relevanceScore = 30;
        }

        // Boost score for higher priority searches
        relevanceScore += (3 - item.searchPriority) * 10;

        // Boost score for major cities (higher importance in OSM)
        const importance = parseFloat(item.importance || 0);
        relevanceScore += importance * 20;

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
          searchPriority: item.searchPriority
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
      // Remove duplicates based on city name and country
      .reduce((unique: any[], current: any) => {
        const isDuplicate = unique.some(item => 
          item.city.toLowerCase() === current.city.toLowerCase() &&
          item.country.toLowerCase() === current.country.toLowerCase()
        );
        
        if (!isDuplicate) {
          unique.push(current);
        } else {
          // If duplicate, keep the one with higher relevance score
          const existingIndex = unique.findIndex(item => 
            item.city.toLowerCase() === current.city.toLowerCase() &&
            item.country.toLowerCase() === current.country.toLowerCase()
          );
          
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
      .map(({ relevanceScore, importance, searchPriority, ...city }) => city);

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}