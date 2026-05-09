"use client";

import type { AuthSyncState } from "@app/hooks/use-auth-sync";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import {
  Cloud,
  Download,
  Loader2,
  LogOut,
  Save,
  User,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatRelativeTime } from "./relative-time";

interface AuthButtonProps {
  authSync: AuthSyncState;
}

export function AuthButton({ authSync }: AuthButtonProps) {
  const {
    isAuthenticated,
    isAuthLoading,
    user,
    isSaving,
    isLoading,
    syncError,
    hasServerData,
    lastSyncedAt,
    saveNow,
    loadFromServer,
  } = authSync;

  if (isAuthLoading) {
    return (
      <Button
        variant="ghost"
        disabled
        className="glass-button h-12 gap-3 px-4"
        aria-label="Loading authentication"
      >
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-400">Loading…</span>
      </Button>
    );
  }

  if (isAuthenticated && user) {
    const userName = user.given_name || user.email?.split("@")[0] || "User";
    const display = userName.length > 8 ? `${userName.slice(0, 8)}…` : userName;
    const sync = formatRelativeTime(lastSyncedAt) ?? "Never synced";
    const syncDisplay = sync.length > 16 ? `${sync.slice(0, 16)}…` : sync;
    const busy = isSaving || isLoading;
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="glass-button flex h-12 min-w-0 items-center gap-3 px-4">
          <div className="flex-shrink-0 rounded-lg border border-green-500/30 bg-green-500/20 p-2">
            <UserCheck className="h-4 w-4 text-green-400" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="truncate text-sm font-medium text-white">{display}</div>
            <div
              role="status"
              aria-live="polite"
              className="truncate text-xs text-slate-400"
            >
              {syncError ? `Error: ${syncError}` : syncDisplay}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={saveNow}
            disabled={busy}
            className="glass-button h-12 gap-2 px-3 hover:border-blue-400/30 hover:bg-blue-500/20"
            title="Save to cloud"
            aria-label="Save to cloud"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4 text-blue-400" aria-hidden="true" />
            )}
            <span className="hidden text-sm font-medium text-white sm:inline">Save</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadFromServer}
            disabled={busy}
            className="glass-button h-12 gap-2 px-3 hover:border-green-400/30 hover:bg-green-500/20"
            title={hasServerData ? "Load saved data from cloud" : "No saved data in cloud"}
            aria-label="Load from cloud"
          >
            {hasServerData && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-gray-900 bg-green-700" />
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
            ) : (
              <Download
                className={`h-4 w-4 ${hasServerData ? "text-green-400" : "text-amber-400"}`}
                aria-hidden="true"
              />
            )}
            <span className="hidden text-sm font-medium text-white sm:inline">Load</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="glass-button h-12 w-12 p-0 hover:border-red-400/30 hover:bg-red-500/20"
            title="Sign out"
          >
            <LogoutLink>
              <LogOut className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </LogoutLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LoginLink className="glass-button group flex h-12 items-center gap-3 px-4 hover:border-blue-400/30 hover:bg-blue-500/20">
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/20 p-2">
        <User className="h-4 w-4 text-blue-400" aria-hidden="true" />
      </div>
      <div className="flex flex-col text-left">
        <div className="text-sm font-medium text-white">Sign In</div>
        <div className="text-xs text-slate-400">Sync across devices</div>
      </div>
      <Cloud className="ml-2 h-4 w-4 text-slate-400" aria-hidden="true" />
    </LoginLink>
  );
}
