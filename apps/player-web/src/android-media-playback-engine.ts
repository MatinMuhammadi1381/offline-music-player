import type { PlaybackSnapshot, SelectedAudioFile } from "@offline-music-player/platform-contracts";
import { extractEmbeddedArtwork, type AndroidMediaBridge } from "@offline-music-player/web-platform";

interface NativePlaybackEvent {
  readonly state: PlaybackSnapshot["state"];
  readonly trackId?: string;
  readonly positionMs: number;
  readonly durationMs?: number;
  readonly failure?: { readonly message: string };
}

function isNativePlaybackEvent(value: unknown): value is NativePlaybackEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<NativePlaybackEvent>;
  return ["idle", "loading", "playing", "paused", "ended", "error"].includes(String(event.state))
    && typeof event.positionMs === "number"
    && (event.trackId === undefined || typeof event.trackId === "string")
    && (event.durationMs === undefined || typeof event.durationMs === "number");
}

export class AndroidMediaPlaybackEngine {
  private readonly bridge: AndroidMediaBridge;
  private readonly listeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  private snapshot: PlaybackSnapshot = { state: "idle", positionMs: 0 };

  constructor(
    bridge: AndroidMediaBridge,
    private readonly resolveAudioFile: (file: SelectedAudioFile) => File | undefined,
  ) {
    this.bridge = bridge;
    window.addEventListener("offline-music-native-playback", this.onPlaybackEvent);
  }

  getSnapshot(): PlaybackSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void): { unsubscribe(): void } {
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  async play(file: SelectedAudioFile): Promise<void> {
    const uri = this.bridge.getPlaybackUri(file.track.id);
    if (!uri) {
      throw new Error(`Android no longer has access to "${file.track.fileName}". Reselect the file to restore playback.`);
    }
    this.setSnapshot({
      state: "loading",
      currentTrackId: file.track.id,
      positionMs: 0,
      ...(file.track.durationMs === undefined ? {} : { durationMs: file.track.durationMs }),
    });
    this.bridge.playTrack(
      file.track.id,
      file.track.title,
      file.track.artist ?? "",
      file.track.album ?? "",
      file.track.durationMs ?? 0,
    );
    const audioFile = this.resolveAudioFile(file);
    if (audioFile) void this.updateArtwork(file.track.id, audioFile);
  }

  async pause(): Promise<void> {
    this.bridge.pausePlayback();
    if (this.snapshot.state === "playing" || this.snapshot.state === "loading") {
      this.setSnapshot({ ...this.snapshot, state: "paused" });
    }
  }

  async seek(positionMs: number): Promise<void> {
    if (!Number.isFinite(positionMs) || positionMs < 0) {
      throw new RangeError("positionMs must be a finite non-negative number.");
    }
    this.bridge.seekPlayback(Math.round(positionMs));
    const position = this.snapshot.durationMs === undefined
      ? positionMs
      : Math.min(positionMs, this.snapshot.durationMs);
    this.setSnapshot({ ...this.snapshot, positionMs: position });
  }

  async stop(): Promise<void> {
    this.bridge.stopPlayback();
    this.setSnapshot({ state: "idle", positionMs: 0 });
  }

  dispose(): void {
    window.removeEventListener("offline-music-native-playback", this.onPlaybackEvent);
    this.listeners.clear();
  }

  private readonly onPlaybackEvent = (event: Event): void => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!isNativePlaybackEvent(detail)) return;
    this.setSnapshot({
      state: detail.state,
      ...(detail.trackId === undefined ? {} : { currentTrackId: detail.trackId }),
      positionMs: Math.max(0, detail.positionMs),
      ...(detail.durationMs === undefined ? {} : { durationMs: Math.max(0, detail.durationMs) }),
      ...(detail.failure === undefined ? {} : {
        failure: { code: "decoder-error", message: detail.failure.message },
      }),
    });
  };

  private setSnapshot(snapshot: PlaybackSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  private async updateArtwork(trackId: string, file: File): Promise<void> {
    try {
      const artwork = await extractEmbeddedArtwork(file);
      if (!artwork) return;
      const image = await createImageBitmap(artwork);
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (!compressed) return;
      if (this.snapshot.currentTrackId !== trackId) return;
      const bytes = new Uint8Array(await compressed.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      this.bridge.setArtwork(trackId, btoa(binary));
    } catch {
      console.warn(`Embedded artwork could not be prepared for Android playback: ${file.name}`);
    }
  }
}
