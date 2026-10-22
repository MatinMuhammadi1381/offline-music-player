import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ChevronDown,
  Download,
  House,
  Library,
  ListMusic,
  ListVideo,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type IconName = "home" | "library" | "playlist" | "queue" | "settings" | "play" | "pause" | "next" | "previous" | "search" | "plus" | "shuffle" | "repeat" | "close" | "music" | "back" | "download" | "upload" | "sort" | "chevron-down";
const icons: Record<IconName, LucideIcon> = {
  home: House,
  library: Library,
  playlist: ListMusic,
  queue: ListVideo,
  settings: Settings,
  play: Play,
  pause: Pause,
  next: SkipForward,
  previous: SkipBack,
  search: Search,
  plus: Plus,
  shuffle: Shuffle,
  repeat: Repeat,
  close: X,
  music: Music2,
  back: ArrowLeft,
  download: Download,
  upload: Upload,
  sort: ArrowDownWideNarrow,
  "chevron-down": ChevronDown,
};

export function Icon({ name, size = 21 }: { readonly name: IconName; readonly size?: number }): ReactNode {
  const IconComponent = icons[name];
  return <IconComponent aria-hidden="true" size={size} strokeWidth={1.7} />;
}
