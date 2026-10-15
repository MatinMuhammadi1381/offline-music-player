import type {
  LibraryMetadata,
  PlayerSettings,
  TrackId,
  TrackMetadata,
} from "../../shared-types/src/index.ts";

export type PlatformId = "ios-pwa" | "android";
export type SupportStatus = "supported" | "unsupported" | "unknown" | "not-tested";
export type FileReferenceStatus = "available" | "missing" | "permission-lost" | "unknown";
export type SelectionErrorCode = "permission-denied" | "cancelled" | "unsupported" | "unavailable";

export interface PlatformCapability {
  readonly status: SupportStatus;
  readonly notes?: string;
}

export interface PlatformCapabilities {
  readonly platform: PlatformId;
  readonly multipleFileSelection: PlatformCapability;
  readonly directorySelection: PlatformCapability;
  readonly persistentFileReferences: PlatformCapability;
  readonly backgroundPlayback: PlatformCapability;
  readonly lockScreenControls: PlatformCapability;
}

export interface AudioFileReference {
  readonly platform: PlatformId;
  /** An adapter-owned runtime handle. Do not serialize it as library metadata. */
  readonly token: string;
  readonly persistence: "session-only" | "persistable" | "unknown";
}

export interface SelectedAudioFile {
  readonly track: TrackMetadata;
  readonly reference: AudioFileReference;
}

export interface SelectionError {
  readonly code: SelectionErrorCode;
  readonly message: string;
}

export type FileSelectionResult =
  | { readonly status: "selected"; readonly files: readonly SelectedAudioFile[] }
  | { readonly status: "cancelled" }
  | { readonly status: "failed"; readonly error: SelectionError };

export interface AudioFileSource {
  getCapabilities(): PlatformCapabilities;
  selectAudioFiles(): Promise<FileSelectionResult>;
  selectAudioDirectory(): Promise<FileSelectionResult>;
  checkReference(reference: AudioFileReference): Promise<FileReferenceStatus>;
  restoreFiles?(tracks: readonly TrackMetadata[]): Promise<readonly {
    readonly trackId: TrackId;
    readonly reference: AudioFileReference;
  }[]>;
  linkFile?(trackId: TrackId, file: SelectedAudioFile): Promise<AudioFileReference>;
  deleteStoredFile?(trackId: TrackId): Promise<void>;
  releaseReference?(reference: AudioFileReference): void;
}

export interface AudioFileStore {
  saveAudioFiles(files: readonly { readonly trackId: TrackId; readonly file: File }[]): Promise<void>;
  loadAudioFiles(tracks: readonly TrackMetadata[]): Promise<readonly { readonly trackId: TrackId; readonly file: File }[]>;
  deleteAudioFile(trackId: string): Promise<void>;
}

export interface LibraryRepository {
  /** Load and save the portable library metadata. Audio is managed by AudioFileStore. */
  loadLibrary(): Promise<LibraryMetadata>;
  saveLibrary(library: LibraryMetadata): Promise<void>;
  loadSettings(): Promise<PlayerSettings>;
  saveSettings(settings: PlayerSettings): Promise<void>;
}

export type PlaybackFailureCode =
  | "reference-unavailable"
  | "unsupported-format"
  | "decoder-error"
  | "interrupted"
  | "playback-blocked";

export interface PlaybackSnapshot {
  readonly state: "idle" | "loading" | "playing" | "paused" | "ended" | "error";
  readonly currentTrackId?: TrackId;
  readonly positionMs: number;
  readonly durationMs?: number;
  readonly failure?: {
    readonly code: PlaybackFailureCode;
    readonly message: string;
  };
}

export interface PlaybackSubscription {
  unsubscribe(): void;
}

export interface AudioPlaybackEngine {
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: (snapshot: PlaybackSnapshot) => void): PlaybackSubscription;
  play(file: SelectedAudioFile): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  stop(): Promise<void>;
}

export type MetadataImportResult =
  | { readonly status: "valid"; readonly library: LibraryMetadata }
  | { readonly status: "invalid"; readonly errors: readonly string[] };

export interface MetadataBackupService {
  exportMetadata(library: LibraryMetadata): Promise<Blob>;
  validateMetadataBackup(backup: Blob): Promise<MetadataImportResult>;
}
