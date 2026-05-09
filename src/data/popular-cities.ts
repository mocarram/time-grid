// Curated list of popular cities. The offset is computed lazily from the IANA
// zone — never persisted here.

export interface PopularCity {
  slug: string;
  city: string;
  country: string;
  timezone: string;
}

export const POPULAR_CITIES: readonly PopularCity[] = [
  { slug: "london", city: "London", country: "United Kingdom", timezone: "Europe/London" },
  { slug: "new-york", city: "New York", country: "United States", timezone: "America/New_York" },
  { slug: "tokyo", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
  { slug: "dubai", city: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  { slug: "singapore", city: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
  { slug: "sydney", city: "Sydney", country: "Australia", timezone: "Australia/Sydney" },
  { slug: "paris", city: "Paris", country: "France", timezone: "Europe/Paris" },
  { slug: "los-angeles", city: "Los Angeles", country: "United States", timezone: "America/Los_Angeles" },
  { slug: "dhaka", city: "Dhaka", country: "Bangladesh", timezone: "Asia/Dhaka" },
  { slug: "mumbai", city: "Mumbai", country: "India", timezone: "Asia/Kolkata" },
  { slug: "beijing", city: "Beijing", country: "China", timezone: "Asia/Shanghai" },
  { slug: "moscow", city: "Moscow", country: "Russia", timezone: "Europe/Moscow" },
] as const;
