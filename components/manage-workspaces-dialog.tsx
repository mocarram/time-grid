"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  WORKSPACE_COLORS,
  WORKSPACE_ICONS,
  getWorkspaceColor,
} from "@/lib/workspace-utils";
import { Settings, Edit2, Trash2, Check, Star } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { Workspace } from "@/types/workspace";

interface ManageWorkspacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onUpdateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace: (id: string) => void;
  onSetActiveWorkspace: (id: string) => void;
}

export function ManageWorkspacesDialog({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onSetActiveWorkspace,
}: ManageWorkspacesDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    color: "",
    icon: "",
  });

  const startEditing = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditForm({
      name: workspace.name,
      description: workspace.description || "",
      color: workspace.color,
      icon: workspace.icon,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ name: "", description: "", color: "", icon: "" });
  };

  const saveEditing = () => {
    if (!editingId || !editForm.name.trim()) return;

    onUpdateWorkspace(editingId, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
      color: editForm.color,
      icon: editForm.icon,
    });

    cancelEditing();
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.Users;
  };

  const canDelete = workspaces.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='glass-card flex max-h-[80vh] flex-col overflow-hidden border-white/10 text-white sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl font-light'>
            <Settings className='h-5 w-5 text-blue-400' />
            Manage Workspaces
          </DialogTitle>
        </DialogHeader>

        <div className='scrollbar-thin flex-1 space-y-4 overflow-y-auto'>
          {workspaces.map(workspace => {
            const color = getWorkspaceColor(workspace.color);
            const Icon = getIcon(workspace.icon);
            const isActive = workspace.id === activeWorkspaceId;
            const isEditing = editingId === workspace.id;

            return (
              <div
                key={workspace.id}
                className={`glass rounded-xl border p-4 transition-all duration-300 ${
                  isActive ? "bg-blue-500/5 ring-1 ring-blue-400/30" : ""
                }`}
              >
                {isEditing ? (
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <Label className='text-sm font-medium text-slate-300'>
                        Workspace Name
                      </Label>
                      <Input
                        value={editForm.name}
                        onChange={e =>
                          setEditForm(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className='glass-input text-white'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-sm font-medium text-slate-300'>
                        Description
                      </Label>
                      <Textarea
                        value={editForm.description}
                        onChange={e =>
                          setEditForm(prev => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className='glass-input resize-none text-white'
                        rows={2}
                      />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <Label className='text-sm font-medium text-slate-300'>
                          Color
                        </Label>
                        <div className='grid grid-cols-4 gap-1'>
                          {WORKSPACE_COLORS.map(colorOption => (
                            <button
                              key={colorOption.value}
                              type='button'
                              onClick={() =>
                                setEditForm(prev => ({
                                  ...prev,
                                  color: colorOption.value,
                                }))
                              }
                              className={`rounded-lg border p-2 transition-all duration-200 ${
                                colorOption.bg
                              } ${colorOption.border} ${
                                editForm.color === colorOption.value
                                  ? "scale-105 ring-2 ring-white/30"
                                  : "hover:scale-105"
                              }`}
                            >
                              {editForm.color === colorOption.value && (
                                <Check
                                  className={`h-3 w-3 ${colorOption.text}`}
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <Label className='text-sm font-medium text-slate-300'>
                          Icon
                        </Label>
                        <div className='scrollbar-thin grid max-h-20 grid-cols-6 gap-1 overflow-y-auto'>
                          {WORKSPACE_ICONS.slice(0, 12).map(iconName => {
                            const IconComp = getIcon(iconName);
                            const selectedColor = WORKSPACE_COLORS.find(
                              c => c.value === editForm.color
                            )!;

                            return (
                              <button
                                key={iconName}
                                type='button'
                                onClick={() =>
                                  setEditForm(prev => ({
                                    ...prev,
                                    icon: iconName,
                                  }))
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${
                                  editForm.icon === iconName
                                    ? `${selectedColor.bg} ${selectedColor.border}`
                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                }`}
                              >
                                <IconComp
                                  className={`h-3 w-3 ${
                                    editForm.icon === iconName
                                      ? selectedColor.text
                                      : "text-slate-400"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 pt-2'>
                      <Button
                        onClick={saveEditing}
                        disabled={!editForm.name.trim()}
                        size='sm'
                        className='border-green-400/30 bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      >
                        Save
                      </Button>
                      <Button
                        onClick={cancelEditing}
                        variant='ghost'
                        size='sm'
                        className='glass-button hover:bg-white/10'
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`rounded-lg p-2 ${color.bg} ${color.border} border`}
                      >
                        <Icon className={`h-4 w-4 ${color.text}`} />
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-white'>
                            {workspace.name}
                          </span>
                          {isActive && (
                            <Badge
                              variant='secondary'
                              className='border-blue-400/30 bg-blue-500/20 text-xs text-blue-300'
                            >
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className='text-sm text-slate-400'>
                          {workspace.description || "No description"}
                        </div>
                        <div className='mt-1 text-xs text-slate-500'>
                          {workspace.timezones?.length || 0} timezone
                          {(workspace.timezones?.length || 0) !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      {!isActive && (
                        <Button
                          onClick={() => onSetActiveWorkspace(workspace.id)}
                          variant='ghost'
                          size='sm'
                          className='glass-button h-8 w-8 p-0 hover:border-blue-400/30 hover:bg-blue-500/20'
                          title='Set as active workspace'
                        >
                          <Star className='h-3.5 w-3.5 text-slate-400 hover:text-blue-300' />
                        </Button>
                      )}

                      <Button
                        onClick={() => startEditing(workspace)}
                        variant='ghost'
                        size='sm'
                        className='glass-button h-8 w-8 p-0 hover:border-white/30 hover:bg-white/20'
                        title='Edit workspace'
                      >
                        <Edit2 className='h-3.5 w-3.5 text-slate-400 hover:text-white' />
                      </Button>

                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='glass-button h-8 w-8 p-0 hover:border-red-400/30 hover:bg-red-500/20'
                              title='Delete workspace'
                            >
                              <Trash2 className='h-3.5 w-3.5 text-slate-400 hover:text-red-300' />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className='glass-card border-white/10 text-white'>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Workspace
                              </AlertDialogTitle>
                              <AlertDialogDescription className='text-slate-300'>
                                Are you sure you want to delete &quot;
                                <strong>{workspace.name}</strong>&quot;? This
                                action cannot be undone.
                                {(workspace.timezones?.length || 0) > 0 && (
                                  <span className='mt-2 block text-yellow-400'>
                                    This workspace contains{" "}
                                    {workspace.timezones?.length || 0} timezone
                                    {(workspace.timezones?.length || 0) !== 1
                                      ? "s"
                                      : ""}{" "}
                                    that will be lost.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className='glass-button border-white/20 text-slate-300 hover:bg-white/10'>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteWorkspace(workspace.id)}
                                className='border-red-400/30 bg-red-500/20 text-red-300 hover:bg-red-500/30'
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
