"use client";

import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useEffect, useState, useCallback } from "react";
import type { Workspace } from "@/types/workspace";

// Utility function to format relative time
function getRelativeTime(dateString: string): string {
  const now = new Date();
  const syncTime = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - syncTime.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return diffInSeconds <= 1 ? "just now" : `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? "1 minute ago"
      : `${diffInMinutes} minutes ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
}

interface UserData {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  lastSynced: string | null;
}

interface UseAuthSyncOptions {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onDataReceived?: (data: UserData) => void;
  onSyncComplete?: (success: boolean) => void;
}

export function useAuthSync({
  workspaces,
  activeWorkspaceId,
  onDataReceived,
  onSyncComplete,
}: UseAuthSyncOptions) {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    user,
  } = useKindeBrowserClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasServerData, setHasServerData] = useState(false);
  const [, forceUpdate] = useState({});

  // Get relative time string for display
  const getLastSyncDisplay = useCallback(() => {
    if (!lastSyncTime) return "Never synced";
    return getRelativeTime(lastSyncTime);
  }, [lastSyncTime]);

  // Update the display every minute to keep relative time fresh
  useEffect(() => {
    if (!lastSyncTime) return;

    const interval = setInterval(() => {
      forceUpdate({});
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  // Sync data to server when authenticated and data changes
  const syncToServer = useCallback(
    async (data: {
      workspaces: Workspace[];
      activeWorkspaceId: string | null;
    }) => {
      if (!isAuthenticated || isAuthLoading) return;

      setIsSaving(true);
      setSyncError(null);

      try {
        const response = await fetch("/api/user-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Failed to sync data");
        }

        const result = await response.json();
        setLastSyncTime(result.lastSynced);
        setHasServerData(true);
        onSyncComplete?.(true);
      } catch (error) {
        console.error("Sync error:", error);
        setSyncError(error instanceof Error ? error.message : "Sync failed");
        onSyncComplete?.(false);
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated, isAuthLoading, onSyncComplete]
  );

  // Load data from server when user first authenticates
  const loadFromServer = useCallback(async () => {
    if (!isAuthenticated || isAuthLoading) return;

    setIsLoadingData(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/user-data");

      if (!response.ok) {
        if (response.status === 404) {
          // No data on server yet, sync current local data
          await syncToServer({ workspaces, activeWorkspaceId });
          return;
        }
        throw new Error("Failed to load data");
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Only load server data if it exists and is newer than local data
        if (result.data.workspaces && result.data.workspaces.length > 0) {
          onDataReceived?.(result.data);
          setLastSyncTime(result.data.lastSynced);
        } else {
          // Server has no workspaces, sync current local data
          await syncToServer({ workspaces, activeWorkspaceId });
        }
      }
    } catch (error) {
      console.error("Load error:", error);
      setSyncError(error instanceof Error ? error.message : "Load failed");

      // If loading fails, sync current local data to server
      await syncToServer({ workspaces, activeWorkspaceId });
    } finally {
      setIsLoadingData(false);
    }
  }, [
    isAuthenticated,
    isAuthLoading,
    workspaces,
    activeWorkspaceId,
    onDataReceived,
    syncToServer,
  ]);

  // Check if user has data on server
  const checkServerData = useCallback(async () => {
    if (!isAuthenticated || isAuthLoading) return;

    try {
      const response = await fetch("/api/user-data/check");
      if (response.ok) {
        const result = await response.json();
        setHasServerData(result.hasData);
        if (result.lastSynced) {
          setLastSyncTime(result.lastSynced);
        }
      }
    } catch (error) {
      console.error("Error checking server data:", error);
    }
  }, [isAuthenticated, isAuthLoading]);

  // Check for server data when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && user) {
      checkServerData();
    }
  }, [isAuthenticated, isAuthLoading, user, checkServerData]);

  // No auto-sync - manual sync only

  // Reset sync state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setLastSyncTime(null);
      setSyncError(null);
    }
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    user,
    isAuthLoading,
    isSaving,
    isLoadingData,
    lastSyncTime,
    lastSyncDisplay: getLastSyncDisplay(),
    syncError,
    hasServerData,
    saveToServer: () => syncToServer({ workspaces, activeWorkspaceId }),
    loadFromServer,
  };
}
