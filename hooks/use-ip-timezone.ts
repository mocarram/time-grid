'use client';

import { useState, useEffect } from 'react';

interface IpTimezoneState {
  location: {
    city: string;
    country: string;
    timezone: string;
    source: 'ip' | 'browser';
  } | null;
  error: string | null;
  loading: boolean;
}

export function useIpTimezone() {
  const [state, setState] = useState<IpTimezoneState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const detectTimezone = async () => {
      try {
        const response = await fetch('/api/ip-timezone');
        const data = await response.json();
        
        setState({
          location: {
            city: data.city,
            country: data.country,
            timezone: data.timezone,
            source: data.source
          },
          error: null,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to detect timezone:', error);
        
        // Ultimate fallback to browser timezone
        setState({
          location: {
            city: 'Local',
            country: 'Unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            source: 'browser'
          },
          error: 'Failed to detect location, using browser timezone',
          loading: false,
        });
      }
    };

    detectTimezone();
  }, []);

  return state;
}