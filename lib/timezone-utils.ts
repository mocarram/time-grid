import { format, addMinutes, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { TimezoneData } from '@/types/timezone';

// Initialize popular timezones with dynamic offsets
const createPopularTimezones = (): TimezoneData[] => [
  { id: 'london', city: 'London', timezone: 'Europe/London', country: 'UK', offset: getTimezoneOffset('Europe/London') },
  { id: 'new-york', city: 'New York', timezone: 'America/New_York', country: 'USA', offset: getTimezoneOffset('America/New_York') },
  { id: 'tokyo', city: 'Tokyo', timezone: 'Asia/Tokyo', country: 'Japan', offset: getTimezoneOffset('Asia/Tokyo') },
  { id: 'dubai', city: 'Dubai', timezone: 'Asia/Dubai', country: 'UAE', offset: getTimezoneOffset('Asia/Dubai') },
  { id: 'singapore', city: 'Singapore', timezone: 'Asia/Singapore', country: 'Singapore', offset: getTimezoneOffset('Asia/Singapore') },
  { id: 'sydney', city: 'Sydney', timezone: 'Australia/Sydney', country: 'Australia', offset: getTimezoneOffset('Australia/Sydney') },
  { id: 'paris', city: 'Paris', timezone: 'Europe/Paris', country: 'France', offset: getTimezoneOffset('Europe/Paris') },
  { id: 'los-angeles', city: 'Los Angeles', timezone: 'America/Los_Angeles', country: 'USA', offset: getTimezoneOffset('America/Los_Angeles') },
  { id: 'dhaka', city: 'Dhaka', timezone: 'Asia/Dhaka', country: 'Bangladesh', offset: getTimezoneOffset('Asia/Dhaka') },
  { id: 'mumbai', city: 'Mumbai', timezone: 'Asia/Kolkata', country: 'India', offset: getTimezoneOffset('Asia/Kolkata') },
  { id: 'beijing', city: 'Beijing', timezone: 'Asia/Shanghai', country: 'China', offset: getTimezoneOffset('Asia/Shanghai') },
  { id: 'moscow', city: 'Moscow', timezone: 'Europe/Moscow', country: 'Russia', offset: getTimezoneOffset('Europe/Moscow') },
];

// Export popular timezones - will be calculated when first accessed
export const POPULAR_TIMEZONES: TimezoneData[] = createPopularTimezones();

export function getTimezoneOffset(timezone: string): number {
  try {
    // Create a date in UTC
    const now = new Date();
    
    // Get the time in the target timezone
    const targetTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // Get the time in UTC
    const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    // Calculate the difference in minutes
    const offsetMs = targetTime.getTime() - utcTime.getTime();
    return Math.round(offsetMs / 60000);
  } catch {
    return 0;
  }
}

export function getLocalTimezone(): TimezoneData {
  console.log('=== getLocalTimezone() called ===');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('Raw browser timezone:', timezone);
  console.log('Timezone offset:', new Date().getTimezoneOffset());
  
  // If browser returns UTC, try to detect actual timezone from offset
  if (timezone === 'UTC' || !timezone) {
    console.log('Browser timezone is UTC or invalid, using offset detection...');
    const offsetMinutes = new Date().getTimezoneOffset();
    
    // Map common offsets to likely timezones (negative offset means ahead of UTC)
    const offsetToTimezone: { [key: string]: { timezone: string; city: string; country: string } } = {
      "-360": { timezone: 'Asia/Dhaka', city: 'Dhaka', country: 'Bangladesh' },
      "-330": { timezone: 'Asia/Kolkata', city: 'Mumbai', country: 'India' },
      "-480": { timezone: 'Asia/Shanghai', city: 'Beijing', country: 'China' },
      "-540": { timezone: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan' },
      "0": { timezone: 'Europe/London', city: 'London', country: 'United Kingdom' },
      "-60": { timezone: 'Europe/Paris', city: 'Paris', country: 'France' },
      "300": { timezone: 'America/New_York', city: 'New York', country: 'United States' },
      "360": { timezone: 'America/Chicago', city: 'Chicago', country: 'United States' },
      "420": { timezone: 'America/Denver', city: 'Denver', country: 'United States' },
      "480": { timezone: 'America/Los_Angeles', city: 'Los Angeles', country: 'United States' },
      "-600": { timezone: 'Australia/Sydney', city: 'Sydney', country: 'Australia' },
      "-780": { timezone: 'Pacific/Auckland', city: 'Auckland', country: 'New Zealand' },
    };
    
    const fallbackData = offsetToTimezone[offsetMinutes.toString()];
    if (fallbackData) {
      console.log('Using offset-based timezone detection:', fallbackData);
      return {
        id: 'local',
        city: fallbackData.city,
        timezone: fallbackData.timezone,
        country: fallbackData.country,
        offset: getTimezoneOffset(fallbackData.timezone)
      };
    }
  }
  
  // Extract city name from timezone (e.g., "Asia/Dhaka" -> "Dhaka")
  let city = 'Local';
  if (timezone.includes('/')) {
    city = timezone.split('/').pop()?.replace(/_/g, ' ') || 'Local';
  } else {
    // Handle cases like "UTC" or other non-standard formats
    city = timezone;
  }
  
  console.log('Extracted city:', city);
  
  // Try to get country from timezone
  let country = 'Unknown';
  try {
    const timezoneToCountry: { [key: string]: string } = {
      // Asia
      'Asia/Dhaka': 'Bangladesh',
      'Asia/Kolkata': 'India',
      'Asia/Shanghai': 'China',
      'Asia/Tokyo': 'Japan',
      'Asia/Seoul': 'South Korea',
      'Asia/Bangkok': 'Thailand',
      'Asia/Singapore': 'Singapore',
      'Asia/Dubai': 'UAE',
      'Asia/Karachi': 'Pakistan',
      'Asia/Jakarta': 'Indonesia',
      'Asia/Manila': 'Philippines',
      'Asia/Kuala_Lumpur': 'Malaysia',
      'Asia/Hong_Kong': 'Hong Kong',
      'Asia/Taipei': 'Taiwan',
      
      // Europe
      'Europe/London': 'United Kingdom',
      'Europe/Paris': 'France',
      'Europe/Berlin': 'Germany',
      'Europe/Rome': 'Italy',
      'Europe/Madrid': 'Spain',
      'Europe/Amsterdam': 'Netherlands',
      'Europe/Brussels': 'Belgium',
      'Europe/Vienna': 'Austria',
      'Europe/Zurich': 'Switzerland',
      'Europe/Stockholm': 'Sweden',
      'Europe/Oslo': 'Norway',
      'Europe/Copenhagen': 'Denmark',
      'Europe/Helsinki': 'Finland',
      'Europe/Warsaw': 'Poland',
      'Europe/Prague': 'Czech Republic',
      'Europe/Budapest': 'Hungary',
      'Europe/Moscow': 'Russia',
      'Europe/Kiev': 'Ukraine',
      'Europe/Istanbul': 'Turkey',
      'Europe/Athens': 'Greece',
      'Europe/Lisbon': 'Portugal',
      'Europe/Dublin': 'Ireland',
      
      // America
      'America/New_York': 'United States',
      'America/Los_Angeles': 'United States',
      'America/Chicago': 'United States',
      'America/Denver': 'United States',
      'America/Phoenix': 'United States',
      'America/Anchorage': 'United States',
      'America/Honolulu': 'United States',
      'America/Toronto': 'Canada',
      'America/Vancouver': 'Canada',
      'America/Montreal': 'Canada',
      'America/Mexico_City': 'Mexico',
      'America/Sao_Paulo': 'Brazil',
      'America/Buenos_Aires': 'Argentina',
      'America/Lima': 'Peru',
      'America/Bogota': 'Colombia',
      'America/Santiago': 'Chile',
      'America/Caracas': 'Venezuela',
      'America/Havana': 'Cuba',
      'America/Jamaica': 'Jamaica',
      
      // Australia/Pacific
      'Australia/Sydney': 'Australia',
      'Australia/Melbourne': 'Australia',
      'Australia/Brisbane': 'Australia',
      'Australia/Perth': 'Australia',
      'Australia/Adelaide': 'Australia',
      'Australia/Darwin': 'Australia',
      'Pacific/Auckland': 'New Zealand',
      'Pacific/Fiji': 'Fiji',
      'Pacific/Honolulu': 'United States',
      
      // Africa
      'Africa/Cairo': 'Egypt',
      'Africa/Lagos': 'Nigeria',
      'Africa/Johannesburg': 'South Africa',
      'Africa/Nairobi': 'Kenya',
      'Africa/Casablanca': 'Morocco',
      'Africa/Algiers': 'Algeria',
      'Africa/Tunis': 'Tunisia',
      'Africa/Accra': 'Ghana',
      'Africa/Addis_Ababa': 'Ethiopia',
    };
    
    country = timezoneToCountry[timezone] || 
              (timezone.includes('/') ? timezone.split('/')[0] : 'Local');
  } catch (error) {
    console.log('Could not determine country from timezone:', error);
    country = 'Local';
  }
  
  console.log('Extracted country:', country);
  
  const result = {
    id: 'local',
    city,
    timezone,
    country,
    offset: getTimezoneOffset(timezone)
  };
  
  console.log('getLocalTimezone() result:', result);
  return result;
}

export function convertTime(baseTime: Date, fromOffset: number, toOffset: number): Date {
  const diffMinutes = toOffset - fromOffset;
  return addMinutes(baseTime, diffMinutes);
}

export function formatTime(date: Date, is24Hour: boolean = false): string {
  return format(date, is24Hour ? 'HH:mm' : 'h:mm a');
}

export function formatDate(date: Date): string {
  return format(date, 'do MMMM');
}

export function formatDay(date: Date): string {
  return format(date, 'EEEE');
}

export function timeToMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function minutesToTime(minutes: number, baseDate: Date): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const newDate = new Date(baseDate);
  newDate.setHours(hours, mins, 0, 0);
  return newDate;
}

// Get timezone abbreviation for a given timezone and date
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    // Use Intl.DateTimeFormat to get the timezone abbreviation
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    if (timeZonePart) {
      return timeZonePart.value;
    }
    
    // Fallback: try to extract from formatted string
    const formatted = formatter.format(date);
    const match = formatted.match(/\b([A-Z]{3,4})\b$/);
    if (match) {
      return match[1];
    }
    
    // Last resort: calculate from offset
    return getAbbreviationFromOffset(getTimezoneOffset(timezone));
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return getAbbreviationFromOffset(getTimezoneOffset(timezone));
  }
}

