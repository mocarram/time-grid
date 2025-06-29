'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTimezoneOffset } from '@/lib/timezone-utils';
import type { TimezoneData, TimeState } from '@/types/timezone';
import type { Workspace } from '@/types/workspace';

interface UrlState {
  referenceTimezone: TimezoneData | null;
  timeState: Partial<TimeState> | null;
  workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'> | null;
  isLoading: boolean;
}

export function useUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [urlState, setUrlState] = useState<UrlState>({
    referenceTimezone: null,
    timeState: null,
    workspace: null,
    isLoading: true,
  });
  const [hasProcessedUrl, setHasProcessedUrl] = useState(false);

  // Parse URL parameters on mount
  useEffect(() => {
    console.log('=== useUrlState: Parsing URL parameters ===');
    
    const ref = searchParams.get('ref');
    const time = searchParams.get('time');
    const zones = searchParams.get('zones');
    const workspace = searchParams.get('workspace');
    const modified = searchParams.get('modified');

    // Only process if we have actual shared data (not just empty params)
    const hasActualSharedData = (ref && ref.trim()) || 
                               (time && time.trim()) || 
                               (zones && zones.trim()) || 
                               (workspace && workspace.trim());

    if (hasActualSharedData) {
      console.log('Found URL parameters:', { ref, time, zones, workspace, modified });
      
      try {
        let referenceTimezone: TimezoneData | null = null;
        let timeState: Partial<TimeState> | null = null;
        let workspaceData: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'> | null = null;

        // Parse reference timezone
        if (ref) {
          const [city, country, timezone] = ref.split(',');
          if (city && country && timezone) {
            referenceTimezone = {
              id: `shared-ref-${Date.now()}`,
              city: decodeURIComponent(city),
              country: decodeURIComponent(country),
              timezone: decodeURIComponent(timezone),
              offset: getTimezoneOffset(decodeURIComponent(timezone))
            };
          }
        }

        // Parse time state
        if (time || zones || modified) {
          timeState = {};
          
          if (time) {
            const selectedTime = new Date(decodeURIComponent(time));
            if (!isNaN(selectedTime.getTime())) {
              timeState.selectedTime = selectedTime;
              timeState.referenceTime = selectedTime;
            }
          }

          if (zones) {
            try {
              const zonesData = JSON.parse(decodeURIComponent(zones));
              if (Array.isArray(zonesData)) {
                timeState.timezones = zonesData.map((zone: any, index: number) => ({
                  id: `shared-zone-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  city: zone.city,
                  country: zone.country,
                  timezone: zone.timezone,
                  offset: getTimezoneOffset(zone.timezone)
                }));
                console.log('Parsed timezones from URL:', timeState.timezones);
              }
            } catch (error) {
              console.error('Failed to parse zones:', error);
            }
          }

          if (modified) {
            timeState.isTimeModified = modified === 'true';
          }
        }

        // Parse workspace data
        if (workspace) {
          try {
            const parsedWorkspace = JSON.parse(decodeURIComponent(workspace));
            // Don't include the original timezone IDs since we'll be creating new ones
            workspaceData = {
              ...parsedWorkspace,
              timezones: [], // Start with empty array, will be populated when timezones are added
            };
            console.log('Parsed workspace data:', workspaceData);
          } catch (error) {
            console.error('Failed to parse workspace:', error);
          }
        }

        console.log('Parsed URL state:', { referenceTimezone, timeState, workspace: workspaceData });
        
        setUrlState({
          referenceTimezone,
          timeState,
          workspace: workspaceData,
          isLoading: false,
        });
        setHasProcessedUrl(true);

        // Clean up URL after a short delay to ensure state is loaded
        setTimeout(() => {
          console.log('Cleaning up URL after shared state loaded');
          router.replace(window.location.pathname, { scroll: false });
        }, 1000); // Increased delay to ensure everything is saved
        
      } catch (error) {
        console.error('Failed to parse URL state:', error);
        setUrlState({
          referenceTimezone: null,
          timeState: null,
          workspace: null,
          isLoading: false,
        });
        setHasProcessedUrl(true);
      }
    } else {
      console.log('No URL parameters found');
      setUrlState({
        referenceTimezone: null,
        timeState: null,
        workspace: null,
        isLoading: false,
      });
      setHasProcessedUrl(true);
    }
  }, [searchParams, router]);

  // Removed updateUrl function since we don't need automatic URL updates

  // Function to generate shareable URL
  const generateShareUrl = useCallback((
    referenceTimezone: TimezoneData,
    timeState: TimeState,
    activeWorkspace?: Workspace | null,
    filteredTimezones?: TimezoneData[]
  ) => {
    const params = new URLSearchParams();

    // Add reference timezone
    params.set('ref', `${encodeURIComponent(referenceTimezone.city)},${encodeURIComponent(referenceTimezone.country)},${encodeURIComponent(referenceTimezone.timezone)}`);

    // Add selected time
    params.set('time', encodeURIComponent(timeState.selectedTime.toISOString()));

    // Add timezones (use filtered timezones if provided, otherwise all timezones)
    const timezonesToShare = filteredTimezones || timeState.timezones;
    if (timezonesToShare.length > 0) {
      const zonesData = timezonesToShare.map(tz => ({
        city: tz.city,
        country: tz.country,
        timezone: tz.timezone
      }));
      params.set('zones', encodeURIComponent(JSON.stringify(zonesData)));
    }

    // Add modified flag
    if (timeState.isTimeModified) {
      params.set('modified', 'true');
    }

    // Add workspace data if available
    if (activeWorkspace) {
      const workspaceData = {
        name: activeWorkspace.name,
        description: activeWorkspace.description,
        color: activeWorkspace.color,
        icon: activeWorkspace.icon,
        timezoneCount: timezonesToShare.length, // Include count for display purposes
      };
      params.set('workspace', encodeURIComponent(JSON.stringify(workspaceData)));
    }

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, []);

  return {
    urlState,
    generateShareUrl,
    hasProcessedUrl,
  };
}