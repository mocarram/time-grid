"use client";

import { useState, useEffect, useCallback } from "react";
import type { Workspace, WorkspaceState } from "@/types/workspace";
import type { TimezoneData } from "@/types/timezone";
import { createDefaultWorkspace } from "@/lib/workspace-utils";

const WORKSPACES_STORAGE_KEY = "world-clock-workspaces";
const ACTIVE_WORKSPACE_STORAGE_KEY = "world-clock-active-workspace";

export function useWorkspaces() {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    workspaces: [],
    activeWorkspaceId: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load workspaces from localStorage on mount
  useEffect(() => {
    try {
      const savedWorkspaces = localStorage.getItem(WORKSPACES_STORAGE_KEY);
      const savedActiveId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);

      let workspaces: Workspace[] = [];

      if (savedWorkspaces) {
        const parsed = JSON.parse(savedWorkspaces);
        workspaces = parsed.map((ws: any) => {
          // Migrate old workspace structure (string[] timezones) to new structure (TimezoneData[] timezones)
          const migratedWorkspace: Workspace = {
            ...ws,
            createdAt: new Date(ws.createdAt),
            updatedAt: new Date(ws.updatedAt),
            timezones: Array.isArray(ws.timezones)
              ? typeof ws.timezones[0] === "string"
                ? []
                : ws.timezones // Reset if old format
              : [],
            referenceTimezone: ws.referenceTimezone || undefined,
          };
          return migratedWorkspace;
        });
      }

      // Ensure there's always a default workspace
      if (workspaces.length === 0) {
        const defaultWorkspace = createDefaultWorkspace();
        workspaces = [defaultWorkspace];
      }

      // Ensure active workspace exists
      let activeWorkspaceId = savedActiveId;
      if (
        !activeWorkspaceId ||
        !workspaces.find(ws => ws.id === activeWorkspaceId)
      ) {
        activeWorkspaceId = workspaces[0].id;
      }

      setWorkspaceState({
        workspaces,
        activeWorkspaceId,
      });
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
      const defaultWorkspace = createDefaultWorkspace();
      setWorkspaceState({
        workspaces: [defaultWorkspace],
        activeWorkspaceId: defaultWorkspace.id,
      });
      setIsLoaded(true);
    }
  }, []);

  // Save workspaces to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(
        WORKSPACES_STORAGE_KEY,
        JSON.stringify(workspaceState.workspaces)
      );
      if (workspaceState.activeWorkspaceId) {
        localStorage.setItem(
          ACTIVE_WORKSPACE_STORAGE_KEY,
          workspaceState.activeWorkspaceId
        );
      }
    } catch (error) {
      console.error("Failed to save workspaces:", error);
    }
  }, [workspaceState, isLoaded]);

  const addWorkspace = useCallback(
    (workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">) => {
      const newWorkspace: Workspace = {
        ...workspace,
        id: `workspace-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setWorkspaceState(prev => ({
        ...prev,
        workspaces: [...prev.workspaces, newWorkspace],
      }));

      return newWorkspace.id;
    },
    []
  );

  const updateWorkspace = useCallback(
    (id: string, updates: Partial<Workspace>) => {
      setWorkspaceState(prev => ({
        ...prev,
        workspaces: prev.workspaces.map(ws =>
          ws.id === id ? { ...ws, ...updates, updatedAt: new Date() } : ws
        ),
      }));
    },
    []
  );

  const deleteWorkspace = useCallback((id: string) => {
    setWorkspaceState(prev => {
      const newWorkspaces = prev.workspaces.filter(ws => ws.id !== id);

      // If we're deleting the active workspace, switch to the first available one
      let newActiveId = prev.activeWorkspaceId;
      if (prev.activeWorkspaceId === id) {
        newActiveId = newWorkspaces.length > 0 ? newWorkspaces[0].id : null;
      }

      return {
        workspaces: newWorkspaces,
        activeWorkspaceId: newActiveId,
      };
    });
  }, []);

  const setActiveWorkspace = useCallback((id: string) => {
    setWorkspaceState(prev => ({
      ...prev,
      activeWorkspaceId: id,
    }));
  }, []);

  const addTimezoneToWorkspace = useCallback(
    (workspaceId: string, timezone: TimezoneData) => {
      console.log("Adding timezone to workspace:", workspaceId, timezone);
      setWorkspaceState(prev => ({
        ...prev,
        workspaces: prev.workspaces.map(ws =>
          ws.id === workspaceId
            ? {
                ...ws,
                timezones: ws.timezones.some(tz => tz.id === timezone.id)
                  ? ws.timezones
                  : [...ws.timezones, timezone],
                updatedAt: new Date(),
              }
            : ws
        ),
      }));
    },
    []
  );

  const removeTimezoneFromWorkspace = useCallback(
    (workspaceId: string, timezoneId: string) => {
      setWorkspaceState(prev => ({
        ...prev,
        workspaces: prev.workspaces.map(ws =>
          ws.id === workspaceId
            ? {
                ...ws,
                timezones: ws.timezones.filter(tz => tz.id !== timezoneId),
                updatedAt: new Date(),
              }
            : ws
        ),
      }));
    },
    []
  );

  const setWorkspaceReferenceTimezone = useCallback(
    (workspaceId: string, referenceTimezone: TimezoneData | null) => {
      setWorkspaceState(prev => ({
        ...prev,
        workspaces: prev.workspaces.map(ws =>
          ws.id === workspaceId
            ? {
                ...ws,
                referenceTimezone: referenceTimezone || undefined,
                updatedAt: new Date(),
              }
            : ws
        ),
      }));
    },
    []
  );

  // Load workspaces from server data (for auth sync)
  const loadWorkspacesFromServer = useCallback(
    (serverWorkspaces: Workspace[], serverActiveId?: string | null) => {
      try {
        // Convert server data to proper format
        const processedWorkspaces = serverWorkspaces.map((ws: any) => ({
          ...ws,
          createdAt: new Date(ws.createdAt),
          updatedAt: new Date(ws.updatedAt),
          timezones: ws.timezones || [],
          referenceTimezone: ws.referenceTimezone || undefined,
        }));

        // Ensure there's at least one workspace
        const workspaces =
          processedWorkspaces.length > 0
            ? processedWorkspaces
            : [createDefaultWorkspace()];

        // Set active workspace
        let activeWorkspaceId = serverActiveId;
        if (
          !activeWorkspaceId ||
          !workspaces.find(ws => ws.id === activeWorkspaceId)
        ) {
          activeWorkspaceId = workspaces[0].id;
        }

        setWorkspaceState({
          workspaces,
          activeWorkspaceId: activeWorkspaceId || null,
        });

        console.log("Loaded workspaces from server:", workspaces);
      } catch (error) {
        console.error("Failed to load workspaces from server:", error);
      }
    },
    []
  );

  const activeWorkspace =
    workspaceState.workspaces.find(
      ws => ws.id === workspaceState.activeWorkspaceId
    ) || null;

  return {
    workspaces: workspaceState.workspaces,
    activeWorkspace,
    isLoaded,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setActiveWorkspace,
    addTimezoneToWorkspace,
    removeTimezoneFromWorkspace,
    setWorkspaceReferenceTimezone,
    loadWorkspacesFromServer,
  };
}
