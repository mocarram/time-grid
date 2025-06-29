"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  timeToMinutes,
  minutesToTime,
  formatTime,
  formatDate,
} from "@/lib/timezone-utils";
import { Clock, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";

const DynamicSkeleton = dynamic(
  () =>
    import("@/components/ui/skeleton").then(mod => ({ default: mod.Skeleton })),
  {
    ssr: false,
  }
);

interface TimeSelectorProps {
  selectedTime: Date;
  onTimeChange: (time: Date) => void;
  className?: string;
}

export function TimeSelector({
  selectedTime,
  onTimeChange,
  className,
}: TimeSelectorProps) {
  const [minutes, setMinutes] = useState<number[]>([
    timeToMinutes(selectedTime),
  ]);
  const [clientTimeString, setClientTimeString] = useState<string | null>(null);
  const [clientDateString, setClientDateString] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setMinutes([timeToMinutes(selectedTime)]);
    setClientTimeString(formatTime(selectedTime));
    setClientDateString(formatDate(selectedTime));
  }, [selectedTime]);

  const handleSliderChange = (newMinutes: number[]) => {
    setMinutes(newMinutes);
    const newTime = minutesToTime(newMinutes[0], selectedTime);
    onTimeChange(newTime);
  };

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      // Preserve the current time when changing date
      const updatedDateTime = new Date(newDate);
      updatedDateTime.setHours(selectedTime.getHours());
      updatedDateTime.setMinutes(selectedTime.getMinutes());
      updatedDateTime.setSeconds(selectedTime.getSeconds());
      updatedDateTime.setMilliseconds(selectedTime.getMilliseconds());

      onTimeChange(updatedDateTime);
      setIsCalendarOpen(false);
    }
  };
  return (
    <div className={`space-y-4 ${className}`}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Clock className='h-4 w-4 text-blue-400' />
          <span className='text-sm font-medium text-slate-300'>Set Time</span>
        </div>
        <div className='flex items-center gap-2'>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='glass-button group h-7 px-3 text-xs font-medium transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-500/20'
                title='Change date'
              >
                <CalendarIcon className='mr-1.5 h-3 w-3 text-blue-400 group-hover:text-blue-300' />
                <span className='text-blue-300 group-hover:text-white'>
                  {clientDateString || (
                    <DynamicSkeleton className='h-3 w-16 bg-white/10' />
                  )}
                </span>
                <ChevronDown className='ml-1.5 h-3 w-3 text-blue-400 group-hover:text-blue-300' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className='glass-card w-auto border-white/10 p-0'
              align='end'
            >
              <Calendar
                mode='single'
                selected={selectedTime}
                onSelect={handleDateChange}
                initialFocus
                className='text-white'
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className='space-y-3'>
        <div className='px-1'>
          <Slider
            value={minutes}
            onValueChange={handleSliderChange}
            max={1439}
            min={0}
            step={15}
            className='w-full [&_[role=slider]]:border-blue-400 [&_[role=slider]]:bg-blue-500 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-blue-500/25'
          />
        </div>
        <div className='flex justify-between px-1 text-xs text-slate-500'>
          <span>12:00 AM</span>
          <span>12:00 PM</span>
          <span>11:59 PM</span>
        </div>
      </div>
    </div>
  );
}
