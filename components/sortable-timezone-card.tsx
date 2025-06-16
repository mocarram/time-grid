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
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className={`relative transition-all duration-200 ${
        isOver && !isDragging ? 'border-2 border-dashed border-blue-400/50 rounded-3xl p-1' : ''
      }`}
    >
      {/* Drop indicator */}
      {isOver && !isDragging && (
        <div className="absolute inset-0 bg-blue-400/10 rounded-3xl animate-pulse" />
      )}
      <TimezoneCard
        timezone={timezone}
        displayTime={displayTime}
        onRemove={onRemove}
        onSetAsReference={onSetAsReference}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}