"use client";

import { useStores } from "@app/stores/store-context";
import { decodeShareParams, encodeShareSnapshot } from "@domain/sharing/codec";
import {
  buildTimezoneData,
  setReferenceTimezone,
} from "@domain/workspace/operations";
import type { ShareSnapshotV2 } from "@schemas/share";
import type { Workspace } from "@schemas/workspace";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function useShareUrl() {
  const { workspaceStore, timeStateStore } = useStores();
  const router = useRouter();
  const searchParams = useSearchParams();
  const importedRef = useRef(false);

  // One-shot import on initial load.
  useEffect(() => {
    if (importedRef.current) return;
    if (!workspaceStore.getState().hydrated) return;
    const params = new URLSearchParams(searchParams.toString());
    const snapshot = decodeShareParams(params);
    if (!snapshot) return;
    importedRef.current = true;
    importSnapshot(snapshot);
    router.replace(window.location.pathname, { scroll: false });
    function importSnapshot(snap: ShareSnapshotV2) {
      const ws = workspaceStore.getState();
      const newId = ws.createWorkspace({
        name: snap.workspace ? `${snap.workspace.name} (Shared)` : "Shared",
        color: snap.workspace?.color ?? "blue",
        icon: snap.workspace?.icon ?? "Globe",
        description: snap.workspace?.description,
      });
      if (!newId) return;
      // After creation the new workspace is active.
      const ref = buildTimezoneData(snap.ref);
      ws.setReferenceTimezone(ref);
      for (const z of snap.zones) {
        ws.addTimezone(buildTimezoneData(z));
      }
      timeStateStore.getState().setInstantUtc(snap.instantUtc, snap.isModified);
    }
    void setReferenceTimezone; // unused but kept to keep import for future
  }, [workspaceStore, timeStateStore, searchParams, router]);

  const generate = useCallback(
    (workspace: Workspace | null): { url: string; truncated: number } | null => {
      if (!workspace?.referenceTimezone) return null;
      const time = timeStateStore.getState();
      const snapshot: ShareSnapshotV2 = {
        v: 2,
        ref: {
          city: workspace.referenceTimezone.city,
          country: workspace.referenceTimezone.country,
          timezone: workspace.referenceTimezone.timezone,
        },
        zones: workspace.timezones.map((t) => ({
          city: t.city,
          country: t.country,
          timezone: t.timezone,
          kind: t.kind,
          ...(t.abbreviation ? { abbreviation: t.abbreviation } : {}),
          ...(t.region ? { region: t.region } : {}),
        })),
        instantUtc: time.instantUtc,
        isModified: time.isModified,
        workspace: {
          name: workspace.name,
          color: workspace.color,
          icon: workspace.icon,
          ...(workspace.description ? { description: workspace.description } : {}),
        },
      };
      return encodeShareSnapshot(
        snapshot,
        window.location.origin,
        window.location.pathname,
      );
    },
    [timeStateStore],
  );

  return { generate };
}
