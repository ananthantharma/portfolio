// Curated icon + color palette pages can pick from, so pages are visually
// distinguishable from one another in lists instead of all looking identical.

import type {LucideIcon} from 'lucide-react';
import {
  Activity,
  Archive,
  Award,
  Beaker,
  Book,
  Bookmark,
  Box,
  Briefcase,
  Calculator,
  Calendar,
  Camera,
  CheckCircle,
  Clipboard,
  Cloud,
  Code,
  Coffee,
  Compass,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Film,
  Flag,
  Folder,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Image,
  Key,
  Layers,
  Lightbulb,
  Link2,
  Mail,
  Map,
  MessageCircle,
  Mic,
  Music,
  Package,
  Palette,
  PenTool,
  Phone,
  PieChart,
  Plane,
  Rocket,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Target,
  Terminal,
  ThumbsUp,
  Trophy,
  Users,
  Utensils,
  Video,
  Wrench,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Book,
  Bookmark,
  Archive,
  Folder,
  Box,
  Briefcase,
  Calculator,
  Calendar,
  Camera,
  CheckCircle,
  Clipboard,
  Cloud,
  Code,
  Coffee,
  Compass,
  CreditCard,
  Database,
  DollarSign,
  Film,
  Flag,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Image,
  Key,
  Layers,
  Lightbulb,
  Link2,
  Mail,
  Map,
  MessageCircle,
  Mic,
  Music,
  Package,
  Palette,
  PenTool,
  Phone,
  PieChart,
  Plane,
  Rocket,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Target,
  Terminal,
  ThumbsUp,
  Trophy,
  Users,
  Utensils,
  Video,
  Wrench,
  Activity,
  Award,
  Beaker,
};

export const ICON_KEYS = Object.keys(ICON_MAP);

export function iconFor(name?: string | null): LucideIcon {
  return (name && ICON_MAP[name]) || FileText;
}

// A distinct, evenly-spaced hue set — deliberately avoids near-duplicate colors.
export const PAGE_COLORS = [
  '#8b5cf6', // violet (brand default)
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#fb923c', // orange
  '#34d399', // emerald
  '#facc15', // amber
  '#60a5fa', // blue
  '#f87171', // red
  '#a3e635', // lime
  '#c084fc', // purple
  '#fb7185', // rose
  '#2dd4bf', // teal
];

/** Deterministic fallback color from a page id, so unset pages still look distinct from each other. */
export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PAGE_COLORS[hash % PAGE_COLORS.length];
}
