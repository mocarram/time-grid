'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTimezoneOffset } from '@/lib/timezone-utils';
import type { TimezoneData, TimeState } from '@/types/timezone';

interface UrlState {
  referenceTimezone: TimezoneData | null;
  timeState: Partial<TimeState> | null;
  isLoading: boolean;
}

export function useUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [urlState, setUrlState] = useState<UrlState>({
    referenceTimezone: null,
    timeState: null,
    isLoading: true,
  });

  // Parse URL parameters on mount
  useEffect(() => {
    console.log('=== useUrlState: Parsing URL parameters ===');
    
    const ref = searchParams.get('ref');
    const time = searchParams.get('time');
    const zones = searchParams.get('zones');
    const modified = searchParams.get('modified');

    if (ref || time || zones) {
      console.log('Found URL parameters:', { ref, time, zones, modified });
      
      try {
        let referenceTimezone: TimezoneData | null = null;
        let timeState: Partial<TimeState> | null = null;

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
                  id: `shared-zone-${index}-${Date.now()}`,
                  city: zone.city,
                  country: zone.country,
                  timezone: zone.timezone,
                  offset: getTimezoneOffset(zone.timezone)
                }));
              }
            } catch (error) {
              console.error('Failed to parse zones:', error);
            }
          }

          if (modified) {
            timeState.isTimeModified = modified === 'true';
          }
        }

        console.log('Parsed URL state:', { referenceTimezone, timeState });
        
        setUrlState({
          referenceTimezone,
          timeState,
          isLoading: false,
        });

        // Clean up URL after parsing
        router.replace(window.location.pathname, { scroll: false });
        
      } catch (error) {
        console.error('Failed to parse URL state:', error);
        setUrlState({
          referenceTimezone: null,
          timeState: null,
          isLoading: false,
        });
      }
    } else {
      console.log('No URL parameters found');
      setUrlState({
        referenceTimezone: null,
        timeState: null,
        isLoading: false,
      });
    }
  }, [searchParams, router]);

  // Function to update URL with current state
  const updateUrl = useCallback((
    referenceTimezone: TimezoneData,
    timeState: TimeState
  ) => {
    const params = new URLSearchParams();

    // Add reference timezone
    params.set('ref', `${encodeURIComponent(referenceTimezone.city)},${encodeURIComponent(referenceTimezone.country)},${encodeURIComponent(referenceTimezone.timezone)}`);

    // Add selected time
    params.set('time', encodeURIComponent(timeState.selectedTime.toISOString()));

    // Add timezones
    if (timeState.timezones.length > 0) {
      const zonesData = timeState.timezones.map(tz => ({
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

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    
    // Update URL without triggering navigation
    window.history.replaceState({}, '', newUrl);
    
    return newUrl;
  }, []);

  // Function to generate shareable URL
  const generateShareUrl = useCallback((
    referenceTimezone: TimezoneData,
    timeState: TimeState
  ) => {
    const params = new URLSearchParams();

    // Add reference timezone
    params.set('ref', `${encodeURIComponent(referenceTimezone.city)},${encodeURIComponent(referenceTimezone.country)},${encodeURIComponent(referenceTimezone.timezone)}`);

    // Add selected time
    params.set('time', encodeURIComponent(timeState.selectedTime.toISOString()));

    // Add timezones
    if (timeState.timezones.length > 0) {
      const zonesData = timeState.timezones.map(tz => ({
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

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, []);

  return {
    urlState,
    updateUrl,
    generateShareUrl,
  };
}