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
  } = useSortable({ id: timezone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className={`relative transition-all duration-100 ease-out ${
        isDragging ? 'z-50' : 'z-0'
      }`}
    >
      <div className={`transition-all duration-100 ease-out ${
        isDragging 
          ? 'border-2 border-dashed border-blue-400/80 rounded-3xl bg-blue-400/10 backdrop-blur-sm opacity-50' 
          : 'opacity-100'
      }`}>
        <TimezoneCard
          timezone={timezone}
          displayTime={displayTime}
          onRemove={onRemove}
          onSetAsReference={onSetAsReference}
          dragHandleProps={listeners}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}