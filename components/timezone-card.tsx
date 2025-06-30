"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/alert-dialog";
import { X, MapPin, Star, GripVertical, Home } from "lucide-react";
import { Clock } from "lucide-react";
import {
  formatTime,
  formatDate,
  formatDay,
  getTimezoneDisplayName,
} from "@/lib/timezone-utils";
import type { TimezoneData } from "@/types/timezone";

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
  children,
}: TimezoneCardProps) {
  const [clientTime, setClientTime] = useState<{
    time: string;
    date: string;
    day: string;
    timezoneInfo: {
      abbreviation: string;
      description: string;
    };
  } | null>(null);

  useEffect(() => {
    const timezoneInfo = getTimezoneDisplayName(timezone.timezone, displayTime);
    setClientTime({
      time: formatTime(displayTime),
      date: formatDate(displayTime),
      day: formatDay(displayTime),
      timezoneInfo,
    });
  }, [displayTime, timezone.timezone]);

  const offsetHours = Math.floor(Math.abs(timezone.offset) / 60);
  const offsetMinutes = Math.abs(timezone.offset) % 60;
  const offsetSign = timezone.offset >= 0 ? "+" : "-";
  const offsetString = `GMT${offsetSign}${offsetHours}${offsetMinutes > 0 ? ":" + offsetMinutes.toString().padStart(2, "0") : ""}`;

  return (
    <div
      className={`glass-card group flex min-h-[200px] flex-col rounded-2xl p-6 transition-all duration-500 hover:bg-white/[0.04] ${
        isReference ? "glow ring-1 ring-blue-400/30" : ""
      } ${timezone.isAbbreviation ? "border-l-4 border-l-orange-400/50" : ""} ${
        isDragging
          ? "glow bg-white/[0.08] shadow-2xl shadow-blue-500/30 ring-2 ring-blue-400/50 backdrop-blur-3xl"
          : ""
      }`}
    >
      <div className="flex flex-1 flex-col space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {timezone.isAbbreviation ? (
                  <Clock className="h-4 w-4 text-orange-400" />
                ) : (
                  <MapPin className="h-4 w-4 text-slate-400" />
                )}
                <span
                  className={`text-base font-medium transition-colors duration-300 ${
                    isDragging ? "text-blue-200" : "text-white"
                  } truncate ${timezone.isAbbreviation ? "font-mono text-orange-300" : ""}`}
                  title={timezone.city}
                >
                  {isReference
                    ? timezone.city
                    : timezone.city.length > 10
                      ? `${timezone.city.substring(0, 10)}...`
                      : timezone.city}
                </span>
                {timezone.isAbbreviation && !isReference && (
                  <span className="rounded-full border border-orange-400/30 bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300">
                    TZ
                  </span>
                )}
              </div>
            </div>
            {isReference && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium backdrop-blur-sm ${
                    timezone.isAbbreviation
                      ? "text-orange-400"
                      : "text-slate-400"
                  }`}
                >
                  {timezone.country}
                </span>
                {clientTime ? (
                  <span
                    className="cursor-help rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-mono text-xs font-medium text-blue-400/70 backdrop-blur-sm"
                    title={`${clientTime.timezoneInfo.description} (${offsetString})`}
                  >
                    {clientTime.timezoneInfo.abbreviation}
                  </span>
                ) : (
                  <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
                )}
                {clientTime ? (
                  <>
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 backdrop-blur-sm">
                      {clientTime.date}
                    </span>
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 backdrop-blur-sm">
                      {clientTime.day}
                    </span>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
                    <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reference Badge and Action Buttons */}
          <div className="flex items-center gap-2">
            {isReference && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/20 text-blue-300 transition-all duration-300 group-hover:bg-blue-500/30">
                <Home className="h-4 w-4" />
              </div>
            )}

            {!isReference && (onRemove || onSetAsReference) && (
              <>
                {dragHandleProps && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="glass-button h-8 w-8 cursor-grab touch-none select-none p-0 transition-all duration-300 hover:border-white/30 hover:bg-white/20 active:cursor-grabbing"
                    title="Drag to reorder"
                    {...dragHandleProps}
                    onMouseDown={e => e.preventDefault()}
                    onTouchStart={e => e.preventDefault()}
                  >
                    <GripVertical className="pointer-events-none h-3.5 w-3.5 select-none text-slate-400 group-hover:text-white" />
                  </Button>
                )}
                {onSetAsReference && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSetAsReference}
                    className="glass-button group h-8 w-8 p-0 transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-500/20"
                    title="Set as reference timezone"
                  >
                    <Home className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300" />
                  </Button>
                )}
                {onRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="glass-button group h-8 w-8 p-0 transition-all duration-300 hover:border-red-400/30 hover:bg-red-500/20"
                        title="Remove timezone"
                      >
                        <X className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-300" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-white/10 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                          Remove Timezone
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-300">
                          Are you sure you want to remove{" "}
                          <span className="font-medium text-white">
                            {timezone.city}, {timezone.country}
                          </span>{" "}
                          from your world clock?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="glass-button border-white/20 text-slate-300 hover:bg-white/10 hover:text-white">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onRemove}
                          className="border-red-400/30 bg-red-500/20 text-red-300 hover:border-red-400/50 hover:bg-red-500/30 hover:text-red-200"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </div>

        {/* Time Display */}
        <div>
          <div
            className={`text-4xl font-thin tracking-tight text-white transition-all duration-300 ${
              isDragging ? "text-blue-200" : ""
            }`}
          >
            {clientTime?.time || <Skeleton className="h-12 w-28 bg-white/10" />}
          </div>
        </div>

        {/* Timezone Info Badges for Non-Reference Cards */}
        {!isReference && (
          <div
            className={`flex flex-wrap items-center gap-1.5 transition-all duration-300 ${
              isDragging ? "opacity-80" : ""
            }`}
          >
            <span
              className={`rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium backdrop-blur-sm ${
                timezone.isAbbreviation ? "text-orange-400" : "text-slate-400"
              }`}
            >
              {timezone.country}
            </span>
            {clientTime ? (
              <span
                className="cursor-help rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-mono text-xs font-medium text-blue-400/70 backdrop-blur-sm"
                title={`${clientTime.timezoneInfo.description} (${offsetString})`}
              >
                {clientTime.timezoneInfo.abbreviation}
              </span>
            ) : (
              <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
            )}
            {clientTime ? (
              <>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 backdrop-blur-sm">
                  {clientTime.date}
                </span>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 backdrop-blur-sm">
                  {clientTime.day}
                </span>
              </>
            ) : (
              <>
                <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
                <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
              </>
            )}
          </div>
        )}

        {/* Time Selector for Reference Card */}
        {isReference && children}
      </div>
    </div>
  );
}
