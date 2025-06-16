export interface TimezoneData {
  id: string;
  city: string;
  timezone: string;
  country: string;
  offset: number; // in minutes
}

export interface TimeState {
  referenceTime: Date;
  selectedTime: Date;
  timezones: TimezoneData[];
  isTimeModified: boolean;
}