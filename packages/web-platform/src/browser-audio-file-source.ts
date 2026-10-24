import type {
  AudioFileStore,
  AudioFileReference,
  AudioFileSource,
  FileReferenceStatus,
  FileSelectionResult,
  PlatformCapabilities,
  PlatformId,
  SelectedAudioFile,
} from "../../platform-contracts/src/index.ts";
import type { TrackId, TrackMetadata } from "../../shared-types/src/index.ts";
import { createTrack, createTrackId } from "../../music-core/src/tracks.ts";

export interface AndroidMediaBridge {
  saveMetadataBackup(backupJson: string): void;
  setTheme(lightMode: boolean): void;
  registerSelectedTracks(tracksJson: string): string;
  linkTrack(sourceTrackId: string, targetTrackId: string): string;
  deleteTrack(trackId: string): string;
  getPlaybackUri(trackId: string): string;
  registerScannedTrack(trackId: string, uri: string): string;
  openScannedMedia(uri: string): string;
  readScannedMediaChunk(token: string, requestId: string): void;
  closeScannedMedia(token: string): void;
  acknowledgeScanPage(scanId: string, pageIndex: number): string;
  startInitialScan(): void;
  setArtwork(trackId: string, artworkBase64: string): void;
  playTrack(trackId: string, title: string, artist: string, album: string, durationMs: number): void;
  pausePlayback(): void;
  seekPlayback(positionMs: number): void;
  stopPlayback(): void;
}

declare global {
  interface Window {
    OfflineMusicAndroid?: AndroidMediaBridge;
  }
}

export type BrowserFileChooser = () => Promise<readonly File[] | null>;

const BROWSER_CAPABILITIES: PlatformCapabilities = {
  platform: "ios-pwa",
  multipleFileSelection: {
    status: "unknown",
    notes: "The file input requests multiple selection; verify the picker behavior on the target iOS version.",
  },
  directorySelection: {
    status: "unsupported",
    notes: "This adapter uses a standard file input and does not claim persistent directory access.",
  },
  persistentFileReferences: { status: "unsupported" },
  backgroundPlayback: { status: "not-tested" },
  lockScreenControls: { status: "not-tested" },
};

export function createInputFileChooser(input: HTMLInputElement): BrowserFileChooser {
  input.multiple = true;
  input.accept = "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus";
  return () => new Promise<readonly File[] | null>((resolve, reject) => {
    let settled = false;
    const finish = (files: readonly File[] | null): void => {
      if (settled) return;
      settled = true;
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      resolve(files);
    };
    const onChange = (): void => {
      const files = Array.from(input.files ?? []);
      input.value = "";
      finish(files);
    };
    const onCancel = (): void => {
      input.value = "";
      finish(null);
    };

    input.addEventListener("change", onChange, { once: true });
    input.addEventListener("cancel", onCancel, { once: true });
    try {
      input.click();
    } catch (error) {
      settled = true;
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      reject(error);
    }
  });
}

export class BrowserAudioFileSource implements AudioFileSource {
  private readonly selectedFiles = new Map<string, File>();
  private readonly chooseFiles: BrowserFileChooser;
  private readonly audioFileStore: AudioFileStore | undefined;
  private readonly platform: PlatformId;

  constructor(chooseFiles: BrowserFileChooser, audioFileStore?: AudioFileStore, platform: PlatformId = "ios-pwa") {
    this.chooseFiles = chooseFiles;
    this.audioFileStore = audioFileStore;
    this.platform = platform;
  }

  getCapabilities(): PlatformCapabilities {
    const baseCapabilities = { ...BROWSER_CAPABILITIES, platform: this.platform };
    if (!this.audioFileStore) return baseCapabilities;
    return {
      ...baseCapabilities,
      persistentFileReferences: {
        status: "supported",
        notes: this.platform === "android"
          ? "Audio is copied into this app's private IndexedDB storage and remains across launches until app data is cleared or the app is uninstalled."
          : "Audio is copied into this app's private IndexedDB storage. iOS may still remove browser data.",
      },
    };
  }

