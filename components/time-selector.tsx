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
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-medium text-slate-300">Reference Time</span>
        </div>
        <span className="text-xs font-mono glass px-2 py-1 rounded text-blue-300">
          {clientTimeString || <DynamicSkeleton className="h-3 w-10 bg-white/10" />}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="px-1">
          <Slider
            value={minutes}
            onValueChange={handleSliderChange}
            max={1439}
            min={0}
            step={15}
            className="w-full [&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-400 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-blue-500/25 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 px-1">
          <span>12 AM</span>
          <span>12 PM</span>
          <span>12 AM</span>
        </div>
      </div>
    </div>
  );
}