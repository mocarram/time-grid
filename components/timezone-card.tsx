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
import { X, MapPin, Star } from 'lucide-react';
import { formatTime, formatDate, formatDay } from '@/lib/timezone-utils';
import type { TimezoneData } from '@/types/timezone';

interface TimezoneCardProps {
  timezone: TimezoneData;
  displayTime: Date;
  isReference?: boolean;
  onRemove?: () => void;
  onSetAsReference?: () => void;
  children?: React.ReactNode;
}

export function TimezoneCard({ 
  timezone, 
  displayTime, 
  isReference = false, 
  onRemove, 
  onSetAsReference,
  children 
}: TimezoneCardProps) {
  const [clientTime, setClientTime] = useState<{
    time: string;
    date: string;
    day: string;
  } | null>(null);

  useEffect(() => {
    setClientTime({
      time: formatTime(displayTime),
      date: formatDate(displayTime),
      day: formatDay(displayTime)
    });
  }, [displayTime]);

  const offsetHours = Math.floor(Math.abs(timezone.offset) / 60);
  const offsetMinutes = Math.abs(timezone.offset) % 60;
  const offsetSign = timezone.offset >= 0 ? '+' : '-';
  const offsetString = `GMT${offsetSign}${offsetHours}${offsetMinutes > 0 ? ':' + offsetMinutes.toString().padStart(2, '0') : ''}`;

  return (
    <div className={`glass-card rounded-3xl p-8 transition-all duration-500 hover:bg-white/[0.04] group ${
      isReference ? 'ring-1 ring-blue-400/30 glow' : ''
    }`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-800 dark:text-white font-medium text-lg">{timezone.city}</span>
              </div>
              {isReference && (
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-400/30">
                  Reference
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-white/30 backdrop-blur-sm text-slate-700 dark:bg-white/5 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200/50 dark:border-white/10">
                {timezone.country}
              </span>
              <span className="px-3 py-1 bg-white/30 backdrop-blur-sm text-blue-600 dark:bg-white/5 dark:text-blue-300 text-xs font-medium rounded-full border border-slate-200/50 dark:border-white/10 font-mono">
                {offsetString}
              </span>
              {clientTime ? (
                <>
                  <span className="px-3 py-1 bg-white/30 backdrop-blur-sm text-slate-700 dark:bg-white/5 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200/50 dark:border-white/10">
                    {clientTime.date}
                  </span>
                  <span className="px-3 py-1 bg-white/30 backdrop-blur-sm text-slate-700 dark:bg-white/5 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200/50 dark:border-white/10">
                    {clientTime.day}
                  </span>
                </>
              ) : (
                <>
                  <Skeleton className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <Skeleton className="h-6 w-12 bg-slate-200 dark:bg-white/10 rounded-full" />
                </>
              )}
            </div>
          </div>
          
          {!isReference && (onRemove || onSetAsReference) && (
            <div className="flex items-center gap-2">
              {onSetAsReference && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSetAsReference}
                  className="h-9 w-9 p-0 glass-button hover:bg-blue-500/20 hover:border-blue-400/30 hover:text-blue-300 transition-all duration-300 group"
                  title="Set as reference timezone"
                >
                  <Star className="h-4 w-4 text-slate-600 dark:text-slate-400 group-hover:fill-current group-hover:text-blue-500 dark:group-hover:text-blue-300" />
                </Button>
              )}
              {onRemove && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 glass-button hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-300 transition-all duration-300"
                  title="Remove timezone"
                >
                  <X className="h-4 w-4 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-300" />
                </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-slate-800 dark:text-white">Remove Timezone</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to remove <span className="font-medium text-slate-800 dark:text-white">{timezone.city}, {timezone.country}</span> from your world clock? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="glass-button border-slate-200/50 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={onRemove}
                        className="bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 hover:border-red-400/50 hover:text-red-200"
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
        <div className="space-y-2">
          <div className="text-5xl font-thin text-slate-800 dark:text-white tracking-tight">
            {clientTime?.time || <Skeleton className="h-16 w-32 bg-slate-200 dark:bg-white/10" />}
          </div>
        </div>

        {/* Time Selector for Reference Card */}
        {isReference && children}
      </div>
    </div>
  );
}