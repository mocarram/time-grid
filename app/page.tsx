"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TimeSelector } from "@/components/time-selector";
import { AddTimezoneDialog } from "@/components/add-timezone-dialog";
import { ShareButton } from "@/components/share-button";
import { useIpTimezone } from "@/hooks/use-ip-timezone";
import { useUrlState } from "@/hooks/use-url-state";
import {
  getLocalTimezone,
  convertTime,
  getTimezoneOffset,
} from "@/lib/timezone-utils";
import { filterTimezonesByWorkspace } from "@/lib/workspace-utils";
import type { TimezoneData, TimeState } from "@/types/timezone";
import { Clock, MapPin } from "lucide-react";
import { toZonedTime } from "date-fns-tz";

const STORAGE_KEY = "world-clock-timezones";
const REFERENCE_STORAGE_KEY = "world-clock-reference-timezone";

export default function WorldClock() {
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
  } = useWorkspaces();
  const [isMounted, setIsMounted] = useState(false);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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
  }, [activeWorkspace]);

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
    activeWorkspace,
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
  }, [activeWorkspace, ipLocation, ipError, setWorkspaceReferenceTimezone]);

  useEffect(() => {
    const updateTime = () => {
      if (!timeState.isTimeModified) {
        // grab the current instant…
        const now = new Date();

        // …and re-interpret it in your reference zone
        const referenceTime = toZonedTime(
          now,
          workspaceReferenceTimezone.timezone
        );

        setTimeState(prev => ({
          ...prev,
          referenceTime,
          selectedTime: referenceTime,
        }));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
    // add `referenceTimezone` so it re-runs when you switch zones
  }, [timeState.isTimeModified, workspaceReferenceTimezone]);

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

      setTimeState(prev => ({
        ...prev,
        timezones: [...prev.timezones, uniqueTimezone],
      }));

      // Add to current workspace if one is active
      if (activeWorkspace) {
        addTimezoneToWorkspace(activeWorkspace.id, uniqueTimezone);
      }
    },
    [
      workspaceReferenceTimezone,
      activeWorkspace,
      addTimezoneToWorkspace,
      timeState.timezones,
    ]
  );

  const handleRemoveTimezone = useCallback(
    (timezoneId: string) => {
      setTimeState(prev => ({
        ...prev,
        timezones: prev.timezones.filter(tz => tz.id !== timezoneId),
      }));

      // Remove from current workspace
      if (activeWorkspace) {
        removeTimezoneFromWorkspace(activeWorkspace.id, timezoneId);
      }
    },
    [activeWorkspace, removeTimezoneFromWorkspace]
  );

  const handleSetAsReference = useCallback(
    (timezone: TimezoneData) => {
      if (!activeWorkspace) return;

      // Move current reference to the timezone list if it exists
      const currentReference = workspaceReferenceTimezone;

      // Remove the selected timezone from the list
      setTimeState(prev => ({
        ...prev,
        timezones: prev.timezones.filter(tz => tz.id !== timezone.id),
      }));

      // Remove from workspace timezones
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
    setOverId((event.over?.id as string) || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTimeState(prev => {
        const oldIndex = prev.timezones.findIndex(tz => tz.id === active.id);
        const newIndex = prev.timezones.findIndex(tz => tz.id === over?.id);

        return {
          ...prev,
          timezones: arrayMove(prev.timezones, oldIndex, newIndex),
        };
      });
    }

    // Add a small delay to ensure smooth animation completion
    setTimeout(() => {
      setActiveId(null);
      setOverId(null);
    }, 150);
  }, []);

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
    return (
      <div className='relative min-h-screen overflow-hidden'>
        {/* Background Effects */}
        <div className='absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900' />
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]' />

        <div className='container relative z-10 mx-auto max-w-5xl px-6 py-12'>
          {/* Header */}
          <div className='mb-16 text-center'>
            <div className='mb-6 flex items-center justify-center gap-4'>
              <div className='glass rounded-2xl p-4'>
                <Clock className='h-8 w-8 text-blue-400' />
              </div>
            </div>
            <h1 className='text-glow mb-4 text-6xl font-thin tracking-tight text-white'>
              TimeGrid
            </h1>
            <p className='text-lg font-light text-slate-400'>
              Synchronize time across the globe
            </p>
          </div>

          {/* Skeleton Loading State */}
          <div className='space-y-8'>
            {/* Reference Timezone Card Skeleton */}
            <div className='glass-card glow rounded-3xl p-8 ring-1 ring-blue-400/30'>
              <div className='space-y-6'>
                {/* Header Skeleton */}
                <div className='flex items-start justify-between'>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4 text-slate-400' />
                        <Skeleton className='h-6 w-24 bg-white/10' />
                      </div>
                      <span className='rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300'>
                        Reference
                      </span>
                    </div>
                    <div className='flex items-center gap-4 text-sm text-slate-400'>
                      <Skeleton className='h-4 w-16 bg-white/10' />
                      <Skeleton className='h-4 w-12 bg-white/10' />
                      <span>•</span>
                      <Skeleton className='h-4 w-16 bg-white/10' />
                      <Skeleton className='h-3 w-12 bg-white/10' />
                    </div>
                  </div>
                </div>

                {/* Time Display Skeleton */}
                <div className='space-y-2'>
                  <Skeleton className='h-16 w-32 bg-white/10' />
                </div>

                {/* Time Selector Skeleton */}
                <div className='mt-6 space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4 text-blue-400' />
                      <span className='text-sm font-medium text-slate-300'>
                        Reference Time
                      </span>
                    </div>
                    <Skeleton className='h-6 w-16 rounded-lg bg-white/10' />
                  </div>

                  <div className='space-y-3'>
                    <div className='px-1'>
                      <Skeleton className='h-6 w-full rounded-full bg-white/10' />
                    </div>
                    <div className='flex justify-between px-1 text-xs text-slate-500'>
                      <span>12:00 AM</span>
                      <span>12:00 PM</span>
                      <span>11:59 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Timezone Cards Skeleton */}
            <div className='mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3'>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className='glass-card flex min-h-[200px] flex-col rounded-2xl p-6'
                >
                  <div className='space-y-6'>
                    {/* Header Skeleton */}
                    <div className='flex items-start justify-between'>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-3'>
                          <div className='flex items-center gap-2'>
                            <MapPin className='h-4 w-4 text-slate-400' />
                            <Skeleton className='h-6 w-20 bg-white/10' />
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Skeleton className='h-8 w-8 rounded-lg bg-white/10' />
                        <Skeleton className='h-8 w-8 rounded-lg bg-white/10' />
                        <Skeleton className='h-8 w-8 rounded-lg bg-white/10' />
                      </div>
                    </div>

                    {/* Time Display Skeleton */}
                    <div className='space-y-2'>
                      <Skeleton className='h-12 w-28 bg-white/10' />
                    </div>

                    {/* Badge Skeleton */}
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <Skeleton className='h-6 w-16 rounded-full bg-white/10' />
                      <Skeleton className='h-6 w-12 rounded-full bg-white/10' />
                      <Skeleton className='h-6 w-16 rounded-full bg-white/10' />
                      <Skeleton className='h-6 w-12 rounded-full bg-white/10' />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative min-h-screen overflow-hidden'>
      {/* Background Effects */}
      <div className='absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900' />
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]' />

      <div className='container relative z-10 mx-auto max-w-5xl px-6 py-12'>
        {/* Header */}
        <div className='mb-16 text-center'>
          <div className='mb-6 flex items-center justify-center gap-4'>
            <div className='glass rounded-xl p-3'>
              <Clock className='h-6 w-6 text-blue-400' />
            </div>
            <h1 className='text-glow text-5xl font-thin tracking-tight text-white'>
              TimeGrid
            </h1>
          </div>
          <p className='text-lg font-light text-slate-400'>
            Synchronize time across the globe
          </p>
        </div>

        {/* Workspace Selector */}
        <div className='mb-8'>
          <WorkspaceSelector
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onWorkspaceChange={setActiveWorkspace}
            onCreateWorkspace={addWorkspace}
            onUpdateWorkspace={updateWorkspace}
            onDeleteWorkspace={deleteWorkspace}
          />
        </div>

        {/* Reference Timezone Card */}
        {workspaceReferenceTimezone && (
          <div className='mb-8'>
            <TimezoneCard
              timezone={workspaceReferenceTimezone}
              displayTime={timeState.selectedTime}
              isReference={true}
            >
              <div className='mt-6 space-y-6'>
                <TimeSelector
                  selectedTime={timeState.selectedTime}
                  onTimeChange={handleTimeChange}
                />
                {timeState.isTimeModified && (
                  <div className='flex justify-center'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={resetToCurrentTime}
                      className='glass-button group h-8 px-4 transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-500/20'
                      title='Reset to current time'
                    >
                      <span className='text-sm font-medium text-slate-400 group-hover:text-blue-300'>
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
              <div className='mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3'>
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
                <div className='w-80 rotate-2 scale-90 opacity-95 shadow-2xl shadow-blue-500/25 transition-all duration-200 ease-out'>
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
          <div className='mt-8 text-center font-light text-slate-400'>
            <div className='inline-flex items-center gap-2'>
              <div className='h-2 w-2 animate-pulse rounded-full bg-blue-400' />
              Detecting your timezone...
            </div>
          </div>
        )}

        {ipError && (
          <div className='mt-8 text-center font-light text-slate-500'>
            {ipLocation?.source === "browser"
              ? "Using browser timezone as reference"
              : "Using system timezone as reference"}
          </div>
        )}
      </div>

      {/* Floating Add Timezone Button */}
      <div className='fixed bottom-8 right-8 z-50 flex flex-col gap-4 sm:flex-col md:flex-col lg:flex-col'>
        {/* Mobile: Horizontal layout */}
        <div className='flex flex-row gap-4 sm:hidden'>
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
        <div className='hidden sm:flex sm:flex-col sm:gap-4'>
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
