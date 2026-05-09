"use client";

import { useStores } from "@app/stores/store-context";
import { msUntilNextMinuteBoundary } from "@app/stores/time-state-store";
import { useEffect } from "react";

/**
 * Drives the live ticker for the time-state store. While `isModified` is
 * true, no auto-tick runs; the slider is the source of truth. When it's
 * false, we fire a tick at the next minute boundary and every minute after.
 */
export function useLiveTick(): void {
  const { timeStateStore } = useStores();
  useEffect(() => {
    let initialTimeout: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      const state = timeStateStore.getState();
      if (state.isModified) return;
      state.tickNow();
      initialTimeout = setTimeout(() => {
        timeStateStore.getState().tickNow();
        interval = setInterval(() => {
          timeStateStore.getState().tickNow();
        }, 60_000);
      }, msUntilNextMinuteBoundary(new Date()));
    };

    const stop = () => {
      if (initialTimeout !== null) clearTimeout(initialTimeout);
      if (interval !== null) clearInterval(interval);
      initialTimeout = null;
      interval = null;
    };

    const unsub = timeStateStore.subscribe((state, prev) => {
      if (state.isModified !== prev.isModified) {
        stop();
        if (!state.isModified) start();
      }
    });

    if (!timeStateStore.getState().isModified) start();

    return () => {
      stop();
      unsub();
    };
  }, [timeStateStore]);
}
