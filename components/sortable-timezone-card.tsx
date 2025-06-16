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
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className="relative"
    >
      <div className={`transition-all duration-200 ${
        isDragging 
          ? 'border-2 border-dashed border-blue-400/80 rounded-3xl bg-blue-400/10 backdrop-blur-sm' 
            : ''
      }`}>
        <TimezoneCard
          timezone={timezone}
          displayTime={displayTime}
          onRemove={onRemove}
          onSetAsReference={onSetAsReference}
          dragHandleProps={listeners}
          isDragging={false}
        />
      </div>
    </div>
  );
}