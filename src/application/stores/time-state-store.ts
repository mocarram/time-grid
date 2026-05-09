import { create } from "zustand";

import {
  msUntilNextMinuteBoundary,
  nowInstant,
  setWallClockInZone,
} from "@domain/time-state/travel";

export interface TimeStateStore {
  instantUtc: string;
  isModified: boolean;
  /** Replace the instant from a precise UTC value (e.g. share import). */
  setInstantUtc: (instantUtc: string, modified?: boolean) => void;
  /** Replace the wall clock in the given zone, marking modified. */
  setWallClock: (zone: string, hour: number, minute: number) => void;
  /** Live-tick: align to "now" without marking modified. */
  tickNow: () => void;
  /** User reset to current time. */
  reset: () => void;
}

export function createTimeStateStore() {
  return create<TimeStateStore>((set) => ({
    instantUtc: nowInstant(),
    isModified: false,
    setInstantUtc: (instantUtc, modified = true) => set({ instantUtc, isModified: modified }),
    setWallClock: (zone, hour, minute) => {
      set((s) => ({
        instantUtc: setWallClockInZone(s.instantUtc, zone, hour, minute),
        isModified: true,
      }));
    },
    tickNow: () => set({ instantUtc: nowInstant(), isModified: false }),
    reset: () => set({ instantUtc: nowInstant(), isModified: false }),
  }));
}

export { msUntilNextMinuteBoundary };
