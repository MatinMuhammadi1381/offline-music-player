import type {
  AudioPlaybackEngine,
  PlaybackSnapshot,
  PlaybackSubscription,
  SelectedAudioFile,
} from "../../platform-contracts/src/index.ts";
import type { QueueState, RepeatMode, TrackId } from "../../shared-types/src/index.ts";
import {
  advanceQueue,
  createQueue,
  currentTrackId,
  enqueueTracks,
  moveQueueTrack,
  removeQueueTrack,
  retreatQueue,
  seekQueueTo,
  setQueueShuffle,
  setRepeatMode,
} from "./queue.ts";

export interface PlayerSnapshot {
  readonly playback: PlaybackSnapshot;
  readonly queue: QueueState;
}

export interface PlayerSubscription {
  unsubscribe(): void;
}

export class PlaybackController {
  private readonly engine: AudioPlaybackEngine;
  private readonly resolveFile: (trackId: TrackId) => SelectedAudioFile | undefined;
  private readonly random: () => number;
  private readonly listeners = new Set<(snapshot: PlayerSnapshot) => void>();
  private readonly engineSubscription: PlaybackSubscription;
  private queue: QueueState;
  private playbackOverride: PlaybackSnapshot | undefined;
  private endedTrackId: TrackId | undefined;

  constructor(
    engine: AudioPlaybackEngine,
    resolveFile: (trackId: TrackId) => SelectedAudioFile | undefined,
    initialQueue: QueueState = createQueue(),
    random: () => number = Math.random,
  ) {
    this.engine = engine;
    this.resolveFile = resolveFile;
    this.queue = initialQueue;
    this.random = random;
    this.engineSubscription = engine.subscribe((snapshot) => this.onEngineSnapshot(snapshot));
  }

  getSnapshot(): PlayerSnapshot {
    return {
      playback: this.playbackOverride ?? this.engine.getSnapshot(),
      queue: this.queue,
    };
  }

  subscribe(listener: (snapshot: PlayerSnapshot) => void): PlayerSubscription {
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  async playQueue(trackIds: readonly TrackId[], startIndex = 0): Promise<void> {
    this.queue = createQueue(trackIds, startIndex);
    this.notify();
    await this.playCurrent();
  }

  async playTrack(trackId: TrackId): Promise<void> {
    const currentIndex = this.queue.trackIds.indexOf(trackId);
    if (currentIndex < 0) this.queue = createQueue([trackId]);
    else this.queue = { ...this.queue, currentIndex };
    this.notify();
    await this.playCurrent();
  }

  async playQueueItem(index: number): Promise<void> {
    this.queue = seekQueueTo(this.queue, index);
    this.notify();
    await this.playCurrent();
  }

  async togglePlayback(): Promise<void> {
    const state = this.getSnapshot().playback.state;
    if (state === "playing" || state === "loading") {
      await this.engine.pause();
      return;
    }
    if (currentTrackId(this.queue) === undefined) return;
    await this.playCurrent();
  }

  async pause(): Promise<void> {
    await this.engine.pause();
  }

  async seek(positionMs: number): Promise<void> {
    await this.engine.seek(positionMs);
  }

  async next(): Promise<void> {
    this.queue = advanceQueue(this.queue, "skip");
    this.notify();
    await this.playCurrent();
  }

  enqueue(trackIds: readonly TrackId[]): void {
    this.queue = enqueueTracks(this.queue, trackIds);
    this.notify();
  }

  async removeQueueItem(index: number): Promise<void> {
    const wasCurrent = this.queue.currentIndex === index;
    this.queue = removeQueueTrack(this.queue, index);
    this.notify();
    if (wasCurrent) await this.playCurrent();
  }

  async dismissCurrentTrack(): Promise<void> {
    const trackId = this.getSnapshot().playback.currentTrackId;
    if (trackId !== undefined) {
      const currentIndex = this.queue.currentIndex !== null
        && this.queue.trackIds[this.queue.currentIndex] === trackId
        ? this.queue.currentIndex
        : this.queue.trackIds.indexOf(trackId);
      if (currentIndex >= 0) {
        this.queue = { ...removeQueueTrack(this.queue, currentIndex), currentIndex: null };
      } else {
        this.queue = { ...this.queue, currentIndex: null };
      }
    }
    this.playbackOverride = undefined;
    this.endedTrackId = undefined;
    this.notify();
    await this.engine.stop();
  }

  moveQueueItem(fromIndex: number, toIndex: number): void {
    this.queue = moveQueueTrack(this.queue, fromIndex, toIndex);
    this.notify();
  }

  async previous(): Promise<void> {
    if (this.getSnapshot().playback.positionMs > 3_000) {
      await this.engine.seek(0);
      return;
    }
    this.queue = retreatQueue(this.queue);
    this.notify();
    await this.playCurrent();
  }

  setRepeatMode(mode: RepeatMode): void {
    this.queue = setRepeatMode(this.queue, mode);
    this.notify();
  }

  setShuffleEnabled(enabled: boolean): void {
    this.queue = setQueueShuffle(this.queue, enabled, this.random);
    this.notify();
  }

  async stop(): Promise<void> {
    this.playbackOverride = undefined;
    this.endedTrackId = undefined;
    await this.engine.stop();
  }

  dispose(): void {
    this.engineSubscription.unsubscribe();
    this.listeners.clear();
  }

  private async playCurrent(): Promise<void> {
    const trackId = currentTrackId(this.queue);
    if (trackId === undefined) {
      this.playbackOverride = undefined;
      await this.engine.stop();
      return;
    }

    const file = this.resolveFile(trackId);
    if (file === undefined) {
      const message = "This audio file is unavailable. Reselect the file, then try again.";
      const failure: PlaybackSnapshot = {
        state: "error",
        currentTrackId: trackId,
        positionMs: 0,
        failure: {
          code: "reference-unavailable",
          message,
        },
      };
      this.playbackOverride = failure;
      this.notify();
      throw new Error(message);
    }

    this.playbackOverride = undefined;
    this.endedTrackId = undefined;
    try {
      await this.engine.play(file);
    } catch (error) {
      this.notify();
      throw error;
    }
  }

  private onEngineSnapshot(snapshot: PlaybackSnapshot): void {
    this.playbackOverride = undefined;
    if (snapshot.state === "ended" && snapshot.currentTrackId !== undefined
        && snapshot.currentTrackId !== this.endedTrackId) {
      this.endedTrackId = snapshot.currentTrackId;
      this.queue = advanceQueue(this.queue, "track-ended");
      this.notify();
      void this.playCurrent().catch(() => {
        // The engine snapshot already exposes the playback failure.
      });
      return;
    }
    if (snapshot.state !== "ended") this.endedTrackId = undefined;
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