// Fallback function to get abbreviation from offset
function getAbbreviationFromOffset(offsetMinutes: number): string {
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  
  if (minutes === 0) {
    return `UTC${sign}${hours}`;
  } else {
    return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
  }
}

// Get a more descriptive timezone name with abbreviation
export function getTimezoneDisplayName(timezone: string, date: Date = new Date()): {
  abbreviation: string;
  description: string;
} {
  const abbreviation = getTimezoneAbbreviation(timezone, date);
  
  // Common timezone descriptions - handle context-dependent abbreviations
  const getTimezoneDescription = (abbr: string, tz: string): string => {
    // Handle CST ambiguity based on timezone
    if (abbr === 'CST') {
      if (tz.includes('America/') || tz.includes('US/')) {
        return 'Central Standard Time';
      } else if (tz.includes('Asia/') || tz.includes('China')) {
        return 'China Standard Time';
      }
    }
    
    // Handle IST ambiguity
    if (abbr === 'IST') {
      if (tz.includes('Asia/Kolkata') || tz.includes('India')) {
        return 'India Standard Time';
      } else if (tz.includes('Asia/Jerusalem') || tz.includes('Israel')) {
        return 'Israel Standard Time';
      } else if (tz.includes('Europe/Dublin') || tz.includes('Ireland')) {
        return 'Irish Standard Time';
      }
    }
    
    // Standard descriptions for non-ambiguous abbreviations
    const descriptions: { [key: string]: string } = {
    // US Timezones
    'EST': 'Eastern Standard Time',
    'EDT': 'Eastern Daylight Time',
    'CDT': 'Central Daylight Time',
    'MST': 'Mountain Standard Time',
    'MDT': 'Mountain Daylight Time',
    'PST': 'Pacific Standard Time',
    'PDT': 'Pacific Daylight Time',
    'AKST': 'Alaska Standard Time',
    'AKDT': 'Alaska Daylight Time',
    'HST': 'Hawaii Standard Time',
    
    // European Timezones
    'GMT': 'Greenwich Mean Time',
    'BST': 'British Summer Time',
    'CET': 'Central European Time',
    'CEST': 'Central European Summer Time',
    'EET': 'Eastern European Time',
    'EEST': 'Eastern European Summer Time',
    'WET': 'Western European Time',
    'WEST': 'Western European Summer Time',
    'MSK': 'Moscow Standard Time',
    
    // Asian Timezones
    'JST': 'Japan Standard Time',
    'KST': 'Korea Standard Time',
    'PKT': 'Pakistan Standard Time',
    'SGT': 'Singapore Standard Time',
    'HKT': 'Hong Kong Time',
    'ICT': 'Indochina Time',
    'WIB': 'Western Indonesian Time',
    'WIT': 'Eastern Indonesian Time',
    'WITA': 'Central Indonesian Time',
    
    // Australian Timezones
    'AEST': 'Australian Eastern Standard Time',
    'AEDT': 'Australian Eastern Daylight Time',
    'ACST': 'Australian Central Standard Time',
    'ACDT': 'Australian Central Daylight Time',
    'AWST': 'Australian Western Standard Time',
    'NZST': 'New Zealand Standard Time',
    'NZDT': 'New Zealand Daylight Time',
    
    // Other Common Timezones
    'CAT': 'Central Africa Time',
    'EAT': 'East Africa Time',
    'WAT': 'West Africa Time',
    'SAST': 'South Africa Standard Time',
    'BRT': 'Brasília Time',
    'ART': 'Argentina Time',
    'CLT': 'Chile Standard Time',
    'CLST': 'Chile Summer Time',
    'PET': 'Peru Time',
    'COT': 'Colombia Time',
    'VET': 'Venezuela Time',
    'AST': 'Atlantic Standard Time',
    'ADT': 'Atlantic Daylight Time',
    'NST': 'Newfoundland Standard Time',
    'NDT': 'Newfoundland Daylight Time',
  };
    
    return descriptions[abbr] || 'Local Time';
  };
  
  const description = getTimezoneDescription(abbreviation, timezone);
  
  return {
    abbreviation,
    description
  };
}