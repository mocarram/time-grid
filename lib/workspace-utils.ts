import type { Workspace } from "@/types/workspace";
import type { TimezoneData } from "@/types/timezone";

export const WORKSPACE_COLORS = [
  {
    name: "Blue",
    value: "blue",
    bg: "bg-blue-500/20",
    border: "border-blue-400/30",
    text: "text-blue-300",
  },
  {
    name: "Green",
    value: "green",
    bg: "bg-green-500/20",
    border: "border-green-400/30",
    text: "text-green-300",
  },
  {
    name: "Purple",
    value: "purple",
    bg: "bg-purple-500/20",
    border: "border-purple-400/30",
    text: "text-purple-300",
  },
  {
    name: "Orange",
    value: "orange",
    bg: "bg-orange-500/20",
    border: "border-orange-400/30",
    text: "text-orange-300",
  },
  {
    name: "Pink",
    value: "pink",
    bg: "bg-pink-500/20",
    border: "border-pink-400/30",
    text: "text-pink-300",
  },
  {
    name: "Cyan",
    value: "cyan",
    bg: "bg-cyan-500/20",
    border: "border-cyan-400/30",
    text: "text-cyan-300",
  },
  {
    name: "Yellow",
    value: "yellow",
    bg: "bg-yellow-500/20",
    border: "border-yellow-400/30",
    text: "text-yellow-300",
  },
  {
    name: "Red",
    value: "red",
    bg: "bg-red-500/20",
    border: "border-red-400/30",
    text: "text-red-300",
  },
];

export const WORKSPACE_ICONS = [
  "Building2",
  "Users",
  "Heart",
  "Plane",
  "Briefcase",
  "Home",
  "Globe",
  "Star",
  "Coffee",
  "Laptop",
  "Calendar",
  "Clock",
  "MapPin",
  "Compass",
  "Target",
  "Zap",
];

export function getWorkspaceColor(colorValue: string) {
  return (
    WORKSPACE_COLORS.find(color => color.value === colorValue) ||
    WORKSPACE_COLORS[0]
  );
}

export function createDefaultWorkspace(): Workspace {
  return {
    id: "default",
    name: "Personal",
    description: "Your personal timezone collection",
    color: "blue",
    icon: "User",
    timezones: [],
    referenceTimezone: undefined, // Will be set when user sets a reference
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function filterTimezonesByWorkspace(
  timezones: TimezoneData[],
  workspace: Workspace | null
): TimezoneData[] {
  if (!workspace) return timezones;
  // Since workspace now contains the actual timezone data, we just return them
  const filtered = workspace.timezones || [];
  console.log(
    "Filtering timezones for workspace:",
    workspace.name,
    "workspace.timezones count:",
    workspace.timezones?.length,
    "filtered:",
    filtered.map(tz => tz.id)
  );
  return filtered;
}

export function addTimezoneToWorkspace(
  workspace: Workspace,
  timezone: TimezoneData
): Workspace {
  if (workspace.timezones.some(tz => tz.id === timezone.id)) {
    return workspace;
  }

  return {
    ...workspace,
    timezones: [...workspace.timezones, timezone],
    updatedAt: new Date(),
  };
}

export function removeTimezoneFromWorkspace(
  workspace: Workspace,
  timezoneId: string
): Workspace {
  return {
    ...workspace,
    timezones: workspace.timezones.filter(tz => tz.id !== timezoneId),
    updatedAt: new Date(),
  };
}

export function setWorkspaceReferenceTimezone(
  workspace: Workspace,
  referenceTimezone: TimezoneData
): Workspace {
  return {
    ...workspace,
    referenceTimezone,
    updatedAt: new Date(),
  };
}
