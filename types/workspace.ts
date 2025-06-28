export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  timezones: string[]; // Array of timezone IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}