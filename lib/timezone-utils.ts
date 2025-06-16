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
  
  return {
    id: 'local',
    city,
    timezone,
    country: 'Local',
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