'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { X, Star, GripVertical, MoreHorizontal } from 'lucide-react';
import { formatTime } from '@/lib/timezone-utils';
import type { TimezoneData } from '@/types/timezone';

interface TimezoneCardProps {
  timezone: TimezoneData;
  displayTime: Date;
  isReference?: boolean;
  onRemove?: () => void;
  onSetAsReference?: () => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  children?: React.ReactNode;
}

export function TimezoneCard({ 
  timezone, 
  displayTime, 
  isReference = false, 
  onRemove, 
  onSetAsReference,
  dragHandleProps,
  isDragging = false,
  children 
}: TimezoneCardProps) {
  const [clientTime, setClientTime] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setClientTime(formatTime(displayTime));
  }, [displayTime]);

  const offsetHours = Math.floor(Math.abs(timezone.offset) / 60);
  const offsetMinutes = Math.abs(timezone.offset) % 60;
  const offsetSign = timezone.offset >= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${offsetHours}${offsetMinutes > 0 ? ':' + offsetMinutes.toString().padStart(2, '0') : ''}`;

  // Determine if it's a different day compared to reference
  const now = new Date();
  const dayDiff = displayTime.getDate() - now.getDate();
  const dayIndicator = dayDiff > 0 ? '+1' : dayDiff < 0 ? '-1' : '';

  return (
    <div 
      className={`glass-card rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group min-h-[140px] flex flex-col relative ${
        isReference ? 'ring-1 ring-blue-400/30 glow' : ''
      } ${
        isDragging ? 'ring-2 ring-blue-400/50 glow bg-white/[0.08] backdrop-blur-3xl shadow-2xl shadow-blue-500/30' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header - City and Actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium text-base transition-colors duration-300 truncate ${
              isDragging ? 'text-blue-200' : 'text-white'
            }`}>
              {timezone.city}
            </h3>
            {isReference && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-medium rounded border border-blue-400/30 shrink-0">
                REF
              </span>
            )}
            {dayIndicator && (
              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 text-xs font-medium rounded border border-orange-400/30 shrink-0">
                {dayIndicator}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {timezone.country} • GMT{offsetString}
          </p>
        </div>
        
        {/* Actions - Only show on hover or when dragging */}
        {!isReference && (onRemove || onSetAsReference) && (
          <div className={`flex items-center gap-1 transition-all duration-300 ${
            isHovered || isDragging ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          }`}>
            {dragHandleProps && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 glass-button hover:bg-white/20 transition-all duration-300 cursor-grab active:cursor-grabbing touch-none select-none"
                title="Drag to reorder"
                {...dragHandleProps}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
              >
                <GripVertical className="h-3 w-3 text-slate-400 group-hover:text-white pointer-events-none select-none" />
              </Button>
            )}
            {onSetAsReference && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSetAsReference}
                className="h-7 w-7 p-0 glass-button hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-300"
                title="Set as reference"
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
            {onRemove && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 glass-button hover:bg-red-500/20 hover:text-red-300 transition-all duration-300"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Remove Timezone</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-300">
                      Remove <span className="font-medium text-white">{timezone.city}</span> from your world clock?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="glass-button border-white/20 text-slate-300 hover:bg-white/10 hover:text-white">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onRemove}
                      className="bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="flex-1 flex items-center">
        <div className={`text-3xl font-light text-white tracking-tight transition-all duration-300 ${
          isDragging ? 'text-blue-200' : ''
        }`}>
          {clientTime || <Skeleton className="h-9 w-20 bg-white/10" />}
        </div>
      </div>

      {/* Time Selector for Reference Card */}
      {isReference && children && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}