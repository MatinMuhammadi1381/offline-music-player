export type TrackId = string;
export type PlaylistId = string;

export interface TrackMetadata {
  readonly id: TrackId;
  readonly title: string;
  readonly artist?: string;
  readonly album?: string;
  readonly durationMs?: number;
  readonly mimeType?: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly addedAt: number;
  readonly lastPlayedAt?: number;
}

export interface TrackInput {
  readonly id: TrackId;
  readonly title?: string;
  readonly artist?: string;
  readonly album?: string;
  readonly durationMs?: number;
  readonly mimeType?: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly addedAt?: number;
  readonly lastPlayedAt?: number;
}

export interface Playlist {
  readonly id: PlaylistId;
  readonly name: string;
  readonly trackIds: readonly TrackId[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface QueueState {
  readonly trackIds: readonly TrackId[];
  readonly currentIndex: number | null;
  readonly repeatMode: RepeatMode;
  readonly shuffleEnabled: boolean;
}

export type RepeatMode = "off" | "queue" | "track";
export type SortField = "title" | "artist" | "album" | "addedAt";
export type SortDirection = "ascending" | "descending";

export interface TrackSort {
  readonly field: SortField;
  readonly direction: SortDirection;
}

export interface PlayerSettings {
  readonly schemaVersion: 1;
  readonly librarySort: TrackSort;
  readonly repeatMode: RepeatMode;
  readonly shuffleEnabled: boolean;
}

export interface LibraryMetadata {
  readonly schemaVersion: 1;
  readonly tracks: readonly TrackMetadata[];
  readonly playlists: readonly Playlist[];
}
