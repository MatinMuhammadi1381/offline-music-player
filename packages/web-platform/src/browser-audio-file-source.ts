import type {
  AudioFileReference,
  AudioFileSource,
  FileReferenceStatus,
  FileSelectionResult,
  PlatformCapabilities,
} from "../../platform-contracts/src/index.ts";
import { createTrack, createTrackId } from "../../music-core/src/tracks.ts";

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
  persistentFileReferences: {
    status: "unsupported",
    notes: "Selected File objects and their runtime handles are session-only and cannot be serialized as library metadata.",
  },
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

  constructor(chooseFiles: BrowserFileChooser) {
    this.chooseFiles = chooseFiles;
  }

  getCapabilities(): PlatformCapabilities {
    return BROWSER_CAPABILITIES;
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

    const selected = [];
    for (const file of files) {
      if (file.size < 0 || !Number.isSafeInteger(file.size)) {
        return {
          status: "failed",
          error: { code: "unavailable", message: `The selected file "${file.name}" has an invalid size.` },
        };
      }
      const token = createTrackId();
      this.selectedFiles.set(token, file);
      const mimeType = file.type || undefined;
      selected.push({
        track: createTrack({
          id: createTrackId(),
          fileName: file.name,
          fileSizeBytes: file.size,
          addedAt: Date.now(),
          ...(mimeType ? { mimeType } : {}),
        }),
        reference: {
          platform: "ios-pwa" as const,
          token,
          persistence: "session-only" as const,
        },
      });
    }
    return { status: "selected", files: selected };
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
    if (reference.platform !== "ios-pwa") return "unknown";
    return this.selectedFiles.has(reference.token) ? "available" : "permission-lost";
  }

  getFile(reference: AudioFileReference): File | undefined {
    if (reference.platform !== "ios-pwa") return undefined;
    return this.selectedFiles.get(reference.token);
  }

  release(reference: AudioFileReference): void {
    if (reference.platform === "ios-pwa") this.selectedFiles.delete(reference.token);
  }

  releaseReference(reference: AudioFileReference): void {
    this.release(reference);
  }
}
