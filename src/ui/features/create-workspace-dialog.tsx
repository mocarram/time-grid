"use client";

import {
  WORKSPACE_COLOR_PALETTE,
  WORKSPACE_COLOR_VALUES,
  type WorkspaceColor,
  type WorkspaceIcon,
} from "@config/index";
import { WorkspaceCreateInputSchema } from "@schemas/workspace";
import { Check, Plus } from "lucide-react";
import { useState } from "react";

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

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    name: string;
    description?: string;
    color: WorkspaceColor;
    icon: WorkspaceIcon;
  }) => string | null;
}

export function CreateWorkspaceDialog({ open, onOpenChange, onCreate }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<WorkspaceColor>("blue");
  const [icon, setIcon] = useState<WorkspaceIcon>("Users");
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = WorkspaceCreateInputSchema.safeParse({
      name,
      description: description || undefined,
      color,
      icon,
    });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);
    const id = onCreate(parsed.data);
    if (id) {
      setName("");
      setDescription("");
      setColor("blue");
      setIcon("Users");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-light">
            <Plus className="h-5 w-5 text-green-400" aria-hidden="true" />
            Create Workspace
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-sm font-medium text-slate-300">
              Workspace Name
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Travel, Family"
              required
              aria-invalid={errors.length > 0}
              aria-describedby={errors.length > 0 ? "workspace-errors" : undefined}
              className="glass-input text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-description" className="text-sm font-medium text-slate-300">
              Description (Optional)
            </Label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="glass-input resize-none text-white placeholder:text-slate-500"
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <IconPicker color={color} value={icon} onChange={setIcon} />
          {errors.length > 0 && (
            <ul id="workspace-errors" role="alert" className="text-sm text-red-300">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="glass-button flex-1 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 border-green-400/30 bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-50"
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: WorkspaceColor;
  onChange: (next: WorkspaceColor) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-slate-300">Color Theme</Label>
      <div role="radiogroup" aria-label="Color theme" className="grid grid-cols-4 gap-2">
        {WORKSPACE_COLOR_VALUES.map((c) => {
          const palette = WORKSPACE_COLOR_PALETTE[c];
          const selected = value === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(c)}
              className={`rounded-lg border p-3 transition-all duration-200 ${palette.bg} ${palette.border} ${
                selected ? "scale-105 ring-2 ring-white/30" : "hover:scale-105"
              }`}
            >
              <div className="flex items-center justify-center">
                {selected && <Check className={`h-4 w-4 ${palette.text}`} aria-hidden="true" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IconPicker({
  color,
  value,
  onChange,
}: {
  color: WorkspaceColor;
  value: WorkspaceIcon;
  onChange: (next: WorkspaceIcon) => void;
}) {
  const palette = WORKSPACE_COLOR_PALETTE[color];
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-slate-300">Icon</Label>
      <div
        role="radiogroup"
        aria-label="Icon"
        className="scrollbar-thin grid max-h-32 grid-cols-8 gap-2 overflow-y-auto p-2"
      >
        {WORKSPACE_ICON_LIST.map((name) => {
          const Icon = getWorkspaceIcon(name);
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name}
              onClick={() => onChange(name)}
              className={`flex items-center justify-center rounded-lg border p-2 transition-all duration-200 ${
                selected
                  ? `${palette.bg} ${palette.border} ring-2 ring-white/30`
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${selected ? palette.text : "text-slate-400"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
