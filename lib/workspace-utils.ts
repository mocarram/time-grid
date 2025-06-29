import type { Workspace } from '@/types/workspace';
import type { TimezoneData, WorkspaceTimezoneCollection } from '@/types/timezone';

export const WORKSPACE_COLORS = [
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500/20', border: 'border-blue-400/30', text: 'text-blue-300' },
  { name: 'Green', value: 'green', bg: 'bg-green-500/20', border: 'border-green-400/30', text: 'text-green-300' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500/20', border: 'border-purple-400/30', text: 'text-purple-300' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500/20', border: 'border-orange-400/30', text: 'text-orange-300' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500/20', border: 'border-pink-400/30', text: 'text-pink-300' },
  { name: 'Cyan', value: 'cyan', bg: 'bg-cyan-500/20', border: 'border-cyan-400/30', text: 'text-cyan-300' },
  { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-500/20', border: 'border-yellow-400/30', text: 'text-yellow-300' },
  { name: 'Red', value: 'red', bg: 'bg-red-500/20', border: 'border-red-400/30', text: 'text-red-300' },
];

export const WORKSPACE_ICONS = [
  'Building2', 'Users', 'Heart', 'Plane', 'Briefcase', 'Home', 'Globe', 'Star',
  'Coffee', 'Laptop', 'Calendar', 'Clock', 'MapPin', 'Compass', 'Target', 'Zap'
];

export function getWorkspaceColor(colorValue: string) {
  return WORKSPACE_COLORS.find(color => color.value === colorValue) || WORKSPACE_COLORS[0];
}

export function createDefaultWorkspace(): Workspace {
  return {
    id: 'default',
    name: 'Personal',
    description: 'Your personal timezone collection',
    color: 'blue',
    icon: 'User',
    timezones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Updated to use workspace timezone collection
export function getWorkspaceTimezones(
  workspaceTimezones: WorkspaceTimezoneCollection,
  workspaceId: string | null
): TimezoneData[] {
  if (!workspaceId) return [];
  const timezones = workspaceTimezones[workspaceId] || [];
  console.log('Getting timezones for workspace:', workspaceId, 'timezones:', timezones.map(tz => ({ id: tz.id, city: tz.city })));
  return timezones;
}

export function addTimezoneToWorkspaceCollection(
  workspaceTimezones: WorkspaceTimezoneCollection,
  workspace: Workspace,
  timezone: TimezoneData
): WorkspaceTimezoneCollection {
  const currentTimezones = workspaceTimezones[workspace.id] || [];
  
  // Check for duplicates
  const isDuplicate = currentTimezones.some(existing => 
    existing.city.toLowerCase() === timezone.city.toLowerCase() && 
    existing.country.toLowerCase() === timezone.country.toLowerCase()
  );
  
  if (isDuplicate) {
    return workspaceTimezones;
  }
  
  return {
    ...workspaceTimezones,
    [workspace.id]: [...currentTimezones, { ...timezone, workspaceId: workspace.id }],
  };
}

export function removeTimezoneFromWorkspaceCollection(
  workspaceTimezones: WorkspaceTimezoneCollection,
  workspace: Workspace,
  timezoneId: string
): WorkspaceTimezoneCollection {
  return {
    ...workspaceTimezones,
    [workspace.id]: (workspaceTimezones[workspace.id] || []).filter(tz => tz.id !== timezoneId),
  };
}