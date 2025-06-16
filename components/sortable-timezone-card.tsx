'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TimezoneCard } from './timezone-card';
import type { TimezoneData } from '@/types/timezone';

interface SortableTimezoneCardProps {
  timezone: TimezoneData;
  displayTime: Date;
  onRemove: () => void;
  onSetAsReference: () => void;
}

export function SortableTimezoneCard({
  timezone,
  displayTime,
  onRemove,
  onSetAsReference,
}: SortableTimezoneCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: timezone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transition || 'transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'),
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className={`relative ${
        isDragging ? 'z-50' : 'z-0'
      }`}
    >
      {/* Show dashed placeholder when this item is being dragged */}
      {isDragging ? (
        <div className="min-h-[200px] border-2 border-dashed border-blue-400/60 rounded-2xl bg-blue-400/5 backdrop-blur-sm flex items-center justify-center transition-all duration-200 ease-out">
          <div className="text-blue-400/60 text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-pulse" />
            Moving {timezone.city}...
          </div>
        </div>
      ) : (
        <TimezoneCard
          timezone={timezone}
          displayTime={displayTime}
          onRemove={onRemove}
          onSetAsReference={onSetAsReference}
          dragHandleProps={listeners}
          isDragging={false}
        />
      )}
    </div>
  );
}