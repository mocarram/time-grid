"use client";

import {
  WORKSPACE_COLOR_PALETTE,
  WORKSPACE_COLOR_VALUES,
  type WorkspaceColor,
  type WorkspaceIcon,
} from "@config/index";
import type { Workspace } from "@schemas/workspace";
import { Check, Edit2, Settings, Star, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { getWorkspaceIcon, WORKSPACE_ICON_LIST } from "./icon-registry";

interface ManageWorkspacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onUpdate: (id: string, updates: Partial<Workspace>) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
}

export function ManageWorkspacesDialog({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  onUpdate,
  onDelete,
  onSetActive,
}: ManageWorkspacesDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{
    name: string;
    description: string;
    color: WorkspaceColor;
    icon: WorkspaceIcon;
  }>({ name: "", description: "", color: "blue", icon: "Users" });

  const startEditing = (ws: Workspace) => {
    setEditingId(ws.id);
    setEdit({
      name: ws.name,
      description: ws.description ?? "",
      color: ws.color,
      icon: ws.icon,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const save = () => {
    if (!editingId || !edit.name.trim()) return;
    onUpdate(editingId, {
      name: edit.name.trim(),
      description: edit.description.trim() || undefined,
      color: edit.color,
      icon: edit.icon,
    });
    cancelEditing();
  };

  const canDelete = workspaces.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card flex max-h-[80vh] flex-col overflow-hidden border-white/10 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-light">
            <Settings className="h-5 w-5 text-blue-400" aria-hidden="true" />
            Manage Workspaces
          </DialogTitle>
        </DialogHeader>
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto">
          {workspaces.map((ws) => {
            const palette = WORKSPACE_COLOR_PALETTE[ws.color];
            const Icon = getWorkspaceIcon(ws.icon);
            const isActive = ws.id === activeWorkspaceId;
            const isEditing = editingId === ws.id;
            return (
              <div
                key={ws.id}
                className={`glass rounded-xl border p-4 ${
                  isActive ? "bg-blue-500/5 ring-1 ring-blue-400/30" : ""
                }`}
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${ws.id}`}>Workspace Name</Label>
                      <Input
                        id={`name-${ws.id}`}
                        value={edit.name}
                        onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
                        className="glass-input text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`desc-${ws.id}`}>Description</Label>
                      <Textarea
                        id={`desc-${ws.id}`}
                        value={edit.description}
                        onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
                        className="glass-input resize-none text-white"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div role="radiogroup" className="grid grid-cols-4 gap-1">
                          {WORKSPACE_COLOR_VALUES.map((c) => {
                            const p = WORKSPACE_COLOR_PALETTE[c];
                            const selected = edit.color === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setEdit((s) => ({ ...s, color: c }))}
                                className={`rounded-lg border p-2 ${p.bg} ${p.border} ${
                                  selected ? "scale-105 ring-2 ring-white/30" : ""
                                }`}
                              >
                                {selected && <Check className={`h-3 w-3 ${p.text}`} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <div
                          role="radiogroup"
                          className="scrollbar-thin grid max-h-20 grid-cols-6 gap-1 overflow-y-auto"
                        >
                          {WORKSPACE_ICON_LIST.slice(0, 12).map((name) => {
                            const I = getWorkspaceIcon(name);
                            const selected = edit.icon === name;
                            const p = WORKSPACE_COLOR_PALETTE[edit.color];
                            return (
                              <button
                                key={name}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={name}
                                onClick={() => setEdit((s) => ({ ...s, icon: name }))}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                                  selected
                                    ? `${p.bg} ${p.border}`
                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                }`}
                              >
                                <I className={`h-3 w-3 ${selected ? p.text : "text-slate-400"}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={save}
                        disabled={!edit.name.trim()}
                        size="sm"
                        className="border-green-400/30 bg-green-500/20 text-green-300"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={cancelEditing}
                        variant="ghost"
                        size="sm"
                        className="glass-button"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${palette.bg} ${palette.border} border`}>
                        <Icon className={`h-4 w-4 ${palette.text}`} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{ws.name}</span>
                          {isActive && (
                            <Badge
                              variant="secondary"
                              className="border-blue-400/30 bg-blue-500/20 text-xs text-blue-300"
                            >
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          {ws.description || "No description"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {ws.timezones.length} timezone{ws.timezones.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <Button
                          onClick={() => onSetActive(ws.id)}
                          variant="ghost"
                          size="sm"
                          className="glass-button h-8 w-8 p-0"
                          title="Set as active workspace"
                          aria-label={`Set ${ws.name} as active`}
                        >
                          <Star className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        onClick={() => startEditing(ws)}
                        variant="ghost"
                        size="sm"
                        className="glass-button h-8 w-8 p-0"
                        title="Edit workspace"
                        aria-label={`Edit ${ws.name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      </Button>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="glass-button h-8 w-8 p-0"
                              title="Delete workspace"
                              aria-label={`Delete ${ws.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-card border-white/10 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-300">
                                Delete &quot;<strong>{ws.name}</strong>&quot;? This cannot be undone.
                                {ws.timezones.length > 0 && (
                                  <span className="mt-2 block text-yellow-400">
                                    {ws.timezones.length} timezone
                                    {ws.timezones.length === 1 ? "" : "s"} will be lost.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="glass-button border-white/20 text-slate-300 hover:bg-white/10">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(ws.id)}
                                className="border-red-400/30 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
