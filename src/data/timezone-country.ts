// Curated timezone → country lookup. Used as a backstop when the IP / Nominatim
// lookups don't yield a country name. Not exhaustive on purpose — IANA has
// 600+ zones; we list the ones a user is likely to encounter.

export const TIMEZONE_COUNTRY: Record<string, string> = {
  // Asia
  "Asia/Dhaka": "Bangladesh",
  "Asia/Kolkata": "India",
  "Asia/Shanghai": "China",
  "Asia/Tokyo": "Japan",
  "Asia/Seoul": "South Korea",
  "Asia/Bangkok": "Thailand",
  "Asia/Singapore": "Singapore",
  "Asia/Dubai": "United Arab Emirates",
  "Asia/Karachi": "Pakistan",
  "Asia/Jakarta": "Indonesia",
  "Asia/Manila": "Philippines",
  "Asia/Kuala_Lumpur": "Malaysia",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Taipei": "Taiwan",
  "Asia/Kathmandu": "Nepal",
  "Asia/Yangon": "Myanmar",
  "Asia/Jerusalem": "Israel",
  "Asia/Riyadh": "Saudi Arabia",

  // Europe
  "Europe/London": "United Kingdom",
  "Europe/Paris": "France",
  "Europe/Berlin": "Germany",
  "Europe/Rome": "Italy",
  "Europe/Madrid": "Spain",
  "Europe/Amsterdam": "Netherlands",
  "Europe/Brussels": "Belgium",
  "Europe/Vienna": "Austria",
  "Europe/Zurich": "Switzerland",
  "Europe/Stockholm": "Sweden",
  "Europe/Oslo": "Norway",
  "Europe/Copenhagen": "Denmark",
  "Europe/Helsinki": "Finland",
  "Europe/Warsaw": "Poland",
  "Europe/Prague": "Czechia",
  "Europe/Budapest": "Hungary",
  "Europe/Moscow": "Russia",
  "Europe/Kyiv": "Ukraine",
  "Europe/Istanbul": "Türkiye",
  "Europe/Athens": "Greece",
  "Europe/Lisbon": "Portugal",
  "Europe/Dublin": "Ireland",

  // Americas
  "America/New_York": "United States",
  "America/Los_Angeles": "United States",
  "America/Chicago": "United States",
  "America/Denver": "United States",
  "America/Phoenix": "United States",
  "America/Anchorage": "United States",
  "America/Honolulu": "United States",
  "America/Toronto": "Canada",
  "America/Vancouver": "Canada",
  "America/Mexico_City": "Mexico",
  "America/Sao_Paulo": "Brazil",
  "America/Argentina/Buenos_Aires": "Argentina",
  "America/Lima": "Peru",
  "America/Bogota": "Colombia",
  "America/Santiago": "Chile",
  "America/Caracas": "Venezuela",
  "America/Havana": "Cuba",

  // Oceania
  "Australia/Sydney": "Australia",
  "Australia/Melbourne": "Australia",
  "Australia/Brisbane": "Australia",
  "Australia/Perth": "Australia",
  "Australia/Adelaide": "Australia",
  "Australia/Darwin": "Australia",
  "Pacific/Auckland": "New Zealand",
  "Pacific/Fiji": "Fiji",
  "Pacific/Honolulu": "United States",
  "Pacific/Chatham": "New Zealand",

  // Africa
  "Africa/Cairo": "Egypt",
  "Africa/Lagos": "Nigeria",
  "Africa/Johannesburg": "South Africa",
  "Africa/Nairobi": "Kenya",
  "Africa/Casablanca": "Morocco",
  "Africa/Algiers": "Algeria",
  "Africa/Tunis": "Tunisia",
  "Africa/Accra": "Ghana",
  "Africa/Addis_Ababa": "Ethiopia",
};

export function countryForZone(zone: string): string {
  if (TIMEZONE_COUNTRY[zone]) return TIMEZONE_COUNTRY[zone]!;
  if (zone === "UTC") return "UTC";
  const [region] = zone.split("/");
  return region ?? "Local";
}

export function cityForZone(zone: string): string {
  const parts = zone.split("/");
  const last = parts[parts.length - 1];
  if (!last) return "Local";
  return last.replace(/_/g, " ");
}
