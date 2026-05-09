"use client";

import { zoneDisplay } from "@domain/timezone/abbreviation";
import { formatCardLabels } from "@domain/timezone/format";
import { formatOffsetGmt } from "@domain/timezone/offset";
import type { TimezoneData } from "@schemas/timezone";
import { Clock, GripVertical, Home, MapPin, X } from "lucide-react";
import type { ReactNode } from "react";

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
import { Button } from "@/components/ui/button";

interface TimezoneCardProps {
  timezone: TimezoneData;
  /** UTC instant to display. Component derives wall-clock in the zone. */
  instantUtc: string;
  isReference?: boolean;
  isDragging?: boolean;
  onRemove?: () => void;
  onSetAsReference?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: Record<string, any>;
  children?: ReactNode;
}

export function TimezoneCard({
  timezone,
  instantUtc,
  isReference = false,
  isDragging = false,
  onRemove,
  onSetAsReference,
  dragHandleProps,
  children,
}: TimezoneCardProps) {
  const instant = new Date(instantUtc);
  const labels = formatCardLabels(instant, timezone.timezone);
  const display = zoneDisplay(timezone.timezone, instant);
  const offsetLabel = formatOffsetGmt(timezone.offsetMinutes);
  const isAbbreviation = timezone.kind === "abbreviation";

  const cityText = isReference
    ? timezone.city
    : timezone.city.length > 10
      ? `${timezone.city.slice(0, 10)}…`
      : timezone.city;

  return (
    <div
      role={isReference ? "region" : "listitem"}
      aria-label={`${timezone.city} ${labels.time}`}
      className={`glass-card group flex min-h-[200px] flex-col rounded-2xl p-6 transition-all duration-500 hover:bg-white/[0.04] ${
        isReference ? "glow ring-1 ring-blue-400/30" : ""
      } ${isAbbreviation ? "border-l-4 border-l-orange-400/50" : ""} ${
        isDragging ? "shadow-2xl shadow-blue-500/30 ring-2 ring-blue-400/50" : ""
      }`}
    >
      <div className="flex flex-1 flex-col space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isAbbreviation ? (
                <Clock className="h-4 w-4 text-orange-400" aria-hidden="true" />
              ) : (
                <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}
              <span
                className={`text-base font-medium text-white ${
                  isAbbreviation ? "font-mono text-orange-300" : ""
                }`}
                title={timezone.city}
              >
                {cityText}
              </span>
              {isAbbreviation && !isReference && (
                <span className="rounded-full border border-orange-400/30 bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300">
                  TZ
                </span>
              )}
            </div>
            {isReference && (
              <Badges country={timezone.country} display={display} offsetLabel={offsetLabel} labels={labels} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isReference && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/20 text-blue-300"
                aria-label="Reference timezone"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
            {!isReference && (onRemove || onSetAsReference) && (
              <>
                {dragHandleProps && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="glass-button h-8 w-8 cursor-grab touch-none select-none p-0 active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label={`Drag handle for ${timezone.city}`}
                    {...dragHandleProps}
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </Button>
                )}
                {onSetAsReference && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSetAsReference}
                    className="glass-button h-8 w-8 p-0"
                    title="Set as reference timezone"
                    aria-label={`Set ${timezone.city} as reference`}
                  >
                    <Home className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </Button>
                )}
                {onRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="glass-button h-8 w-8 p-0"
                        title="Remove timezone"
                        aria-label={`Remove ${timezone.city}`}
                      >
                        <X className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-white/10 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Timezone</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-300">
                          Remove <strong>{timezone.city}, {timezone.country}</strong>?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="glass-button border-white/20 text-slate-300 hover:bg-white/10">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onRemove}
                          className="border-red-400/30 bg-red-500/20 text-red-300 hover:bg-red-500/30"
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

        <div className="text-4xl font-thin tracking-tight text-white" aria-live="polite">
          {labels.time}
        </div>

        {!isReference && (
          <Badges country={timezone.country} display={display} offsetLabel={offsetLabel} labels={labels} />
        )}

        {isReference && children}
      </div>
    </div>
  );
}

function Badges({
  country,
  display,
  offsetLabel,
  labels,
}: {
  country: string;
  display: { abbreviation: string; description: string };
  offsetLabel: string;
  labels: { time: string; date: string; day: string };
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 backdrop-blur-sm">
        {country}
      </span>
      <span
        className="cursor-help rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-mono text-xs font-medium text-blue-400/70 backdrop-blur-sm"
        title={`${display.description} (${offsetLabel})`}
      >
        {display.abbreviation}
      </span>
      <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 backdrop-blur-sm">
        {labels.date}
      </span>
      <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400 backdrop-blur-sm">
        {labels.day}
      </span>
    </div>
  );
}
