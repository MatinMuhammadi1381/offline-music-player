import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ChevronDown,
  Download,
  House,
  Library,
  ListMusic,
  ListVideo,
  Image,
  Globe2,
  Music2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  Share2,
  Settings,
  Shuffle,
  Check,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type IconName = "home" | "library" | "playlist" | "queue" | "settings" | "play" | "pause" | "next" | "previous" | "search" | "plus" | "shuffle" | "repeat" | "close" | "music" | "back" | "download" | "upload" | "sort" | "chevron-down" | "image" | "delete" | "share" | "menu" | "globe" | "check";
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
  image: Image,
  delete: Trash2,
  share: Share2,
  menu: MoreVertical,
  globe: Globe2,
  check: Check,
};

export function Icon({ name, size = 21 }: { readonly name: IconName; readonly size?: number }): ReactNode {
  const IconComponent = icons[name];
  return <IconComponent aria-hidden="true" size={size} strokeWidth={1.7} />;
}

export function ContactPlatformIcon({ platform }: { readonly platform: "telegram" | "instagram" | "phone" | "github" }): ReactNode {
  if (platform === "telegram") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.8 3.2 18.5 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.5l-5-1.6c-1.1-.3-1.1-1.1.2-1.6L20.7 2.8c.9-.3 1.6.2 1.1.4Z" />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="instagram-gradient" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="#ffb13d" />
            <stop offset="48%" stopColor="#e1306c" />
            <stop offset="100%" stopColor="#833ab4" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#instagram-gradient)" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="18" cy="6.5" r="1.2" fill="white" />
      </svg>
    );
  }

  if (platform === "phone") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.5c1 .4 2 .6 3 .7a2 2 0 0 1 1.7 2Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.2.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.6-1.3-1.6-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6a4.7 4.7 0 0 1 1.2-3.2 4.3 4.3 0 0 1 .1-3.1s1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.1a4.7 4.7 0 0 1 1.2 3.2c0 4.7-2.8 5.7-5.5 6 .4.3.8 1 .8 2v3c0 .4.2.7.8.6A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}
