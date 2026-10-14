import type {
  AudioPlaybackEngine,
  PlaybackFailureCode,
  PlaybackSnapshot,
  SelectedAudioFile,
} from "../../platform-contracts/src/index.ts";
import type { BrowserAudioFileSource } from "./browser-audio-file-source.ts";

export interface AudioElementPort {
  currentTime: number;
  duration: number;
  error: MediaError | null;
  src: string;
  load(): void;
  play(): Promise<void>;
  pause(): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface ObjectUrlPort {
  createObjectURL(object: Blob): string;
  revokeObjectURL(url: string): void;
}

export class HtmlAudioPlaybackEngine implements AudioPlaybackEngine {
  private readonly audio: AudioElementPort;
  private readonly files: BrowserAudioFileSource;
  private readonly objectUrls: ObjectUrlPort;
  private readonly listeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  private snapshot: PlaybackSnapshot = { state: "idle", positionMs: 0 };
  private objectUrl: string | undefined;
  private generation = 0;

  constructor(
    files: BrowserAudioFileSource,
    audio: AudioElementPort = new Audio(),
    objectUrls: ObjectUrlPort = URL,
  ) {
    this.files = files;
    this.audio = audio;
    this.objectUrls = objectUrls;
    this.audio.addEventListener("timeupdate", this.onProgress);
    this.audio.addEventListener("durationchange", this.onProgress);
    this.audio.addEventListener("play", this.onPlay);
    this.audio.addEventListener("pause", this.onPause);
    this.audio.addEventListener("ended", this.onEnded);
    this.audio.addEventListener("error", this.onError);
  }

  getSnapshot(): PlaybackSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void): { unsubscribe(): void } {
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  async play(file: SelectedAudioFile): Promise<void> {
    const selectedFile = this.files.getFile(file.reference);
    if (selectedFile === undefined) {
      const failure = new Error("The selected audio file is no longer available. Reselect it to continue.");
      this.setSnapshot({
        state: "error",
        currentTrackId: file.track.id,
        positionMs: 0,
        failure: { code: "reference-unavailable", message: failure.message },
      });
      throw failure;
    }

    const generation = ++this.generation;
    this.releaseObjectUrl();
    this.audio.pause();
    let objectUrl: string;
    try {
      objectUrl = this.objectUrls.createObjectURL(selectedFile);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error("The audio file could not be opened.");
      this.setSnapshot({
        state: "error",
        currentTrackId: file.track.id,
        positionMs: 0,
        failure: { code: "reference-unavailable", message: failure.message },
      });
      throw failure;
    }

    this.objectUrl = objectUrl;
    this.audio.src = objectUrl;
    this.setSnapshot({ state: "loading", currentTrackId: file.track.id, positionMs: 0 });
    this.audio.load();
    try {
      await this.audio.play();
      if (generation === this.generation) this.updateProgress("playing");
    } catch (error) {
      if (generation !== this.generation) return;
      const failure = error instanceof Error ? error : new Error("Playback could not start.");
      const code: PlaybackFailureCode = failure.name === "NotAllowedError"
        ? "playback-blocked"
        : failure.name === "NotSupportedError" ? "unsupported-format" : "interrupted";
      this.setSnapshot({
        state: "error",
        currentTrackId: file.track.id,
        positionMs: 0,
        failure: { code, message: failure.message || "Playback could not start. Try again." },
      });
      throw failure;
    }
  }

  async pause(): Promise<void> {
    this.audio.pause();
    if (this.snapshot.state !== "idle" && this.snapshot.state !== "error") {
      this.updateProgress("paused");
    }
  }

  async seek(positionMs: number): Promise<void> {
    if (!Number.isFinite(positionMs) || positionMs < 0) {
      throw new RangeError("positionMs must be a finite non-negative number.");
    }
    const durationMs = this.snapshot.durationMs;
    const clampedPosition = durationMs === undefined ? positionMs : Math.min(positionMs, durationMs);
    this.audio.currentTime = clampedPosition / 1_000;
    this.updateProgress(this.snapshot.state);
  }

  async stop(): Promise<void> {
    this.generation++;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.releaseObjectUrl();
    this.setSnapshot({ state: "idle", positionMs: 0 });
  }

  dispose(): void {
    this.generation++;
    this.audio.removeEventListener("timeupdate", this.onProgress);
    this.audio.removeEventListener("durationchange", this.onProgress);
    this.audio.removeEventListener("play", this.onPlay);
    this.audio.removeEventListener("pause", this.onPause);
    this.audio.removeEventListener("ended", this.onEnded);
    this.audio.removeEventListener("error", this.onError);
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.releaseObjectUrl();
    this.listeners.clear();
  }

  private readonly onProgress: EventListener = () => this.updateProgress(this.snapshot.state);
  private readonly onPlay: EventListener = () => this.updateProgress("playing");
  private readonly onPause: EventListener = () => {
    if (this.snapshot.state !== "ended" && this.snapshot.state !== "error") {
      this.updateProgress("paused");
    }
  };
  private readonly onEnded: EventListener = () => this.updateProgress("ended");
  private readonly onError: EventListener = () => {
    const errorCode = this.audio.error?.code;
    const code: PlaybackFailureCode = errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      ? "unsupported-format"
      : errorCode === MediaError.MEDIA_ERR_ABORTED ? "interrupted" : "decoder-error";
    this.setSnapshot({
      state: "error",
      ...(this.snapshot.currentTrackId === undefined ? {} : { currentTrackId: this.snapshot.currentTrackId }),
      positionMs: this.snapshot.positionMs,
      ...(this.snapshot.durationMs === undefined ? {} : { durationMs: this.snapshot.durationMs }),
      failure: {
        code,
        message: code === "unsupported-format"
          ? "This audio format is not supported by the browser. Try another file."
          : "The audio file could not be read. Reselect it or try another file.",
      },
    });
  };

  private updateProgress(state: PlaybackSnapshot["state"]): void {
    const positionMs = Number.isFinite(this.audio.currentTime) ? Math.max(0, this.audio.currentTime * 1_000) : 0;
    const durationMs = Number.isFinite(this.audio.duration) && this.audio.duration >= 0
      ? this.audio.duration * 1_000
      : undefined;
    this.setSnapshot({
      state,
      ...(this.snapshot.currentTrackId === undefined ? {} : { currentTrackId: this.snapshot.currentTrackId }),
      positionMs,
      ...(durationMs === undefined ? {} : { durationMs }),
    });
  }

  private setSnapshot(snapshot: PlaybackSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl === undefined) return;
    this.objectUrls.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }
}