  async selectAudioFiles(): Promise<FileSelectionResult> {
    let files: readonly File[] | null;
    try {
      files = await this.chooseFiles();
    } catch (error) {
      return {
        status: "failed",
        error: {
          code: "unavailable",
          message: error instanceof Error ? error.message : "The browser file picker could not be opened.",
        },
      };
    }
    if (files === null || files.length === 0) return { status: "cancelled" };

    const invalidFile = files.find((file) => file.size < 0 || !Number.isSafeInteger(file.size));
    if (invalidFile) {
      return {
        status: "failed",
        error: { code: "unavailable", message: `The selected file "${invalidFile.name}" has an invalid size.` },
      };
    }
    const selected = files.map((file) => {
      const track = createTrack({
        id: createTrackId(),
        fileName: file.name,
        fileSizeBytes: file.size,
        addedAt: Date.now(),
        ...(file.type ? { mimeType: file.type } : {}),
      });
      return {
        track,
        file,
        reference: {
          platform: this.platform,
          token: track.id,
          persistence: this.audioFileStore ? "persistable" as const : "session-only" as const,
        },
      };
    });
    if (this.platform === "android" && typeof window !== "undefined" && window.OfflineMusicAndroid) {
      const registrationError = window.OfflineMusicAndroid.registerSelectedTracks(JSON.stringify(
        selected.map(({ track }) => ({ id: track.id, fileName: track.fileName })),
      ));
      if (registrationError) {
        return {
          status: "failed",
          error: { code: "unavailable", message: registrationError },
        };
      }
    }
    if (this.audioFileStore) {
      try {
        await this.audioFileStore.saveAudioFiles(selected.map(({ track, file }) => ({ trackId: track.id, file })));
      } catch (error) {
        if (this.platform === "android" && typeof window !== "undefined") {
          for (const { track } of selected) window.OfflineMusicAndroid?.deleteTrack(track.id);
        }
        return {
          status: "failed",
          error: {
            code: "unavailable",
            message: `The selected audio could not be saved on this device. Check available storage and try again. ${error instanceof Error ? error.message : ""}`.trim(),
          },
        };
      }
    }
    for (const entry of selected) {
      this.selectedFiles.set(entry.reference.token, entry.file);
    }
    return { status: "selected", files: selected.map(({ track, reference }) => ({ track, reference })) };
  }

  async selectAudioDirectory(): Promise<FileSelectionResult> {
    return {
      status: "failed",
      error: {
        code: "unsupported",
        message: "This browser adapter supports user-selected audio files, not persistent directory access.",
      },
    };
  }

  async checkReference(reference: AudioFileReference): Promise<FileReferenceStatus> {
    if (reference.platform !== this.platform) return "unknown";
    return this.selectedFiles.has(reference.token) ? "available" : "permission-lost";
  }

  getFile(reference: AudioFileReference): File | undefined {
    if (reference.platform !== this.platform) return undefined;
    return this.selectedFiles.get(reference.token);
  }

  async restoreFiles(
    tracks: readonly TrackMetadata[],
  ): Promise<readonly { readonly trackId: TrackId; readonly reference: AudioFileReference }[]> {
    this.selectedFiles.clear();
    if (!this.audioFileStore) return [];
    const restored = await this.audioFileStore.loadAudioFiles(tracks);
    for (const entry of restored) this.selectedFiles.set(entry.trackId, entry.file);
    return restored.map(({ trackId }) => ({
      trackId,
      reference: { platform: this.platform, token: trackId, persistence: "persistable" },
    }));
  }

  async linkFile(trackId: TrackId, selected: SelectedAudioFile): Promise<AudioFileReference> {
    const file = this.getFile(selected.reference);
    if (!file) throw new Error(`The selected file "${selected.track.fileName}" is no longer available.`);
    if (this.audioFileStore) {
      await this.audioFileStore.saveAudioFiles([{ trackId, file }]);
      if (selected.reference.token !== trackId) {
        await this.audioFileStore.deleteAudioFile(selected.reference.token);
        this.selectedFiles.delete(selected.reference.token);
      }
    }
    if (this.platform === "android" && typeof window !== "undefined") {
      const bridgeError = window.OfflineMusicAndroid?.linkTrack(selected.reference.token, trackId);
      if (bridgeError) throw new Error(bridgeError);
    }
    const reference: AudioFileReference = {
      platform: this.platform,
      token: trackId,
      persistence: this.audioFileStore ? "persistable" : "session-only",
    };
    this.selectedFiles.set(reference.token, file);
    return reference;
  }

  async importScannedFile(
    track: TrackMetadata,
    file: File,
    uri: string,
  ): Promise<SelectedAudioFile> {
    if (this.platform !== "android" || !this.audioFileStore || typeof window === "undefined") {
      throw new Error("Android scanned audio cannot be imported by this file source.");
    }
    const bridge = window.OfflineMusicAndroid;
    if (!bridge) throw new Error("The Android media import bridge is unavailable.");
    const registrationError = bridge.registerScannedTrack(track.id, uri);
    if (registrationError) throw new Error(registrationError);
    try {
      await this.audioFileStore.saveAudioFiles([{ trackId: track.id, file }]);
    } catch (error) {
      const cleanupError = bridge.deleteTrack(track.id);
      if (cleanupError) {
        throw new Error(`Could not store "${track.fileName}" and could not clean up its Android reference: ${cleanupError}`);
      }
      throw error;
    }
    const reference: AudioFileReference = {
      platform: "android",
      token: track.id,
      persistence: "persistable",
    };
    this.selectedFiles.set(reference.token, file);
    return { track, reference };
  }

  async deleteStoredFile(trackId: TrackId): Promise<void> {
    if (this.audioFileStore) await this.audioFileStore.deleteAudioFile(trackId);
    if (this.platform === "android" && typeof window !== "undefined") {
      const bridgeError = window.OfflineMusicAndroid?.deleteTrack(trackId);
      if (bridgeError) throw new Error(bridgeError);
    }
    this.selectedFiles.delete(trackId);
  }

  release(reference: AudioFileReference): void {
    if (reference.platform === this.platform) this.selectedFiles.delete(reference.token);
  }

  releaseReference(reference: AudioFileReference): void {
    this.release(reference);
  }
}
