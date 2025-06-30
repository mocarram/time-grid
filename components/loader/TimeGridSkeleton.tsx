// Create a skeleton loader for the TimeGrid component
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

import { Clock, MapPin } from "lucide-react";
const TimeGridSkeleton = () => {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="container mx-auto max-w-5xl flex-1 px-6 py-12">
          {/* Header */}
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 flex items-center justify-center gap-4">
              <div className="glass rounded-xl p-3">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div className="relative">
                <h1 className="text-glow text-5xl font-thin tracking-tight text-white">
                  TimeGrid
                </h1>
                <div className="absolute -right-12 -top-1 rounded-full border border-slate-600/40 bg-slate-700/20 px-2 py-1 text-[10px] font-medium text-slate-400">
                  BETA
                </div>
              </div>
            </div>
            <p className="text-base font-light text-slate-400">
              Synchronize time across the globe
            </p>
          </div>

          {/* Workspace Selector and Auth Skeleton */}
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:flex-1">
                <Skeleton className="h-12 w-full max-w-md rounded-lg bg-white/10" />
              </div>
              <div className="lg:flex-shrink-0">
                <Skeleton className="h-12 w-32 rounded-lg bg-white/10" />
              </div>
            </div>
          </div>

          {/* Skeleton Loading State */}
          <div className="space-y-8">
            {/* Reference Timezone Card Skeleton */}
            <div className="glass-card glow rounded-3xl p-8 ring-1 ring-blue-400/30">
              <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <Skeleton className="h-6 w-24 bg-white/10" />
                      </div>
                      <span className="rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                        Reference
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <Skeleton className="h-4 w-16 bg-white/10" />
                      <Skeleton className="h-4 w-12 bg-white/10" />
                      <span>•</span>
                      <Skeleton className="h-4 w-16 bg-white/10" />
                      <Skeleton className="h-3 w-12 bg-white/10" />
                    </div>
                  </div>
                </div>

                {/* Time Display Skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-16 w-32 bg-white/10" />
                </div>

                {/* Time Selector Skeleton */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-slate-300">
                        Reference Time
                      </span>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-lg bg-white/10" />
                  </div>

                  <div className="space-y-3">
                    <div className="px-1">
                      <Skeleton className="h-6 w-full rounded-full bg-white/10" />
                    </div>
                    <div className="flex justify-between px-1 text-xs text-slate-500">
                      <span>12:00 AM</span>
                      <span>12:00 PM</span>
                      <span>11:59 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Timezone Cards Skeleton */}
            <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-6">
                  <div className="space-y-4">
                    {/* Header Skeleton */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <Skeleton className="h-5 w-20 bg-white/10" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <Skeleton className="h-4 w-16 bg-white/10" />
                          <Skeleton className="h-4 w-12 bg-white/10" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
                        <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
                        <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
                      </div>
                    </div>

                    {/* Time Display Skeleton */}
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-28 bg-white/10" />
                    </div>

                    {/* Badge Skeleton */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Skeleton className="h-5 w-12 rounded-full bg-white/10" />
                      <Skeleton className="h-5 w-16 rounded-full bg-white/10" />
                      <Skeleton className="h-5 w-14 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeGridSkeleton;
