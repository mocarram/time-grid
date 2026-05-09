"use client";

import {
  WORKSPACE_COLOR_PALETTE,
  type WorkspaceColor,
  type WorkspaceIcon,
} from "@config/index";
import type { Workspace } from "@schemas/workspace";
import { ChevronDown, Plus, Settings } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { getWorkspaceIcon } from "./icon-registry";
import { ManageWorkspacesDialog } from "./manage-workspaces-dialog";

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelect: (id: string) => void;
  onCreate: (input: {
    name: string;
    description?: string;
    color: WorkspaceColor;
    icon: WorkspaceIcon;
  }) => string | null;
  onUpdate: (id: string, updates: Partial<Workspace>) => void;
  onDelete: (id: string) => void;
}

export function WorkspaceSelector({
  workspaces,
  activeWorkspace,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: WorkspaceSelectorProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  if (!activeWorkspace) return null;

  const palette = WORKSPACE_COLOR_PALETTE[activeWorkspace.color];
  const Icon = getWorkspaceIcon(activeWorkspace.icon);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="glass-button group h-12 w-full justify-start gap-3 px-4 sm:w-auto sm:min-w-[200px]"
            aria-label={`Switch workspace, currently ${activeWorkspace.name}`}
          >
            <div className={`rounded-lg p-2 ${palette.bg} ${palette.border} border`}>
              <Icon className={`h-4 w-4 ${palette.text}`} aria-hidden="true" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-white">{activeWorkspace.name}</div>
              <div className="text-xs text-slate-400">
                {activeWorkspace.timezones.length} timezone
                {activeWorkspace.timezones.length === 1 ? "" : "s"}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="glass-card w-full border-white/10 text-white sm:w-64"
          align="start"
        >
          <DropdownMenuLabel className="font-medium text-slate-300">
            Switch Workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          {workspaces.map((ws) => {
            const p = WORKSPACE_COLOR_PALETTE[ws.color];
            const I = getWorkspaceIcon(ws.icon);
            const active = ws.id === activeWorkspace.id;
            return (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => onSelect(ws.id)}
                className={`flex cursor-pointer items-center gap-3 p-3 ${
                  active ? "bg-white/5" : ""
                }`}
              >
                <div className={`rounded-lg p-2 ${p.bg} ${p.border} border`}>
                  <I className={`h-4 w-4 ${p.text}`} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${active ? "text-blue-300" : "text-white"}`}>
                    {ws.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {ws.timezones.length} timezone{ws.timezones.length === 1 ? "" : "s"}
                  </div>
                </div>
                {active && (
                  <Badge
                    variant="secondary"
                    className="border-blue-400/30 bg-blue-500/20 text-blue-300"
                  >
                    Active
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="flex cursor-pointer items-center gap-3 p-3 text-green-300"
          >
            <div className="rounded-lg border border-green-400/30 bg-green-500/20 p-2">
              <Plus className="h-4 w-4 text-green-300" aria-hidden="true" />
            </div>
            <span className="font-medium">Create Workspace</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setManageOpen(true)}
            className="flex cursor-pointer items-center gap-3 p-3 text-slate-300"
          >
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <span className="font-medium">Manage Workspaces</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={onCreate} />
      <ManageWorkspacesDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace.id}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSetActive={onSelect}
      />
    </>
  );
}
