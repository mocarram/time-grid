'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, MapPin } from 'lucide-react';
import { formatTime, formatDate, formatDay } from '@/lib/timezone-utils';
import type { TimezoneData } from '@/types/timezone';

interface TimezoneCardProps {
  timezone: TimezoneData;
  displayTime: Date;
  isReference?: boolean;
  onRemove?: () => void;
  children?: React.ReactNode;
}

export function TimezoneCard({ 
  timezone, 
  displayTime, 
  isReference = false, 
  onRemove, 
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
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-white font-medium text-lg">{timezone.city}</span>
              </div>
              {isReference && (
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-400/30">
                  Reference
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>{timezone.country}</span>
              <span className="px-2 py-1 bg-white/5 rounded-lg font-mono text-xs">
                {offsetString}
              </span>
            </div>
          </div>
          
          {!isReference && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-9 w-9 p-0 glass-button hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-300 transition-all duration-300"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Time Display */}
        <div className="space-y-2">
          <div className="text-5xl font-thin text-white tracking-tight">
            {clientTime?.time || <Skeleton className="h-16 w-32 bg-white/10" />}
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="text-lg font-light">
              {clientTime?.date || <Skeleton className="h-6 w-24 bg-white/10" />}
            </span>
            <span className="text-sm">
              {clientTime?.day || <Skeleton className="h-5 w-20 bg-white/10" />}
            </span>
          </div>
        </div>

        {/* Time Selector for Reference Card */}
        {isReference && children}
      </div>
    </div>
  );
}