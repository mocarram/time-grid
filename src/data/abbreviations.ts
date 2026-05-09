// Common timezone abbreviation registry. The offset is computed at render
// time, not stored.

export interface AbbreviationEntry {
  slug: string;
  abbreviation: string;
  name: string;
  timezone: string;
  region: string;
  isDST?: boolean;
}

export const TIMEZONE_ABBREVIATIONS: readonly AbbreviationEntry[] = [
  // US
  { slug: "pst", abbreviation: "PST", name: "Pacific Standard Time", timezone: "America/Los_Angeles", region: "US West Coast" },
  { slug: "pdt", abbreviation: "PDT", name: "Pacific Daylight Time", timezone: "America/Los_Angeles", region: "US West Coast", isDST: true },
  { slug: "mst", abbreviation: "MST", name: "Mountain Standard Time", timezone: "America/Denver", region: "US Mountain" },
  { slug: "mdt", abbreviation: "MDT", name: "Mountain Daylight Time", timezone: "America/Denver", region: "US Mountain", isDST: true },
  { slug: "cst", abbreviation: "CST", name: "Central Standard Time", timezone: "America/Chicago", region: "US Central" },
  { slug: "cdt", abbreviation: "CDT", name: "Central Daylight Time", timezone: "America/Chicago", region: "US Central", isDST: true },
  { slug: "est", abbreviation: "EST", name: "Eastern Standard Time", timezone: "America/New_York", region: "US East Coast" },
  { slug: "edt", abbreviation: "EDT", name: "Eastern Daylight Time", timezone: "America/New_York", region: "US East Coast", isDST: true },
  { slug: "akst", abbreviation: "AKST", name: "Alaska Standard Time", timezone: "America/Anchorage", region: "Alaska" },
  { slug: "akdt", abbreviation: "AKDT", name: "Alaska Daylight Time", timezone: "America/Anchorage", region: "Alaska", isDST: true },
  { slug: "hst", abbreviation: "HST", name: "Hawaii Standard Time", timezone: "Pacific/Honolulu", region: "Hawaii" },

  // Europe
  { slug: "gmt", abbreviation: "GMT", name: "Greenwich Mean Time", timezone: "Europe/London", region: "UK" },
  { slug: "bst", abbreviation: "BST", name: "British Summer Time", timezone: "Europe/London", region: "UK", isDST: true },
  { slug: "cet", abbreviation: "CET", name: "Central European Time", timezone: "Europe/Paris", region: "Central Europe" },
  { slug: "cest", abbreviation: "CEST", name: "Central European Summer Time", timezone: "Europe/Paris", region: "Central Europe", isDST: true },
  { slug: "eet", abbreviation: "EET", name: "Eastern European Time", timezone: "Europe/Helsinki", region: "Eastern Europe" },
  { slug: "eest", abbreviation: "EEST", name: "Eastern European Summer Time", timezone: "Europe/Helsinki", region: "Eastern Europe", isDST: true },
  { slug: "msk", abbreviation: "MSK", name: "Moscow Standard Time", timezone: "Europe/Moscow", region: "Russia" },

  // Asia
  { slug: "jst", abbreviation: "JST", name: "Japan Standard Time", timezone: "Asia/Tokyo", region: "Japan" },
  { slug: "kst", abbreviation: "KST", name: "Korea Standard Time", timezone: "Asia/Seoul", region: "South Korea" },
  { slug: "ist", abbreviation: "IST", name: "India Standard Time", timezone: "Asia/Kolkata", region: "India" },
  { slug: "cst-china", abbreviation: "CST", name: "China Standard Time", timezone: "Asia/Shanghai", region: "China" },
  { slug: "sgt", abbreviation: "SGT", name: "Singapore Standard Time", timezone: "Asia/Singapore", region: "Singapore" },
  { slug: "hkt", abbreviation: "HKT", name: "Hong Kong Time", timezone: "Asia/Hong_Kong", region: "Hong Kong" },
  { slug: "ict", abbreviation: "ICT", name: "Indochina Time", timezone: "Asia/Bangkok", region: "Southeast Asia" },

  // Australia / Pacific
  { slug: "aest", abbreviation: "AEST", name: "Australian Eastern Standard Time", timezone: "Australia/Sydney", region: "Eastern Australia" },
  { slug: "aedt", abbreviation: "AEDT", name: "Australian Eastern Daylight Time", timezone: "Australia/Sydney", region: "Eastern Australia", isDST: true },
  { slug: "acst", abbreviation: "ACST", name: "Australian Central Standard Time", timezone: "Australia/Adelaide", region: "Central Australia" },
  { slug: "acdt", abbreviation: "ACDT", name: "Australian Central Daylight Time", timezone: "Australia/Adelaide", region: "Central Australia", isDST: true },
  { slug: "awst", abbreviation: "AWST", name: "Australian Western Standard Time", timezone: "Australia/Perth", region: "Western Australia" },
  { slug: "nzst", abbreviation: "NZST", name: "New Zealand Standard Time", timezone: "Pacific/Auckland", region: "New Zealand" },
  { slug: "nzdt", abbreviation: "NZDT", name: "New Zealand Daylight Time", timezone: "Pacific/Auckland", region: "New Zealand", isDST: true },
];
