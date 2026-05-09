export const APP_NAME = "TimeGrid";
export const APP_VERSION = "0.2.0";

export const LIMITS = {
  workspaceNameMin: 1,
  workspaceNameMax: 60,
  workspaceDescriptionMax: 280,
  workspaceMin: 1,
  workspacesPerUserMax: 50,
  timezonesPerWorkspaceMax: 50,
  cityNameMax: 80,
  countryNameMax: 80,
  shareUrlMaxBytes: 2048,
  syncDebounceMs: 2000,
  syncRetryMaxAttempts: 5,
  syncRetryBaseMs: 1000,
  syncRequestTimeoutMs: 8000,
  searchDebounceMs: 300,
  searchMinChars: 2,
  searchUpstreamTimeoutMs: 8000,
  searchResultsCap: 12,
  ipDetectionTimeoutMs: 5000,
  storageQuarantinePrefix: "tg:quarantine:",
} as const;

export const STORAGE_KEYS = {
  v2: "tg:state:v2",
  legacyWorkspaces: "world-clock-workspaces",
  legacyActiveWorkspace: "world-clock-active-workspace",
  deviceId: "tg:device-id",
} as const;

export const REDIS_KEYS = {
  userV2: (userId: string) => `tg:user:${userId}:v2`,
  userV1: (userId: string) => `user:${userId}`,
} as const;

export const SHARE_URL = {
  version: 2,
  paramVersion: "v",
  paramPayload: "payload",
} as const;

export const WORKSPACE_COLOR_VALUES = [
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
  "cyan",
  "yellow",
  "red",
] as const;

export type WorkspaceColor = (typeof WORKSPACE_COLOR_VALUES)[number];

export const WORKSPACE_ICON_VALUES = [
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
  "User",
] as const;

export type WorkspaceIcon = (typeof WORKSPACE_ICON_VALUES)[number];

export const WORKSPACE_COLOR_PALETTE: Record<
  WorkspaceColor,
  { name: string; bg: string; border: string; text: string }
> = {
  blue: { name: "Blue", bg: "bg-blue-500/20", border: "border-blue-400/30", text: "text-blue-300" },
  green: { name: "Green", bg: "bg-green-500/20", border: "border-green-400/30", text: "text-green-300" },
  purple: { name: "Purple", bg: "bg-purple-500/20", border: "border-purple-400/30", text: "text-purple-300" },
  orange: { name: "Orange", bg: "bg-orange-500/20", border: "border-orange-400/30", text: "text-orange-300" },
  pink: { name: "Pink", bg: "bg-pink-500/20", border: "border-pink-400/30", text: "text-pink-300" },
  cyan: { name: "Cyan", bg: "bg-cyan-500/20", border: "border-cyan-400/30", text: "text-cyan-300" },
  yellow: { name: "Yellow", bg: "bg-yellow-500/20", border: "border-yellow-400/30", text: "text-yellow-300" },
  red: { name: "Red", bg: "bg-red-500/20", border: "border-red-400/30", text: "text-red-300" },
};
