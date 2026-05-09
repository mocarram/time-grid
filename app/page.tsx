"use client";

import { useAuthSync } from "@app/hooks/use-auth-sync";
import { useIpTimezone } from "@app/hooks/use-ip-timezone";
import { useLiveTick } from "@app/hooks/use-live-tick";
import { useShareUrl } from "@app/hooks/use-share-url";
import { useActiveWorkspace, useWorkspaceStore } from "@app/hooks/use-workspace";
import { useStores } from "@app/stores/store-context";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { buildTimezoneData } from "@domain/workspace/operations";
import type { TimezoneData } from "@schemas/timezone";
import { AddTimezoneDialog } from "@ui/features/add-timezone-dialog";
import { AuthButton } from "@ui/features/auth-button";
import { Footer } from "@ui/features/footer";
import { Header } from "@ui/features/header";
import { ShareButton } from "@ui/features/share-button";
import { TimeGridSkeleton } from "@ui/features/skeleton";
import { SortableTimezoneCard } from "@ui/features/sortable-timezone-card";
import { TimeSelector } from "@ui/features/time-selector";
import { TimezoneCard } from "@ui/features/timezone-card";
import { WorkspaceSelector } from "@ui/features/workspace-selector";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

function WorldClockContent() {
  const workspaceStore = useWorkspaceStore();
  const activeWorkspace = useActiveWorkspace();
  const workspaces = workspaceStore((s) => s.workspaces);
  const hydrated = workspaceStore((s) => s.hydrated);
  const { timeStateStore } = useStores();
  const instantUtc = timeStateStore((s) => s.instantUtc);
  const isModified = timeStateStore((s) => s.isModified);
  const { data: ipData } = useIpTimezone();
  const authSync = useAuthSync();
  const { generate } = useShareUrl();
  useLiveTick();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Auto-detect reference timezone for workspaces that don't have one yet.
  useEffect(() => {
    if (!activeWorkspace) return;
    if (activeWorkspace.referenceTimezone) return;
    if (!ipData || ipData.timezone === "UTC") return;
    const detected = buildTimezoneData({
      id: "local",
      city: ipData.city,
      country: ipData.country,
      timezone: ipData.timezone,
    });
    workspaceStore.getState().setReferenceTimezone(detected);
  }, [activeWorkspace, ipData, workspaceStore]);

  const reference = activeWorkspace?.referenceTimezone ?? null;
  const timezones = useMemo(() => activeWorkspace?.timezones ?? [], [activeWorkspace]);

  if (!hydrated) return <TimeGridSkeleton />;

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const from = timezones.findIndex((t) => t.id === active.id);
    const to = timezones.findIndex((t) => t.id === over.id);
    if (from < 0 || to < 0) return;
    workspaceStore.getState().reorderTimezones(from, to);
  };

  const handleAdd = (tz: TimezoneData) => workspaceStore.getState().addTimezone(tz);
  const handleRemove = (id: string) => workspaceStore.getState().removeTimezone(id);
  const handleSetReference = (tz: TimezoneData) =>
    workspaceStore.getState().setReferenceTimezone(tz);
  const handleTimeChange = (next: string) =>
    timeStateStore.getState().setInstantUtc(next, true);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" aria-hidden="true" />
      <main className="relative z-10 flex flex-1 flex-col">
        <div className="container mx-auto max-w-5xl flex-1 px-6 py-12">
          <Header />
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:flex-1">
                <WorkspaceSelector
                  workspaces={workspaces}
                  activeWorkspace={activeWorkspace}
                  onSelect={(id) => workspaceStore.getState().setActiveWorkspace(id)}
                  onCreate={(input) => workspaceStore.getState().createWorkspace(input)}
                  onUpdate={(id, updates) =>
                    void workspaceStore.getState().updateWorkspace(id, updates)
                  }
                  onDelete={(id) => void workspaceStore.getState().deleteWorkspace(id)}
                />
              </div>
              <div className="lg:flex-shrink-0">
                <AuthButton authSync={authSync} />
              </div>
            </div>
          </div>

          {reference && (
            <div className="mb-8">
              <TimezoneCard timezone={reference} instantUtc={instantUtc} isReference>
                <div className="mt-6 space-y-6">
                  <TimeSelector
                    instantUtc={instantUtc}
                    zone={reference.timezone}
                    onChange={handleTimeChange}
                  />
                  {isModified && (
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => timeStateStore.getState().reset()}
                        className="glass-button h-8 px-4"
                        title="Reset to current time"
                      >
                        <span className="text-sm font-medium text-slate-400">
                          Reset to current time
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              </TimezoneCard>
            </div>
          )}

          {timezones.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={timezones} strategy={rectSortingStrategy}>
                <div
                  role="list"
                  aria-label="Timezone grid"
                  className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"
                >
                  {timezones.map((tz) => (
                    <SortableTimezoneCard
                      key={tz.id}
                      timezone={tz}
                      instantUtc={instantUtc}
                      onRemove={() => handleRemove(tz.id)}
                      onSetAsReference={() => handleSetReference(tz)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {activeDragId && (
            <span className="sr-only" aria-live="polite">
              Dragging
            </span>
          )}
        </div>
      </main>

      <Footer />

      <div className="fixed bottom-8 right-8 z-50 flex flex-row gap-4 sm:flex-col">
        <ShareButton onShare={() => generate(activeWorkspace)?.url ?? null} />
        <AddTimezoneDialog
          existingTimezones={reference ? [reference, ...timezones] : timezones}
          onAdd={handleAdd}
        />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<TimeGridSkeleton />}>
      <WorldClockContent />
    </Suspense>
  );
}
