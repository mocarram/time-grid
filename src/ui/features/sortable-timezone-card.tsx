"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TimezoneData } from "@schemas/timezone";

import { TimezoneCard } from "./timezone-card";

interface SortableTimezoneCardProps {
  timezone: TimezoneData;
  instantUtc: string;
  onRemove: () => void;
  onSetAsReference: () => void;
}

export function SortableTimezoneCard({
  timezone,
  instantUtc,
  onRemove,
  onSetAsReference,
}: SortableTimezoneCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: timezone.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? "none"
      : transition || "transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={isDragging ? "z-50" : "z-0"}>
      {isDragging ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-blue-400/60 bg-blue-400/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-400/60">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400/60" />
            Moving {timezone.city}…
          </div>
        </div>
      ) : (
        <TimezoneCard
          timezone={timezone}
          instantUtc={instantUtc}
          onRemove={onRemove}
          onSetAsReference={onSetAsReference}
          dragHandleProps={listeners}
        />
      )}
    </div>
  );
}
