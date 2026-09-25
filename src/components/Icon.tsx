import {
  ClipboardList, Heart, Brain, Activity, Moon, Sun, CloudRain,
  Smile, Zap, Coffee, Dumbbell, Utensils, Type, AlignLeft,
  CircleDot, ListChecks, Hash, CheckSquare, Calendar, Plus,
  X, Check, ChevronRight, ChevronDown, ChevronUp, Trash2, Edit3,
  Settings, BarChart3, Download, Camera, Paperclip, FileText,
  ArrowLeft, MoreVertical, Image as ImageIcon, File, Save, Copy,
  Eye, EyeOff, GripVertical, TrendingUp, Clock, Tag, Filter,
  Inbox, LayoutDashboard, AlertCircle, Loader2, Search,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  ClipboardList, Heart, Brain, Activity, Moon, Sun, CloudRain,
  Smile, Zap, Coffee, Dumbbell, Utensils, Type, AlignLeft,
  CircleDot, ListChecks, Hash, CheckSquare, Calendar, Plus,
  X, Check, ChevronRight, ChevronDown, ChevronUp, Trash2, Edit3,
  Settings, BarChart3, Download, Camera, Paperclip, FileText,
  ArrowLeft, MoreVertical, Image: ImageIcon, File, Save, Copy,
  Eye, EyeOff, GripVertical, TrendingUp, Clock, Tag, Filter,
  Inbox, LayoutDashboard, AlertCircle, Loader2, Search,
};

export function Icon({
  name,
  size = 20,
  className = '',
  strokeWidth = 2,
}: {
  name: string;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}) {
  const Component = iconMap[name] ?? ClipboardList;
  return <Component size={size} className={className} strokeWidth={strokeWidth} />;
}
