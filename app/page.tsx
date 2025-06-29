'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkspaces } from '@/hooks/use-workspaces';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { TimezoneCard } from '@/components/timezone-card';
import { SortableTimezoneCard } from '@/components/sortable-timezone-card';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TimeSelector } from '@/components/time-selector';
import { AddTimezoneDialog } from '@/components/add-timezone-dialog';
import { ShareButton } from '@/components/share-button';
import { useIpTimezone } from '@/hooks/use-ip-timezone';
import { useUrlState } from '@/hooks/use-url-state';
import { 
  getLocalTimezone, 
  convertTime, 
  getTimezoneOffset 
} from '@/lib/timezone-utils';
import { getWorkspaceTimezones } from '@/lib/workspace-utils';
import type { TimezoneData, TimeState } from '@/types/timezone';
import { Clock, MapPin } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';

const REFERENCE_STORAGE_KEY = 'world-clock-reference-timezone';

export default function WorldClock() {
  const { location: ipLocation, error: ipError, loading: ipLoading } = useIpTimezone();
  const { urlState, generateShareUrl, hasProcessedUrl } = useUrlState();
  const {
    workspaces,
    activeWorkspace,
    workspaceTimezones,
    isLoaded: workspacesLoaded,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setActiveWorkspace,
    addTimezoneToWorkspace,
    removeTimezoneFromWorkspace,
    getWorkspaceTimezones: getWorkspaceTimezonesFromHook,
    getAllTimezones,
  } = useWorkspaces();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasUserSetReference, setHasUserSetReference] = useState<boolean | null>(null);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [timeState, setTimeState] = useState<Omit<TimeState, 'timezones'>>({
    referenceTime: new Date(),
    selectedTime: new Date(),
    isTimeModified: false,
  });
  const [referenceTimezone, setReferenceTimezone] = useState<TimezoneData>(getLocalTimezone());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set client flag after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Content */}
    </div>
  );
}