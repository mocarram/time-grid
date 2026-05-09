import { Loader2 } from "lucide-react";

export function TimeGridSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" aria-hidden="true" />
          <p className="text-slate-400">Loading TimeGrid…</p>
        </div>
      </div>
    </div>
  );
}
