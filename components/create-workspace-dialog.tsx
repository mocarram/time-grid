'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WORKSPACE_COLORS, WORKSPACE_ICONS } from '@/lib/workspace-utils';
import { Plus, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { Workspace } from '@/types/workspace';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onWorkspaceCreated?: (workspaceId: string) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreateWorkspace,
  onWorkspaceCreated,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedIcon, setSelectedIcon] = useState('Users');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    const newWorkspace = {
      name: name.trim(),
      description: description.trim() || undefined,
      color: selectedColor,
      icon: selectedIcon,
      timezones: [],
    };
    
    const workspaceId = onCreateWorkspace(newWorkspace);
    
    // Notify parent that workspace was created so it can be selected
    if (onWorkspaceCreated && workspaceId) {
      onWorkspaceCreated(workspaceId);
    }
    
    // Reset form
    setName('');
    setDescription('');
    setSelectedColor('blue');
    setSelectedIcon('Users');
    
    // Close dialog
    onOpenChange(false);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.Users;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-light flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-400" />
            Create Workspace
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-slate-300">
              Workspace Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Company Team, Family, Travel"
              className="glass-input text-white placeholder:text-slate-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-300">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this workspace..."
              className="glass-input text-white placeholder:text-slate-500 resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-300">
              Color Theme
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {WORKSPACE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`p-3 rounded-lg border transition-all duration-200 ${color.bg} ${color.border} ${
                    selectedColor === color.value 
                      ? 'ring-2 ring-white/30 scale-105' 
                      : 'hover:scale-105'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {selectedColor === color.value && (
                      <Check className={`h-4 w-4 ${color.text}`} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-300">
              Icon
            </Label>
            <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto scrollbar-thin">
              {WORKSPACE_ICONS.map((iconName) => {
                const Icon = getIcon(iconName);
                const color = WORKSPACE_COLORS.find(c => c.value === selectedColor)!;
                
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={`p-2 rounded-lg border transition-all duration-200 ${
                      selectedIcon === iconName 
                        ? `${color.bg} ${color.border} ring-2 ring-white/30` 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${
                      selectedIcon === iconName ? color.text : 'text-slate-400'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 glass-button hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-green-500/20 border-green-400/30 text-green-300 hover:bg-green-500/30 hover:border-green-400/50 hover:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}