"use client";

import { Button } from "@/components/ui/button";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import {
  LogOut,
  User,
  UserCheck,
  Loader2,
  Cloud,
  Save,
  Download,
} from "lucide-react";

interface AuthButtonProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
  isSaving?: boolean;
  isLoadingData?: boolean;
  syncError?: string | null;
  onSaveToServer?: () => void;
  onLoadFromServer?: () => void;
  lastSyncDisplay?: string;
  hasServerData?: boolean;
}

export function AuthButton({
  onAuthChange,
  isSaving,
  isLoadingData,
  syncError,
  onSaveToServer,
  onLoadFromServer,
  lastSyncDisplay,
  hasServerData,
}: AuthButtonProps) {
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();

  const isAnySyncing = isSaving || isLoadingData;

  if (isLoading) {
    return (
      <Button
        variant='ghost'
        disabled
        className='glass-button h-12 gap-3 px-4 transition-all duration-300 hover:border-white/20 hover:bg-white/10'
      >
        <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
        <span className='text-sm font-medium text-slate-400'>Loading...</span>
      </Button>
    );
  }

  if (isAuthenticated && user) {
    const userName = user.given_name || user.email?.split("@")[0] || "User";
    const displayName =
      userName.length > 8 ? `${userName.slice(0, 8)}...` : userName;
    const syncStatus = lastSyncDisplay || "Never synced";
    const displaySyncStatus =
      syncStatus.length > 12 ? `${syncStatus.slice(0, 12)}...` : syncStatus;

    return (
      <div className='flex items-center justify-between gap-2'>
        <div className='glass-button flex h-12 min-w-0 items-center gap-3 px-4'>
          <div className='flex-shrink-0 rounded-lg border border-green-500/30 bg-green-500/20 p-2'>
            <UserCheck className='h-4 w-4 text-green-400' />
          </div>
          <div className='flex min-w-0 flex-1 flex-col'>
            <div className='truncate text-sm font-medium text-white'>
              {displayName}
            </div>
            <div className='truncate text-xs text-slate-400'>
              {displaySyncStatus}
            </div>
          </div>
        </div>

        <div className='flex gap-2'>
          {/* Save to Server Button */}
          <Button
            variant='ghost'
            size='sm'
            onClick={onSaveToServer}
            disabled={isAnySyncing}
            className='glass-button h-12 gap-2 px-3 transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-500/20'
            title='Save to cloud'
          >
            {isSaving ? (
              <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
            ) : (
              <Save className='h-4 w-4 text-blue-400' />
            )}
            <span className='hidden text-sm font-medium text-white sm:inline'>
              Save
            </span>
          </Button>

          {/* Load from Server Button */}
          <Button
            variant='ghost'
            size='sm'
            onClick={onLoadFromServer}
            disabled={isAnySyncing}
            className={`glass-button relative h-12 gap-2 px-3 transition-all duration-300 ${
              hasServerData
                ? "hover:border-green-400/30 hover:bg-green-500/20"
                : "hover:border-amber-400/30 hover:bg-amber-500/20"
            }`}
            title={
              hasServerData
                ? "Load saved data from cloud"
                : "No saved data in cloud"
            }
          >
            {/* Data indicator dot */}
            {hasServerData && (
              <div className='absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-gray-900 bg-green-500'></div>
            )}
            {isLoadingData ? (
              <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
            ) : (
              <Download
                className={`h-4 w-4 ${hasServerData ? "text-green-400" : "text-amber-400"}`}
              />
            )}
            <span className='hidden text-sm font-medium text-white sm:inline'>
              Load
            </span>
          </Button>

          {/* Logout Button */}
          <Button
            variant='ghost'
            size='sm'
            asChild
            className='glass-button h-12 w-12 p-0 transition-all duration-300 hover:border-red-400/30 hover:bg-red-500/20'
            title='Sign out'
          >
            <LogoutLink>
              <LogOut className='h-4 w-4 text-slate-400 group-hover:text-red-300' />
            </LogoutLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <LoginLink className='glass-button group flex h-12 items-center gap-3 px-4 transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-500/20'>
        <div className='rounded-lg border border-blue-500/30 bg-blue-500/20 p-2'>
          <User className='h-4 w-4 text-blue-400' />
        </div>
        <div className='flex flex-col text-left'>
          <div className='text-sm font-medium text-white transition-colors group-hover:text-blue-300'>
            Sign In
          </div>
          <div className='text-xs text-slate-400'>Sync across devices</div>
        </div>
      </LoginLink>
    </>
  );
}
