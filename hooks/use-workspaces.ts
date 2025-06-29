'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Workspace, WorkspaceState } from '@/types/workspace';
import { createDefaultWorkspace } from '@/lib/workspace-utils';

const WORKSPACES_STORAGE_KEY = 'world-clock-workspaces';
const ACTIVE_WORKSPACE_STORAGE_KEY = 'world-clock-active-workspace';
const WORKSPACE_TIMEZONES_STORAGE_KEY = 'world-clock-workspace-timezones';

export function useWorkspaces() {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    workspaces: [],
    activeWorkspaceId: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load workspace-specific timezones from localStorage
  const loadWorkspaceTimezones = useCallback(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_TIMEZONES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load workspace timezones:', error);
      return {};
    }
  }, []);

  // Save workspace-specific timezones to localStorage
  const saveWorkspaceTimezones = useCallback((workspaceTimezones: Record<string, any[]>) => {
    try {
      localStorage.setItem(WORKSPACE_TIMEZONES_STORAGE_KEY, JSON.stringify(workspaceTimezones));
    } catch (error) {
      console.error('Failed to save workspace timezones:', error);
    }
  }, []);

  // Load workspaces from localStorage on mount
  useEffect(() => {
    try {
      const savedWorkspaces = localStorage.getItem(WORKSPACES_STORAGE_KEY);
      const savedActiveId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      
      let workspaces: Workspace[] = [];
      
      if (savedWorkspaces) {
        workspaces = JSON.parse(savedWorkspaces).map((ws: any) => ({
          ...ws,
          createdAt: new Date(ws.createdAt),
          updatedAt: new Date(ws.updatedAt),
        }));
      }
      
      // Ensure there's always a default workspace
      if (workspaces.length === 0) {
        const defaultWorkspace = createDefaultWorkspace();
        workspaces = [defaultWorkspace];
      }
      
      // Ensure active workspace exists
      let activeWorkspaceId = savedActiveId;
      if (!activeWorkspaceId || !workspaces.find(ws => ws.id === activeWorkspaceId)) {
        activeWorkspaceId = workspaces[0].id;
      }
      
      setWorkspaceState({
        workspaces,
        activeWorkspaceId,
      });
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
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
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaceState.workspaces));
      if (workspaceState.activeWorkspaceId) {
        localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceState.activeWorkspaceId);
      }
    } catch (error) {
      console.error('Failed to save workspaces:', error);
    }
  }, [workspaceState, isLoaded]);

  // Function to add timezones to a specific workspace's storage
  const addTimezonesToWorkspaceStorage = useCallback((workspaceId: string, timezones: any[]) => {
    const workspaceTimezones = loadWorkspaceTimezones();
    workspaceTimezones[workspaceId] = timezones;
    saveWorkspaceTimezones(workspaceTimezones);
    console.log('Saved timezones for workspace:', workspaceId, timezones.map(tz => ({ id: tz.id, city: tz.city })));
  }, [loadWorkspaceTimezones, saveWorkspaceTimezones]);

  // Function to get timezones for a specific workspace
  const getWorkspaceTimezones = useCallback((workspaceId: string) => {
    const workspaceTimezones = loadWorkspaceTimezones();
    return workspaceTimezones[workspaceId] || [];
  }, [loadWorkspaceTimezones]);

  const addWorkspace = useCallback((workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWorkspace: Workspace = {
      ...workspace,
      id: `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setWorkspaceState(prev => ({
      ...prev,
      workspaces: [...prev.workspaces, newWorkspace],
    }));
    
    return newWorkspace.id;
  }, []);

  const addWorkspaceWithTimezones = useCallback((
    workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>, 
    timezones: any[] = []
  ) => {
    const newWorkspace: Workspace = {
      ...workspace,
      id: `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setWorkspaceState(prev => ({
      ...prev,
      workspaces: [...prev.workspaces, newWorkspace],
    }));
    
    // Store timezones separately for this workspace
    if (timezones.length > 0) {
      addTimezonesToWorkspaceStorage(newWorkspace.id, timezones);
    }
    
    return newWorkspace.id;
  }, [addTimezonesToWorkspaceStorage]);

  const updateWorkspace = useCallback((id: string, updates: Partial<Workspace>) => {
    setWorkspaceState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(ws => 
        ws.id === id 
          ? { ...ws, ...updates, updatedAt: new Date() }
          : ws
      ),
    }));
  }, []);

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
    
    // Clean up workspace-specific timezones
    const workspaceTimezones = loadWorkspaceTimezones();
    delete workspaceTimezones[id];
    saveWorkspaceTimezones(workspaceTimezones);
  }, []);

  const setActiveWorkspace = useCallback((id: string) => {
    setWorkspaceState(prev => ({
      ...prev,
      activeWorkspaceId: id,
    }));
  }, []);

  const addTimezoneToWorkspace = useCallback((workspaceId: string, timezoneId: string) => {
    console.log('Adding timezone to workspace:', workspaceId, timezoneId);
    setWorkspaceState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(ws => 
        ws.id === workspaceId 
          ? {
              ...ws,
              timezones: ws.timezones.includes(timezoneId) 
                ? ws.timezones 
                : [...ws.timezones, timezoneId],
              updatedAt: new Date(),
            }
          : ws
      ),
    }));
  }, []);

  const removeTimezoneFromWorkspace = useCallback((workspaceId: string, timezoneId: string) => {
    setWorkspaceState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(ws => 
        ws.id === workspaceId 
          ? {
              ...ws,
              timezones: ws.timezones.filter(id => id !== timezoneId),
              updatedAt: new Date(),
            }
          : ws
      ),
    }));
  }, []);

  const activeWorkspace = workspaceState.workspaces.find(ws => ws.id === workspaceState.activeWorkspaceId) || null;

  return {
    workspaces: workspaceState.workspaces,
    activeWorkspace,
    isLoaded,
    addWorkspace,
    addWorkspaceWithTimezones,
    updateWorkspace,
    deleteWorkspace,
    setActiveWorkspace,
    addTimezoneToWorkspace,
    removeTimezoneFromWorkspace,
    getWorkspaceTimezones,
    addTimezonesToWorkspaceStorage,
  };
}