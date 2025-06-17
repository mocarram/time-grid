'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { TimezoneCard } from '@/components/timezone-card';
import { SortableTimezoneCard } from '@/components/sortable-timezone-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TimeSelector } from '@/components/time-selector';
import { AddTimezoneDialog } from '@/components/add-timezone-dialog';
import { useGeolocation } from '@/hooks/use-geolocation';
import { 
  getLocalTimezone, 
  convertTime, 
  getTimezoneOffset 
} from '@/lib/timezone-utils';
import type { TimezoneData, TimeState } from '@/types/timezone';
import { Clock, MapPin } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';

const STORAGE_KEY = 'world-clock-timezones';
const REFERENCE_STORAGE_KEY = 'world-clock-reference-timezone';

export default function WorldClock() {
  const { location, error: geoError, loading: geoLoading } = useGeolocation();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasUserSetReference, setHasUserSetReference] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [timeState, setTimeState] = useState<TimeState>({
    referenceTime: new Date(),
    selectedTime: new Date(),
    timezones: [],
    isTimeModified: false,
  });
  const [referenceTimezone, setReferenceTimezone] = useState<TimezoneData>(getLocalTimezone());

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

  // Load timezones from localStorage on mount
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      // Load saved reference timezone first
      const savedReference = localStorage.getItem(REFERENCE_STORAGE_KEY);
      if (savedReference) {
        const parsedReference: TimezoneData = JSON.parse(savedReference);
        // Update offset to current time (in case of DST changes)
        const updatedReference = {
          ...parsedReference,
          offset: getTimezoneOffset(parsedReference.timezone)
        };
        setReferenceTimezone(updatedReference);
        setHasUserSetReference(true);
      } else {
        // No saved reference, allow geolocation to set it
        setHasUserSetReference(false);
      }
      
      // Load other timezones
      const savedTimezones = localStorage.getItem(STORAGE_KEY);
      if (savedTimezones) {
        const parsedTimezones: TimezoneData[] = JSON.parse(savedTimezones);
        // Update offsets to current time (in case of DST changes)
        const updatedTimezones = parsedTimezones.map(tz => ({
          ...tz,
          offset: getTimezoneOffset(tz.timezone)
        }));
        
        setTimeState(prev => ({
          ...prev,
          timezones: updatedTimezones,
        }));
      }
      
      // Mark as loaded after all localStorage operations are complete
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load timezones from localStorage:', error);
      setIsLoaded(true); // Still mark as loaded even if there's an error
    }
  }, [isMounted]);

  // Save timezones to localStorage whenever they change
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timeState.timezones));
    } catch (error) {
      console.error('Failed to save timezones to localStorage:', error);
    }
  }, [timeState.timezones, isMounted]);

  // Save reference timezone to localStorage whenever it changes (only if user-set)
  useEffect(() => {
    if (!isMounted || hasUserSetReference !== true) return;
    
    try {
      localStorage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(referenceTimezone));
    } catch (error) {
      console.error('Failed to save reference timezone to localStorage:', error);
    }
  }, [referenceTimezone, isMounted, hasUserSetReference]);

  // Update reference timezone with geolocation data
  useEffect(() => {
    // Only update from geolocation if:
    // 1. We've finished loading from localStorage (hasUserSetReference is not null)
    // 2. User hasn't set a custom reference (hasUserSetReference is false)
    if (hasUserSetReference === null || hasUserSetReference === true) return;
    
    if (location && !geoError) {
      fetch(`/api/location?lat=${location.latitude}&lng=${location.longitude}`)
        .then(res => res.json())
        .then(data => {
          const detectedTimezone = {
            id: 'local',
            city: data.city,
            timezone: data.timezone,
            country: data.country,
            offset: getTimezoneOffset(data.timezone)
          };
          setReferenceTimezone(detectedTimezone);
        })
        .catch(() => {
          const localTz = getLocalTimezone();
          setReferenceTimezone(localTz);
        });
    } else {
      const localTz = getLocalTimezone();
      setReferenceTimezone(localTz);
    }
  }, [location, geoError, hasUserSetReference]);

  useEffect(() => {
    const updateTime = () => {
      if (!timeState.isTimeModified) {
        // grab the current instant…
        const now = new Date();
  
        // …and re-interpret it in your reference zone
        const referenceTime = toZonedTime(now, referenceTimezone.timezone);
  
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
  }, [timeState.isTimeModified, referenceTimezone]);

  const handleTimeChange = useCallback((newTime: Date) => {
    setTimeState(prev => ({
      ...prev,
      selectedTime: newTime,
      isTimeModified: true,
    }));
  }, []);

  const handleAddTimezone = useCallback((timezone: TimezoneData) => {
    // Check for duplicates based on exact city+country combination only
    // This allows multiple cities in the same timezone but prevents exact duplicates
    const isDuplicate = timeState.timezones.some(existing => 
      existing.city.toLowerCase() === timezone.city.toLowerCase() && 
      existing.country.toLowerCase() === timezone.country.toLowerCase()
    ) || (
      referenceTimezone.city.toLowerCase() === timezone.city.toLowerCase() && 
      referenceTimezone.country.toLowerCase() === timezone.country.toLowerCase()
    );
    
    if (isDuplicate) {
      console.log('Duplicate timezone detected, not adding:', timezone.city, timezone.country);
      return;
    }
    
    // Ensure unique ID
    const uniqueTimezone = {
      ...timezone,
      id: timezone.id.includes('custom-') ? timezone.id : `${timezone.id}-${Date.now()}`
    };
    
    setTimeState(prev => ({
      ...prev,
      timezones: [...prev.timezones, uniqueTimezone],
    }));
  }, []);

  const handleRemoveTimezone = useCallback((timezoneId: string) => {
    setTimeState(prev => ({
      ...prev,
      timezones: prev.timezones.filter(tz => tz.id !== timezoneId),
    }));
  }, []);

  const handleSetAsReference = useCallback((timezone: TimezoneData) => {
    // Move current reference to the timezone list
    const currentReference = referenceTimezone;
    
    // Remove the selected timezone from the list
    setTimeState(prev => ({
      ...prev,
      timezones: prev.timezones.filter(tz => tz.id !== timezone.id),
    }));
    
    // Convert the current selected time to the new reference timezone
    const convertedTime = convertTime(
      timeState.selectedTime,
      currentReference.offset,
      timezone.offset
    );
    
    // Set the new reference timezone
    setReferenceTimezone(timezone);
    setHasUserSetReference(true);
    
    // Update the time state with the converted time
    setTimeState(prev => ({
      ...prev,
      selectedTime: convertedTime,
      referenceTime: convertedTime,
      timezones: [
        ...prev.timezones.filter(tz => tz.id !== timezone.id && tz.id !== currentReference.id), 
        currentReference
      ],
    }));
  }, [referenceTimezone, timeState.selectedTime]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
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
    const now = new Date();
    const referenceTime = toZonedTime(now, referenceTimezone.timezone);
  
    setTimeState(prev => ({
      ...prev,
      referenceTime,
      selectedTime: referenceTime,
      isTimeModified: false,
    }));
  };

  // Get the active timezone for drag overlay
  const activeTimezone = timeState.timezones.find(tz => tz.id === activeId);
  
  // Don't render until we've loaded from localStorage to prevent flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        
        <div className="relative z-10 container mx-auto px-6 py-12 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-4 glass rounded-2xl">
                <Clock className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <h1 className="text-6xl font-thin tracking-tight text-white mb-4 text-glow">
              TimeGrid
            </h1>
            <p className="text-slate-400 text-lg font-light">
              Synchronize time across the globe
            </p>
          </div>
          
          {/* Skeleton Loading State */}
          <div className="space-y-8">
            {/* Reference Timezone Card Skeleton */}
            <div className="glass-card rounded-3xl p-8 ring-1 ring-blue-400/30 glow">
              <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <Skeleton className="h-6 w-24 bg-white/10" />
                      </div>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-400/30">
                        Reference
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <Skeleton className="h-4 w-16 bg-white/10" />
                      <Skeleton className="h-4 w-12 bg-white/10" />
                      <span>•</span>
                      <Skeleton className="h-4 w-16 bg-white/10" />
                      <Skeleton className="h-3 w-12 bg-white/10" />
                    </div>
                  </div>
                </div>

                {/* Time Display Skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-16 w-32 bg-white/10" />
                </div>

                {/* Time Selector Skeleton */}
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-slate-300">Reference Time</span>
                    </div>
                    <Skeleton className="h-6 w-16 bg-white/10 rounded-lg" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="px-1">
                      <Skeleton className="h-6 w-full bg-white/10 rounded-full" />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 px-1">
                      <span>12:00 AM</span>
                      <span>12:00 PM</span>
                      <span>11:59 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Timezone Cards Skeleton */}
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-6 min-h-[200px] flex flex-col">
                  <div className="space-y-6">
                    {/* Header Skeleton */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <Skeleton className="h-6 w-20 bg-white/10" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 bg-white/10 rounded-lg" />
                        <Skeleton className="h-8 w-8 bg-white/10 rounded-lg" />
                        <Skeleton className="h-8 w-8 bg-white/10 rounded-lg" />
                      </div>
                    </div>

                    {/* Time Display Skeleton */}
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-28 bg-white/10" />
                    </div>

                    {/* Badge Skeleton */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Skeleton className="h-6 w-16 bg-white/10 rounded-full" />
                      <Skeleton className="h-6 w-12 bg-white/10 rounded-full" />
                      <Skeleton className="h-6 w-16 bg-white/10 rounded-full" />
                      <Skeleton className="h-6 w-12 bg-white/10 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Button Skeleton */}
            <div className="flex justify-center">
              <Skeleton className="h-16 w-16 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 glass rounded-2xl">
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-6xl font-thin tracking-tight text-white mb-4 text-glow">
            TimeGrid
          </h1>
          <p className="text-slate-400 text-lg font-light">
            Synchronize time across the globe
          </p>
        </div>

        {/* Reference Timezone Card */}
        <div className="mb-8">
          <TimezoneCard
            timezone={referenceTimezone}
            displayTime={timeState.selectedTime}
            isReference={true}
          >
            <div className="space-y-6 mt-6">
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
                    className="h-8 px-4 glass-button hover:bg-blue-500/20 hover:border-blue-400/30 transition-all duration-300 group"
                    title="Reset to current time"
                  >
                    <span className="text-sm text-slate-400 group-hover:text-blue-300 font-medium">
                      Reset to current time
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </TimezoneCard>
        </div>

        {/* Additional Timezone Cards with Drag and Drop */}
        {isMounted && timeState.timezones.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={timeState.timezones}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                {timeState.timezones.map((timezone) => {
                  const convertedTime = convertTime(
                    timeState.selectedTime,
                    referenceTimezone.offset,
                    timezone.offset
                  );

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
                <div className="rotate-2 scale-90 shadow-2xl shadow-blue-500/25 opacity-95 transition-all duration-200 ease-out w-80">
                  <TimezoneCard
                    timezone={activeTimezone}
                    displayTime={convertTime(
                      timeState.selectedTime,
                      referenceTimezone.offset,
                      activeTimezone.offset
                    )}
                    isDragging={true}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Status Messages */}
        {geoLoading && (
          <div className="text-center text-slate-400 mt-8 font-light">
            <div className="inline-flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Detecting your location...
            </div>
          </div>
        )}
        
        {geoError && (
          <div className="text-center text-slate-500 mt-8 font-light">
            Using system timezone as reference
          </div>
        )}
      </div>

      {/* Floating Add Timezone Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <AddTimezoneDialog
          onAddTimezone={handleAddTimezone}
          existingTimezones={[referenceTimezone, ...timeState.timezones]}
        />
      </div>
    </div>
  );
}