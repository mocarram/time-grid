'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Slider } from '@/components/ui/slider';
import { timeToMinutes, minutesToTime, formatTime } from '@/lib/timezone-utils';
import { Clock } from 'lucide-react';

const DynamicSkeleton = dynamic(() => import('@/components/ui/skeleton').then(mod => ({ default: mod.Skeleton })), {
  ssr: false
});

interface TimeSelectorProps {
  selectedTime: Date;
  onTimeChange: (time: Date) => void;
  className?: string;
}

export function TimeSelector({ selectedTime, onTimeChange, className }: TimeSelectorProps) {
  const [minutes, setMinutes] = useState<number[]>([timeToMinutes(selectedTime)]);
  const [clientTimeString, setClientTimeString] = useState<string | null>(null);

  useEffect(() => {
    setMinutes([timeToMinutes(selectedTime)]);
    setClientTimeString(formatTime(selectedTime));
  }, [selectedTime]);

  const handleSliderChange = (newMinutes: number[]) => {
    setMinutes(newMinutes);
    const newTime = minutesToTime(newMinutes[0], selectedTime);
    onTimeChange(newTime);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-300">Reference Time</span>
        </div>
        <span className="text-sm font-mono glass px-3 py-1 rounded-lg text-blue-300">
          {clientTimeString || <DynamicSkeleton className="h-4 w-12 bg-white/10" />}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="px-1">
          <Slider
            value={minutes}
            onValueChange={handleSliderChange}
            max={1439}
            min={0}
            step={15}
            className="w-full [&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-400 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-blue-500/25"
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 px-1">
          <span>12:00 AM</span>
          <span>12:00 PM</span>
          <span>11:59 PM</span>
        </div>
      </div>
    </div>
  );
}