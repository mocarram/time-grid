"use client";

import { useState, useEffect } from "react";

interface GeolocationState {
  location: { latitude: number; longitude: number } | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        location: null,
        error: "Geolocation is not supported by this browser",
        loading: false,
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 600000, // 10 minutes
    };

    navigator.geolocation.getCurrentPosition(
      position => {
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
          loading: false,
        });
      },
      error => {
        setState({
          location: null,
          error: error.message,
          loading: false,
        });
      },
      options
    );
  }, []);

  return state;
}
