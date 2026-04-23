import {
  Search,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  FileText,
  Eye,
  Pencil,
  Columns2,
  Command as CommandIcon,
  Settings,
  Globe,
  X,
  ArrowLeft,
  ArrowRight,
  Inbox,
  Calendar,
  Tag,
  BookOpen,
  FlaskConical,
  Microscope,
  Brain,
  Dna,
  Leaf,
  Atom,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Import,
  FileDigit,
  Share2,
  Network,
  PanelRight,
  PanelLeft,
  Circle,
  Moon,
  Sun,
  CheckCircle2,
  Loader2,
  AlertCircle,
  type LucideProps,
} from 'lucide-react';
import type { IconName } from '../store/app';

export const LucideIcons = {
  Search,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  FileText,
  Eye,
  Pencil,
  Columns2,
  CommandIcon,
  Settings,
  Globe,
  X,
  ArrowLeft,
  ArrowRight,
  Inbox,
  Calendar,
  Tag,
  BookOpen,
  FlaskConical,
  Microscope,
  Brain,
  Dna,
  Leaf,
  Atom,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Import,
  FileDigit,
  Share2,
  Network,
  PanelRight,
  PanelLeft,
  Circle,
  Moon,
  Sun,
  CheckCircle2,
  Loader2,
  AlertCircle,
};

/* Custom science icon: minimalist cell (plasma membrane + nucleus + organelles)
 * Lucide doesn't have a "cell" icon — ported from the HTML mockup design language. */
export function CellIcon({ size = 16, strokeWidth = 1.5, ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <ellipse cx="12" cy="12" rx="9" ry="8" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="7.5" cy="9" r="0.8" fill="currentColor" />
      <circle cx="16.5" cy="15" r="0.8" fill="currentColor" />
      <circle cx="16" cy="8" r="0.6" fill="currentColor" />
      <circle cx="8" cy="16" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** Map our IconName to a renderable component. */
export function SpaceIcon({
  name,
  size = 16,
  color,
  ...rest
}: {
  name: IconName;
  size?: number;
  color?: string;
} & Omit<LucideProps, 'size' | 'color'>) {
  const common: LucideProps = {
    size,
    strokeWidth: 1.6,
    color: color ?? 'currentColor',
    ...rest,
  };
  switch (name) {
    case 'brain':
      return <Brain {...common} />;
    case 'dna':
      return <Dna {...common} />;
    case 'cell':
      return <CellIcon {...common} />;
    case 'leaf':
      return <Leaf {...common} />;
    case 'flask':
      return <FlaskConical {...common} />;
    case 'microscope':
      return <Microscope {...common} />;
    case 'atom':
      return <Atom {...common} />;
    case 'book':
      return <BookOpen {...common} />;
    case 'file':
    default:
      return <FileText {...common} />;
  }
}

/** Small workspace-logo (used in sidebar top). */
export function BioNotesLogo({ size = 22, color }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        fill={color ?? 'var(--accent)'}
        fillOpacity="0.16"
        stroke={color ?? 'var(--accent)'}
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <path
        d="M7 7c3.5 0 3.5 10 10 10"
        stroke={color ?? 'var(--accent)'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 17c3.5 0 3.5-10 10-10"
        stroke={color ?? 'var(--accent)'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9.8" r="0.9" fill={color ?? 'var(--accent)'} />
      <circle cx="15" cy="14.2" r="0.9" fill={color ?? 'var(--accent)'} />
    </svg>
  );
}
