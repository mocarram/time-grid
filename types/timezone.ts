export interface TimezoneData {
  id: string;
  city: string;
  timezone: string;
  country: string;
  offset: number; // in minutes
  isAbbreviation?: boolean;
  abbreviation?: string;
  region?: string;
}

export interface TimeState {
  referenceTime: Date;
  selectedTime: Date;
  timezones: TimezoneData[];
  isTimeModified: boolean;
}