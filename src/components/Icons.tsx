import {
  AlertTriangle, ArrowLeftRight, ArrowRight, ArrowUpRight, Banknote, BookOpen, Briefcase, Building, Building2,
  CalendarCheck, CalendarClock, CalendarDays, Check, CheckSquare, ChevronDown, ChevronLeft,
  ChevronRight, Circle, ClipboardCheck, ClipboardList, Cog, Columns3, Copy, CreditCard, DoorOpen,
  Download, FileCheck, FileText, FolderKanban, Gauge, GraduationCap, HardHat, HeartPulse, History,
  Image, Landmark, LayoutDashboard, LayoutGrid, Link, List, MapPin, Megaphone, MessagesSquare, Mic,
  Moon, Smartphone, Lock, Package, PackageCheck, PenLine, PhoneCall, PiggyBank, Play, Plus, Presentation, Radio,
  Receipt, RefreshCw, Route, Search, Settings, ShieldAlert, Shuffle, Sparkles, Stethoscope, Store,
  Sun, Target, Ticket, TrendingUp, TrendingDown, Truck, UserRound, Users, Wand2, Wrench, X, Zap,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, ArrowLeftRight, ArrowRight, ArrowUpRight, Banknote, BookOpen, Briefcase, Building, Building2,
  CalendarCheck, CalendarClock, CalendarDays, Check, CheckSquare, ChevronDown, ChevronLeft,
  ChevronRight, Circle, ClipboardCheck, ClipboardList, Cog, Columns3, Copy, CreditCard, DoorOpen,
  Download, FileCheck, FileText, FolderKanban, Gauge, GraduationCap, HardHat, HeartPulse, History,
  Image, Landmark, LayoutDashboard, LayoutGrid, Link, List, MapPin, Megaphone, MessagesSquare, Mic,
  Moon, Smartphone, Lock, Package, PackageCheck, PenLine, PhoneCall, PiggyBank, Play, Plus, Presentation, Radio,
  Receipt, RefreshCw, Route, Search, Settings, ShieldAlert, Shuffle, Sparkles, Stethoscope, Store,
  Sun, Target, Ticket, TrendingUp, TrendingDown, Truck, UserRound, Users, Wand2, Wrench, X, Zap,
}

export function Icon({ name, size = 16, className, strokeWidth = 1.6 }: { name?: string; size?: number; className?: string; strokeWidth?: number }) {
  const Cmp = (name && ICONS[name]) || Circle
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} aria-hidden />
}
