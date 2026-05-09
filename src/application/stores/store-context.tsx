"use client";

import { createTimeStateStore, type TimeStateStore } from "@app/stores/time-state-store";
import {
  createWorkspaceStore,
  type WorkspaceStoreState,
} from "@app/stores/workspace-store";
import { type CitiesClient,createCitiesClient } from "@infra/api/cities";
import {
  createIpTimezoneClient,
  type IpTimezoneClient,
} from "@infra/api/ip-timezone";
import { createTimezoneClient, type TimezoneClient } from "@infra/api/timezone";
import {
  createUserDataClient,
  type UserDataClient,
} from "@infra/api/user-data";
import { createStorageAdapter } from "@infra/storage/local";
import { createContext, type ReactNode,useContext, useMemo } from "react";
import type { StoreApi,UseBoundStore } from "zustand";

interface StoresContextValue {
  workspaceStore: UseBoundStore<StoreApi<WorkspaceStoreState>>;
  timeStateStore: UseBoundStore<StoreApi<TimeStateStore>>;
  citiesClient: CitiesClient;
  timezoneClient: TimezoneClient;
  ipTimezoneClient: IpTimezoneClient;
  userDataClient: UserDataClient;
}

const StoresContext = createContext<StoresContextValue | null>(null);

export function StoresProvider({ children }: { children: ReactNode }) {
  const value = useMemo<StoresContextValue>(() => {
    const adapter = createStorageAdapter();
    return {
      workspaceStore: createWorkspaceStore({ storage: adapter }),
      timeStateStore: createTimeStateStore(),
      citiesClient: createCitiesClient(),
      timezoneClient: createTimezoneClient(),
      ipTimezoneClient: createIpTimezoneClient(),
      userDataClient: createUserDataClient(),
    };
  }, []);
  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
}

export function useStores(): StoresContextValue {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error("useStores called outside StoresProvider");
  return ctx;
}
