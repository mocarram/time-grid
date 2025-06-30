"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useWorkspaces } from "@/hooks/use-workspaces";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { TimezoneCard } from "@/components/timezone-card";
import { SortableTimezoneCard } from "@/components/sortable-timezone-card";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { AuthButton } from "@/components/auth-button";
import { Button } from "@/components/ui/button";
import { TimeSelector } from "@/components/time-selector";
import { AddTimezoneDialog } from "@/components/add-timezone-dialog";
import { ShareButton } from "@/components/share-button";
import { useIpTimezone } from "@/hooks/use-ip-timezone";
import { useUrlState } from "@/hooks/use-url-state";
import { useAuthSync } from "@/hooks/use-auth-sync";
import {
  getLocalTimezone,
  convertTime,
  getTimezoneOffset,
} from "@/lib/timezone-utils";
import { filterTimezonesByWorkspace } from "@/lib/workspace-utils";
import type { TimezoneData, TimeState } from "@/types/timezone";
import { Clock, Loader2 } from "lucide-react";
import { toZonedTime } from "date-fns-tz";
import TimeGridSkeleton from "@/components/loader/TimeGridSkeleton";

function WorldClockContent() {
  const {
    location: ipLocation,
    error: ipError,
    loading: ipLoading,
  } = useIpTimezone();
  const { urlState, generateShareUrl, hasProcessedUrl } = useUrlState();
  const {
    workspaces,
    activeWorkspace,
    isLoaded: workspacesLoaded,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setActiveWorkspace,
    addTimezoneToWorkspace,
    removeTimezoneFromWorkspace,
    setWorkspaceReferenceTimezone,
    loadWorkspacesFromServer,
  } = useWorkspaces();

  // Auth and sync functionality
  const authSync = useAuthSync({
    workspaces,
    activeWorkspaceId: activeWorkspace?.id || null,
    onDataReceived: data => {
      // Load server data into local state
      if (data.workspaces && data.workspaces.length > 0) {
        loadWorkspacesFromServer(data.workspaces, data.activeWorkspaceId);
      }
    },
    onSyncComplete: success => {
      if (success) {
        console.log("Sync completed successfully");
      } else {
        console.error("Sync failed");
      }
    },
  });

  const {
    isAuthenticated,
    user,
    isAuthLoading,
    isSaving,
    isLoadingData,
    syncError,
    saveToServer,
    loadFromServer,
    lastSyncDisplay,
    hasServerData,
  } = authSync || {};

  const [isMounted, setIsMounted] = useState(false);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get workspace-specific data
  const workspaceTimezones = activeWorkspace?.timezones || [];
  const workspaceReferenceTimezone =
    activeWorkspace?.referenceTimezone || getLocalTimezone();

  // Time state derived from workspace data
  const [timeState, setTimeState] = useState<TimeState>({
    referenceTime: new Date(),
    selectedTime: new Date(),
    timezones: workspaceTimezones,
    isTimeModified: false,
  });

  // Sync timeState with active workspace data and reset time on workspace change
  useEffect(() => {
    if (activeWorkspace) {
      const now = new Date();
      const referenceTime = activeWorkspace.referenceTimezone
        ? toZonedTime(now, activeWorkspace.referenceTimezone.timezone)
        : now;

      setTimeState(prev => ({
        ...prev,
        timezones: activeWorkspace.timezones || [],
        selectedTime: referenceTime,
        referenceTime: referenceTime,
        isTimeModified: false, // Reset to current time
      }));
    }
  }, [activeWorkspace?.id, activeWorkspace?.referenceTimezone?.timezone]);

  // Sync timezone list when workspace timezones change (but not when switching workspaces)
  useEffect(() => {
    if (activeWorkspace) {
      setTimeState(prev => ({
        ...prev,
        timezones: activeWorkspace.timezones || [],
      }));
    }
  }, [activeWorkspace?.timezones]);

  // Handle URL state loading
  useEffect(() => {
    // Only process URL state if we actually have shared data AND haven't processed it yet
    const hasSharedData =
      urlState.referenceTimezone || urlState.timeState || urlState.workspace;

    if (
      !urlState.isLoading &&
      !hasLoadedFromUrl &&
      workspacesLoaded &&
      hasSharedData
    ) {
      console.log("=== Loading URL state ===");
      console.log("URL reference timezone:", urlState.referenceTimezone);
      console.log("URL time state:", urlState.timeState);
      console.log("URL workspace:", urlState.workspace);

      let newWorkspaceId: string | null = null;

      // Handle workspace creation from URL FIRST
      if (urlState.workspace) {
        // Create a temporary workspace from the shared data
        const sharedWorkspace = {
          ...urlState.workspace,
          name: `${urlState.workspace.name} (Shared)`,
          timezones: urlState.timeState?.timezones || [],
          referenceTimezone: urlState.referenceTimezone || undefined,
        };

        newWorkspaceId = addWorkspace(sharedWorkspace);
        setActiveWorkspace(newWorkspaceId);
        console.log("Created shared workspace:", newWorkspaceId);
      }

      // If we have timeState but no workspace, add to current workspace
      if (urlState.timeState && !urlState.workspace && activeWorkspace) {
        const newTimezones = urlState.timeState.timezones || [];
        newTimezones.forEach(timezone => {
          addTimezoneToWorkspace(activeWorkspace.id, timezone);
        });

        if (urlState.referenceTimezone) {
          setWorkspaceReferenceTimezone(
            activeWorkspace.id,
            urlState.referenceTimezone
          );
        }
      }

      setHasLoadedFromUrl(true);
    }

    // If there's no shared data and we haven't processed URL yet, mark as processed
    if (
      !urlState.isLoading &&
      !hasLoadedFromUrl &&
      workspacesLoaded &&
      !hasSharedData
    ) {
      setHasLoadedFromUrl(true);
    }
  }, [
    urlState,
    hasLoadedFromUrl,
    workspacesLoaded,
    addWorkspace,
    setActiveWorkspace,
    addTimezoneToWorkspace,
    setWorkspaceReferenceTimezone,
    activeWorkspace?.id,
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set client flag after component mounts
  useEffect(() => {
    setIsMounted(true);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Auto-detect reference timezone for new workspaces that don't have one
  useEffect(() => {
    if (
      activeWorkspace &&
      !activeWorkspace.referenceTimezone &&
      ipLocation &&
      !ipError &&
      ipLocation.timezone !== "UTC"
    ) {
      const detectedTimezone = {
        id: "detected-ip",
        city: ipLocation.city,
        timezone: ipLocation.timezone,
        country: ipLocation.country,
        offset: getTimezoneOffset(ipLocation.timezone),
      };
      setWorkspaceReferenceTimezone(activeWorkspace.id, detectedTimezone);
      console.log(
        "Set detected timezone as reference for workspace:",
        detectedTimezone
      );
    }
  }, [
    activeWorkspace?.id,
    activeWorkspace?.referenceTimezone,
    ipLocation,
    ipError,
    setWorkspaceReferenceTimezone,
  ]);

  // Timer effect for updating time every minute
  useEffect(() => {
    // Only run timer when time is NOT manually modified
    if (timeState.isTimeModified) {
      console.log("Time is manually modified, not starting timer");
      return;
    }

    console.log("Setting up timer effect for live time updates");

    const tick = () => {
      console.log("Timer tick at", new Date().toLocaleTimeString());

      const timezone = workspaceReferenceTimezone?.timezone;
      if (!timezone) {
        console.log("No timezone available");
        return;
      }

      // Only update when showing live time
      const now = new Date();
      const referenceTime = toZonedTime(now, timezone);
      console.log(
        "Updating to current time:",
        referenceTime.toLocaleTimeString()
      );

      setTimeState(currentState => ({
        ...currentState,
        referenceTime,
        selectedTime: referenceTime,
      }));
    };

    // Clear existing interval/timeout
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Run immediately to show current time
    tick();

    // Calculate time until next minute boundary (in device time)
    const now = new Date();
    const secondsUntilNextMinute = 60 - now.getSeconds();
    const millisecondsUntilNextMinute =
      secondsUntilNextMinute * 1000 - now.getMilliseconds();

    console.log(
      `Time until next minute: ${secondsUntilNextMinute} seconds, ${now.getMilliseconds()} ms`
    );

    // Set initial timeout to sync with minute boundary
    const initialTimeout = setTimeout(() => {
      console.log("Timeout fired - now at minute boundary");
      // Tick at the minute boundary
      tick();

      // Now start regular interval every 60 seconds
      intervalRef.current = setInterval(() => {
        console.log("Interval tick - every 60 seconds");
        tick();
      }, 60000);
      console.log("Regular timer started, synced to minute boundary");
    }, millisecondsUntilNextMinute);

    // Store the timeout ID so we can clear it if needed
    const timeoutIdForCleanup = initialTimeout;

    return () => {
      clearTimeout(timeoutIdForCleanup);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("Timer cleaned up");
      }
    };
  }, [workspaceReferenceTimezone?.timezone, timeState.isTimeModified]);

  const handleTimeChange = useCallback((newTime: Date) => {
    setTimeState(prev => ({
      ...prev,
      selectedTime: newTime,
      isTimeModified: true,
    }));
  }, []);

  const handleAddTimezone = useCallback(
    (timezone: TimezoneData) => {
      // Check for duplicates based on exact city+country combination only
      // This allows multiple cities in the same timezone but prevents exact duplicates
      const currentTimezones = activeWorkspace
        ? filterTimezonesByWorkspace(timeState.timezones, activeWorkspace)
        : timeState.timezones;

      const isDuplicate = currentTimezones.some(
        existing =>
          existing.city.toLowerCase() === timezone.city.toLowerCase() &&
          existing.country.toLowerCase() === timezone.country.toLowerCase()
      );

      // Only check against reference timezone if it's not the same as what we're trying to add
      // This prevents blocking when reference timezone is auto-detected as the same city
      const isDuplicateOfReference =
        workspaceReferenceTimezone &&
        workspaceReferenceTimezone.city.toLowerCase() ===
          timezone.city.toLowerCase() &&
        workspaceReferenceTimezone.country.toLowerCase() ===
          timezone.country.toLowerCase() &&
        workspaceReferenceTimezone.id !== "local"; // Allow adding if reference is just auto-detected local

      if (isDuplicate || isDuplicateOfReference) {
        console.log(
          "Duplicate timezone detected, not adding:",
          timezone.city,
          timezone.country,
          "isDuplicate:",
          isDuplicate,
          "isDuplicateOfReference:",
          isDuplicateOfReference
        );
        return;
      }

      // Ensure unique ID
      const uniqueTimezone = {
        ...timezone,
        id: timezone.id.includes("custom-")
          ? timezone.id
          : `${timezone.id}-${Date.now()}`,
      };

      // Only add to workspace - the useEffect will sync timeState automatically
      if (activeWorkspace) {
        addTimezoneToWorkspace(activeWorkspace.id, uniqueTimezone);
      } else {
        // Fallback for when no workspace is active
        setTimeState(prev => ({
          ...prev,
          timezones: [...prev.timezones, uniqueTimezone],
        }));
      }
    },
    [
      workspaceReferenceTimezone?.id,
      activeWorkspace?.id,
      addTimezoneToWorkspace,
    ]
  );

  const handleRemoveTimezone = useCallback(
    (timezoneId: string) => {
      // Only remove from workspace - the useEffect will sync timeState automatically
      if (activeWorkspace) {
        removeTimezoneFromWorkspace(activeWorkspace.id, timezoneId);
      } else {
        // Fallback for when no workspace is active
        setTimeState(prev => ({
          ...prev,
          timezones: prev.timezones.filter(tz => tz.id !== timezoneId),
        }));
      }
    },
    [activeWorkspace?.id, removeTimezoneFromWorkspace]
  );

  const handleSetAsReference = useCallback(
    (timezone: TimezoneData) => {
      if (!activeWorkspace) return;

      // Move current reference to the timezone list if it exists
      const currentReference = workspaceReferenceTimezone;

      // Remove from workspace timezones first
      removeTimezoneFromWorkspace(activeWorkspace.id, timezone.id);

      // Convert the current selected time to the new reference timezone
      const convertedTime = currentReference
        ? convertTime(
            timeState.selectedTime,
            currentReference.offset,
            timezone.offset
          )
        : timeState.selectedTime;

      // Set the new reference timezone in workspace
      setWorkspaceReferenceTimezone(activeWorkspace.id, timezone);

      // Update the time state with the converted time
      setTimeState(prev => ({
        ...prev,
        selectedTime: convertedTime,
        referenceTime: convertedTime,
      }));

      // Add the old reference to the workspace if it exists and isn't the same
      if (currentReference && currentReference.id !== timezone.id) {
        addTimezoneToWorkspace(activeWorkspace.id, currentReference);
      }
    },
    [
      activeWorkspace,
      workspaceReferenceTimezone,
      timeState.selectedTime,
      setWorkspaceReferenceTimezone,
      removeTimezoneFromWorkspace,
      addTimezoneToWorkspace,
    ]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Could be used for visual feedback during drag operations
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        const oldIndex = timeState.timezones.findIndex(
          tz => tz.id === active.id
        );
        const newIndex = timeState.timezones.findIndex(
          tz => tz.id === over?.id
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedTimezones = arrayMove(
            timeState.timezones,
            oldIndex,
            newIndex
          );

          // Update local state immediately for smooth UX
          setTimeState(prev => ({
            ...prev,
            timezones: reorderedTimezones,
          }));

          // Persist the new order to the workspace if we have an active workspace
          if (activeWorkspace) {
            // Update the workspace with the new timezone order
            const updatedWorkspace = {
              ...activeWorkspace,
              timezones: reorderedTimezones,
            };
            updateWorkspace(activeWorkspace.id, updatedWorkspace);
          }
        }
      }

      // Add a small delay to ensure smooth animation completion
      setTimeout(() => {
        setActiveId(null);
      }, 150);
    },
    [timeState.timezones, activeWorkspace, updateWorkspace]
  );

  const resetToCurrentTime = () => {
    if (!workspaceReferenceTimezone) return;

    const now = new Date();
    const referenceTime = toZonedTime(now, workspaceReferenceTimezone.timezone);

    setTimeState(prev => ({
      ...prev,
      referenceTime,
      selectedTime: referenceTime,
      isTimeModified: false,
    }));
  };

  // Get the active timezone for drag overlay
  const displayedTimezones = activeWorkspace
    ? filterTimezonesByWorkspace(timeState.timezones, activeWorkspace)
    : timeState.timezones;
  const activeTimezone = displayedTimezones.find(tz => tz.id === activeId);

  // Don't render until we've loaded workspaces
  if (!workspacesLoaded) {
    return <TimeGridSkeleton />;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="container mx-auto max-w-5xl flex-1 px-6 py-12">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 flex items-center justify-center gap-4">
              <div className="glass rounded-xl p-3">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div className="relative">
                <h1 className="text-glow text-5xl font-thin tracking-tight text-white">
                  TimeGrid
                </h1>
                <div className="absolute -right-12 -top-1 rounded-full border border-slate-600/40 bg-slate-700/20 px-2 py-1 text-[10px] font-medium text-slate-400">
                  BETA
                </div>
              </div>
            </div>
            <p className="text-base font-light text-slate-400">
              Synchronize time across the globe
            </p>
          </div>

          {/* Workspace Selector and Auth */}
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:flex-1">
                <WorkspaceSelector
                  workspaces={workspaces}
                  activeWorkspace={activeWorkspace}
                  onWorkspaceChange={setActiveWorkspace}
                  onCreateWorkspace={addWorkspace}
                  onUpdateWorkspace={updateWorkspace}
                  onDeleteWorkspace={deleteWorkspace}
                />
              </div>
              <div className="lg:flex-shrink-0">
                {authSync ? (
                  <AuthButton
                    isSaving={isSaving}
                    isLoadingData={isLoadingData}
                    syncError={syncError}
                    onSaveToServer={saveToServer}
                    onLoadFromServer={loadFromServer}
                    lastSyncDisplay={lastSyncDisplay}
                    hasServerData={hasServerData}
                  />
                ) : (
                  <div className="glass-button flex h-12 items-center gap-2 px-4">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span className="text-sm text-slate-400">
                      Loading auth...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reference Timezone Card */}
          {workspaceReferenceTimezone && (
            <div className="mb-8">
              <TimezoneCard
                timezone={workspaceReferenceTimezone}
                displayTime={timeState.selectedTime}
                isReference={true}
              >
                <div className="mt-6 space-y-6">
                  <TimeSelector
                    selectedTime={timeState.selectedTime}
                    onTimeChange={handleTimeChange}
                  />
                  {timeState.isTimeModified && (
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetToCurrentTime}
                        className="glass-button group h-8 px-4 transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-500/20"
                        title="Reset to current time"
                      >
                        <span className="text-sm font-medium text-slate-400 group-hover:text-blue-300">
                          Reset to current time
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              </TimezoneCard>
            </div>
          )}

          {/* Additional Timezone Cards with Drag and Drop */}
          {isMounted && displayedTimezones.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayedTimezones}
                strategy={rectSortingStrategy}
              >
                <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                  {displayedTimezones.map(timezone => {
                    const convertedTime = workspaceReferenceTimezone
                      ? convertTime(
                          timeState.selectedTime,
                          workspaceReferenceTimezone.offset,
                          timezone.offset
                        )
                      : timeState.selectedTime;

                    return (
                      <SortableTimezoneCard
                        key={timezone.id}
                        timezone={timezone}
                        displayTime={convertedTime}
                        onRemove={() => handleRemoveTimezone(timezone.id)}
                        onSetAsReference={() => handleSetAsReference(timezone)}
                      />
                    );
                  })}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeTimezone ? (
                  <div className="w-80 rotate-2 scale-90 opacity-95 shadow-2xl shadow-blue-500/25 transition-all duration-200 ease-out">
                    <TimezoneCard
                      timezone={activeTimezone}
                      displayTime={
                        workspaceReferenceTimezone
                          ? convertTime(
                              timeState.selectedTime,
                              workspaceReferenceTimezone.offset,
                              activeTimezone.offset
                            )
                          : timeState.selectedTime
                      }
                      isDragging={true}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {/* Status Messages */}
          {ipLoading && (
            <div className="mt-8 text-center font-light text-slate-400">
              <div className="inline-flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                Detecting your timezone...
              </div>
            </div>
          )}

          {ipError && (
            <div className="mt-8 text-center font-light text-slate-500">
              {ipLocation?.source === "browser"
                ? "Using browser timezone as reference"
                : "Using system timezone as reference"}
            </div>
          )}
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 bg-slate-900/50 py-4">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:justify-between">
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()}{" "}
              <a
                className="font-semibold text-blue-400"
                href="https://github.com/mocarram/time-grid"
              >
                TimeGrid
              </a>
              . Synchronize time across the globe.
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/mocarram/time-grid"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-slate-600/50 hover:bg-slate-700/30 hover:text-slate-300"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>GitHub</span>
              </a>
              <a
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-slate-600/50 hover:bg-slate-700/30 hover:text-slate-300"
              >
                <span>Built with</span>
                <span className="font-semibold text-blue-400">Bolt.new</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Add Timezone Button */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4 sm:flex-col md:flex-col lg:flex-col">
        {/* Mobile: Horizontal layout */}
        <div className="flex flex-row gap-4 sm:hidden">
          <ShareButton
            onShare={() =>
              workspaceReferenceTimezone
                ? generateShareUrl(
                    workspaceReferenceTimezone,
                    timeState,
                    activeWorkspace,
                    displayedTimezones
                  )
                : ""
            }
          />
          <AddTimezoneDialog
            onAddTimezone={handleAddTimezone}
            existingTimezones={
              workspaceReferenceTimezone
                ? [workspaceReferenceTimezone, ...displayedTimezones]
                : displayedTimezones
            }
          />
        </div>

        {/* Desktop: Vertical layout */}
        <div className="hidden sm:flex sm:flex-col sm:gap-4">
          <ShareButton
            onShare={() =>
              workspaceReferenceTimezone
                ? generateShareUrl(
                    workspaceReferenceTimezone,
                    timeState,
                    activeWorkspace,
                    displayedTimezones
                  )
                : ""
            }
          />
          <AddTimezoneDialog
            onAddTimezone={handleAddTimezone}
            existingTimezones={
              workspaceReferenceTimezone
                ? [workspaceReferenceTimezone, ...displayedTimezones]
                : displayedTimezones
            }
          />
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function WorldClockLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-slate-400">Loading TimeGrid...</p>
        </div>
      </div>
    </div>
  );
}

export default function WorldClock() {
  return (
    <Suspense fallback={<WorldClockLoading />}>
      <WorldClockContent />
    </Suspense>
  );
}
