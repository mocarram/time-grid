import type { TimezoneData } from "./timezone";

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  timezones: TimezoneData[]; // Array of actual timezone data
  referenceTimezone?: TimezoneData; // Each workspace can have its own reference timezone
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}
