export interface TimezoneData {
  id: string;
  city: string;
  timezone: string;
  country: string;
  offset: number; // in minutes
  isAbbreviation?: boolean;
  abbreviation?: string;
  region?: string;
  workspaceId?: string; // Associate timezone with specific workspace
}

export interface TimeState {
  referenceTime: Date;
  selectedTime: Date;
  timezones: TimezoneData[]; // Global timezone collection
  isTimeModified: boolean;
}

// New interface for workspace-specific timezone management
export interface WorkspaceTimezoneCollection {
  [workspaceId: string]: TimezoneData[];
}