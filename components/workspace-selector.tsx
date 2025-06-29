"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { ManageWorkspacesDialog } from "./manage-workspaces-dialog";
import { getWorkspaceColor } from "@/lib/workspace-utils";
import { ChevronDown, Plus, Settings, Users } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { Workspace } from "@/types/workspace";

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onWorkspaceChange: (workspaceId: string) => void;
  onCreateWorkspace: (
    workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">
  ) => string;
  onUpdateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace: (id: string) => void;
}

export function WorkspaceSelector({
  workspaces,
  activeWorkspace,
  onWorkspaceChange,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
}: WorkspaceSelectorProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const handleCreateWorkspace = (
    workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">
  ) => {
    return onCreateWorkspace(workspace);
  };

  const handleWorkspaceCreated = (workspaceId: string) => {
    // Automatically switch to the newly created workspace
    onWorkspaceChange(workspaceId);
    setCreateDialogOpen(false);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? IconComponent : Users;
  };

  if (!activeWorkspace) {
    return null;
  }

  const activeColor = getWorkspaceColor(activeWorkspace.color);
  const ActiveIcon = getIcon(activeWorkspace.icon);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='glass-button group h-12 w-full justify-start gap-3 px-4 transition-all duration-300 hover:border-white/20 hover:bg-white/10 sm:w-auto sm:min-w-[200px]'
          >
            <div
              className={`rounded-lg p-2 ${activeColor.bg} ${activeColor.border} border`}
            >
              <ActiveIcon className={`h-4 w-4 ${activeColor.text}`} />
            </div>
            <div className='flex-1 text-left'>
              <div className='font-medium text-white transition-colors group-hover:text-blue-300'>
                {activeWorkspace.name}
              </div>
              <div className='text-xs text-slate-400'>
                {activeWorkspace.timezones?.length || 0} timezone
                {(activeWorkspace.timezones?.length || 0) !== 1 ? "s" : ""}
              </div>
            </div>
            <ChevronDown className='h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-300' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='glass-card w-full border-white/10 text-white sm:w-64'
          align='start'
        >
          <DropdownMenuLabel className='font-medium text-slate-300'>
            Switch Workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator className='bg-white/10' />

          {workspaces.map(workspace => {
            const color = getWorkspaceColor(workspace.color);
            const Icon = getIcon(workspace.icon);
            const isActive = workspace.id === activeWorkspace.id;

            return (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => onWorkspaceChange(workspace.id)}
                className={`flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-white/10 ${
                  isActive ? "bg-white/5" : ""
                }`}
              >
                <div
                  className={`rounded-lg p-2 ${color.bg} ${color.border} border`}
                >
                  <Icon className={`h-4 w-4 ${color.text}`} />
                </div>
                <div className='flex-1'>
                  <div
                    className={`font-medium ${isActive ? "text-blue-300" : "text-white"}`}
                  >
                    {workspace.name}
                  </div>
                  <div className='text-xs text-slate-400'>
                    {workspace.timezones?.length || 0} timezone
                    {(workspace.timezones?.length || 0) !== 1 ? "s" : ""}
                  </div>
                </div>
                {isActive && (
                  <Badge
                    variant='secondary'
                    className='border-blue-400/30 bg-blue-500/20 text-blue-300'
                  >
                    Active
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className='bg-white/10' />

          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className='flex cursor-pointer items-center gap-3 p-3 text-green-300 transition-colors hover:bg-white/10 hover:text-green-200'
          >
            <div className='rounded-lg border border-green-400/30 bg-green-500/20 p-2'>
              <Plus className='h-4 w-4 text-green-300' />
            </div>
            <span className='font-medium'>Create Workspace</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setManageDialogOpen(true)}
            className='flex cursor-pointer items-center gap-3 p-3 text-slate-300 transition-colors hover:bg-white/10 hover:text-white'
          >
            <div className='rounded-lg border border-white/10 bg-white/5 p-2'>
              <Settings className='h-4 w-4 text-slate-400' />
            </div>
            <span className='font-medium'>Manage Workspaces</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateWorkspace={handleCreateWorkspace}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      <ManageWorkspacesDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace.id}
        onUpdateWorkspace={onUpdateWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
        onSetActiveWorkspace={onWorkspaceChange}
      />
    </>
  );
}
