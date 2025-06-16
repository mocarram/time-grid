'use client';

import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { TimezoneCard } from '@/components/timezone-card';
import { convertTime } from '@/lib/timezone-utils';
import type { TimezoneData } from '@/types/timezone';
import { GripVertical } from 'lucide-react';

interface DraggableTimezoneListProps {
  timezones: TimezoneData[];
  referenceTimezone: TimezoneData;
  selectedTime: Date;
  onRemove: (timezoneId: string) => void;
  onSetAsReference: (timezone: TimezoneData) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
}

export function DraggableTimezoneList({
  timezones,
  referenceTimezone,
  selectedTime,
  onRemove,
  onSetAsReference,
  onReorder,
}: DraggableTimezoneListProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    
    if (startIndex !== endIndex) {
      onReorder(startIndex, endIndex);
    }
  };

  if (timezones.length === 0) {
    return null;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="timezone-list">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-6 transition-all duration-300 ${
              snapshot.isDraggingOver ? 'bg-blue-500/5 rounded-2xl p-4' : ''
            }`}
          >
            {timezones.map((timezone, index) => {
              const convertedTime = convertTime(
                selectedTime,
                referenceTimezone.offset,
                timezone.offset
              );

              return (
                <Draggable key={timezone.id} draggableId={timezone.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`relative transition-all duration-300 ${
                        snapshot.isDragging 
                          ? 'scale-105 rotate-2 shadow-2xl shadow-blue-500/25 z-50' 
                          : 'hover:scale-[1.02]'
                      }`}
                      style={{
                        ...provided.draggableProps.style,
                        transform: snapshot.isDragging 
                          ? `${provided.draggableProps.style?.transform} rotate(2deg)` 
                          : provided.draggableProps.style?.transform,
                      }}
                    >
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg transition-all duration-300 ${
                          snapshot.isDragging
                            ? 'bg-blue-500/30 text-blue-200'
                            : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 opacity-0 group-hover:opacity-100'
                        }`}
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Timezone Card with left padding for drag handle */}
                      <div className="group">
                        <div className="pl-12">
                          <TimezoneCard
                            timezone={timezone}
                            displayTime={convertedTime}
                            onRemove={() => onRemove(timezone.id)}
                            onSetAsReference={() => onSetAsReference(timezone)}
                            isDragging={snapshot.isDragging}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}