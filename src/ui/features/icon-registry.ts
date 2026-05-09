// Type-safe Lucide icon registry for workspace icons. Avoids `(LucideIcons as any)`.

import { WORKSPACE_ICON_VALUES, type WorkspaceIcon } from "@config/index";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Coffee,
  Compass,
  Globe,
  Heart,
  Home,
  Laptop,
  MapPin,
  Plane,
  Star,
  Target,
  User,
  Users,
  Zap,
} from "lucide-react";

const REGISTRY: Record<WorkspaceIcon, LucideIcon> = {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Coffee,
  Compass,
  Globe,
  Heart,
  Home,
  Laptop,
  MapPin,
  Plane,
  Star,
  Target,
  User,
  Users,
  Zap,
};

export function getWorkspaceIcon(name: string): LucideIcon {
  if ((WORKSPACE_ICON_VALUES as readonly string[]).includes(name)) {
    return REGISTRY[name as WorkspaceIcon];
  }
  return Users;
}

export const WORKSPACE_ICON_LIST = WORKSPACE_ICON_VALUES;
