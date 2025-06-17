'use client';

import { useEffect } from 'react';
import { getTimezoneOffset } from '@/lib/timezone-utils';
import type { TimezoneData, TimeState } from '@/types/timezone';

interface ShareData {
  ref: {
    id: string;
    city: string;
    country: string;
    timezone: string;
  };
  time: string;
  zones: Array<{
    id: string;
    city: string;
    country: string;
    timezone: string;
  }>;
  modified: boolean;
}

interface UseShareDataProps {
  onLoadSharedData: (data: {
    referenceTimezone: TimezoneData;
    timeState: Partial<TimeState>;
  }) => void;
}

export function useShareData({ onLoadSharedData }: UseShareDataProps) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    
    if (shareParam) {
      try {
        // Decode the shared data
        const decodedData = JSON.parse(atob(shareParam));
        const shareData: ShareData = decodedData;
        
        // Reconstruct the reference timezone with current offset
        const referenceTimezone: TimezoneData = {
          id: shareData.ref.id,
          city: shareData.ref.city,
          country: shareData.ref.country,
          timezone: shareData.ref.timezone,
          offset: getTimezoneOffset(shareData.ref.timezone)
        };
        
        // Reconstruct the timezones with current offsets
        const timezones: TimezoneData[] = shareData.zones.map(zone => ({
          id: zone.id,
          city: zone.city,
          country: zone.country,
          timezone: zone.timezone,
          offset: getTimezoneOffset(zone.timezone)
        }));
        
        // Parse the shared time
        const selectedTime = new Date(shareData.time);
        
        // Create the time state
        const timeState: Partial<TimeState> = {
          selectedTime,
          referenceTime: selectedTime,
          timezones,
          isTimeModified: shareData.modified
        };
        
        // Load the shared data
        onLoadSharedData({
          referenceTimezone,
          timeState
        });
        
        // Clean up the URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
      } catch (error) {
        console.error('Failed to parse shared data:', error);
      }
    }
  }, [onLoadSharedData]);
}