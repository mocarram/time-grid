import { format, addMinutes, parseISO } from 'date-fns';
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
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const city = timezone.split('/').pop()?.replace('_', ' ') || 'Local';
  
  // Try to get country from timezone
  let country = 'Local';
  try {
    // Extract country from timezone (e.g., "Asia/Dhaka" -> "Bangladesh")
    const timezoneParts = timezone.split('/');
    if (timezoneParts.length >= 2) {
      const region = timezoneParts[0];
      const cityPart = timezoneParts[1];
      
      // Map common timezone regions/cities to countries
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
      
      country = timezoneToCountry[timezone] || region;
    }
  } catch (error) {
    console.log('Could not determine country from timezone:', error);
  }
  
  return {
    id: 'local',
    city,
    timezone,
    country,
    offset: getTimezoneOffset(timezone)
  };
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