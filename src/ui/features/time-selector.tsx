"use client";

import {
  changeDateInZone,
  minutesToInstantInZone,
  timeToMinutesInZone,
} from "@domain/time-state/travel";
import { formatDateInZone } from "@domain/timezone/format";
import { wallClockInZone } from "@domain/timezone/offset";
import { Calendar as CalendarIcon, ChevronDown, Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

interface TimeSelectorProps {
  /** UTC instant currently shown. */
  instantUtc: string;
  /** IANA zone the slider operates in. */
  zone: string;
  onChange: (instantUtc: string) => void;
}

export function TimeSelector({ instantUtc, zone, onChange }: TimeSelectorProps) {
  const [minutes, setMinutes] = useState<number[]>([timeToMinutesInZone(instantUtc, zone)]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    setMinutes([timeToMinutesInZone(instantUtc, zone)]);
  }, [instantUtc, zone]);

  const handleSlider = (next: number[]) => {
    const [m = minutes[0] ?? 0] = next;
    setMinutes([m]);
    onChange(minutesToInstantInZone(instantUtc, zone, m));
  };

  const handleDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(
      changeDateInZone(
        instantUtc,
        zone,
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      ),
    );
    setCalendarOpen(false);
  };

  const wc = wallClockInZone(new Date(instantUtc), zone);
  const dateLabel = formatDateInZone(new Date(instantUtc), zone);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-300">Set Time</span>
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="glass-button group h-7 px-3 text-xs font-medium hover:border-blue-400/30 hover:bg-blue-500/20"
              title="Change date"
              aria-label={`Date ${dateLabel}, click to change`}
            >
              <CalendarIcon className="mr-1.5 h-3 w-3 text-blue-400" aria-hidden="true" />
              <span className="text-blue-300">{dateLabel}</span>
              <ChevronDown className="ml-1.5 h-3 w-3 text-blue-400" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="glass-card w-auto border-white/10 p-0" align="end">
            <Calendar
              mode="single"
              selected={new Date(Date.UTC(wc.year, wc.month - 1, wc.day))}
              onSelect={handleDate}
              initialFocus
              className="text-white"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-3">
        <Slider
          value={minutes}
          onValueChange={handleSlider}
          max={1439}
          min={0}
          step={15}
          className="w-full [&_[role=slider]]:border-blue-400 [&_[role=slider]]:bg-blue-500"
          aria-label="Time of day"
        />
        <div className="flex justify-between px-1 text-xs text-slate-500">
          <span>12:00 AM</span>
          <span>12:00 PM</span>
          <span>11:59 PM</span>
        </div>
      </div>
    </div>
  );
}
