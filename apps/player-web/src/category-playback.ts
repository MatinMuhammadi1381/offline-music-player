import { searchTracks } from "@offline-music-player/music-core";
import type { TrackMetadata } from "@offline-music-player/shared-types";

export function getCategoryTracks(
  tracks: readonly TrackMetadata[],
  term: string,
): readonly TrackMetadata[] {
  const matches = searchTracks(tracks, term);
  return matches.length > 0 ? matches : tracks;
}

export function getRandomCategoryQueue(
  tracks: readonly TrackMetadata[],
  term: string,
  random: () => number = Math.random,
): readonly TrackMetadata[] {
  const queue = [...getCategoryTracks(tracks, term)];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Category shuffle random source must return values in [0, 1).");
    }
    const swapIndex = Math.floor(value * (index + 1));
    [queue[index], queue[swapIndex]] = [queue[swapIndex]!, queue[index]!];
  }
  return queue;
}
