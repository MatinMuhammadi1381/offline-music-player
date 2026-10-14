import type { QueueState, RepeatMode, TrackId } from "../../shared-types/src/index.ts";

function assertIndex(index: number, length: number, label: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new RangeError(`${label} must be an integer between 0 and ${length - 1}.`);
  }
}

function assertTrackIds(trackIds: readonly TrackId[]): void {
  if (trackIds.some((trackId) => !trackId.trim())) {
    throw new TypeError("A queue must not contain an empty track ID.");
  }
}

function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  assertIndex(fromIndex, items.length, "fromIndex");
  assertIndex(toIndex, items.length, "toIndex");
  const reordered = [...items];
  const item = reordered[fromIndex];
  if (item === undefined) throw new RangeError("The requested queue item does not exist.");
  reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, item);
  return reordered;
}

export function createQueue(
  trackIds: readonly TrackId[] = [],
  startIndex = 0,
): QueueState {
  assertTrackIds(trackIds);
  if (trackIds.length === 0) {
    if (startIndex !== 0) throw new RangeError("An empty queue must use startIndex 0.");
    return { trackIds: [], currentIndex: null, repeatMode: "off", shuffleEnabled: false };
  }
  assertIndex(startIndex, trackIds.length, "startIndex");
  return {
    trackIds: [...trackIds],
    currentIndex: startIndex,
    repeatMode: "off",
    shuffleEnabled: false,
  };
}

export function currentTrackId(queue: QueueState): TrackId | undefined {
  if (queue.currentIndex === null) return undefined;
  return queue.trackIds[queue.currentIndex];
}

export function setRepeatMode(queue: QueueState, repeatMode: RepeatMode): QueueState {
  return { ...queue, repeatMode };
}

export function setQueueShuffle(
  queue: QueueState,
  enabled: boolean,
  random: () => number = Math.random,
): QueueState {
  if (!enabled || queue.shuffleEnabled) return { ...queue, shuffleEnabled: enabled };

  const prefixLength = queue.currentIndex === null ? 0 : queue.currentIndex + 1;
  const prefix = queue.trackIds.slice(0, prefixLength);
  const upcoming = queue.trackIds.slice(prefixLength);
  for (let index = upcoming.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Shuffle random source must return values in [0, 1).");
    }
    const swapIndex = Math.floor(value * (index + 1));
    const currentTrack = upcoming[index];
    const swapTrack = upcoming[swapIndex];
    if (currentTrack === undefined || swapTrack === undefined) {
      throw new RangeError("The queue changed unexpectedly while shuffling.");
    }
    upcoming[index] = swapTrack;
    upcoming[swapIndex] = currentTrack;
  }
  return { ...queue, trackIds: [...prefix, ...upcoming], shuffleEnabled: true };
}

export function advanceQueue(
  queue: QueueState,
  reason: "track-ended" | "skip" = "skip",
): QueueState {
  const currentIndex = queue.currentIndex;
  if (queue.trackIds.length === 0 || currentIndex === null) return queue;
  if (reason === "track-ended" && queue.repeatMode === "track") return queue;
  if (currentIndex + 1 < queue.trackIds.length) {
    return { ...queue, currentIndex: currentIndex + 1 };
  }
  if (queue.repeatMode === "queue") return { ...queue, currentIndex: 0 };
  return { ...queue, currentIndex: null };
}

export function retreatQueue(queue: QueueState): QueueState {
  const currentIndex = queue.currentIndex;
  if (queue.trackIds.length === 0) return queue;
  if (currentIndex === null) {
    return queue.repeatMode === "queue"
      ? { ...queue, currentIndex: queue.trackIds.length - 1 }
      : queue;
  }
  if (currentIndex > 0) return { ...queue, currentIndex: currentIndex - 1 };
  if (queue.repeatMode === "queue") return { ...queue, currentIndex: queue.trackIds.length - 1 };
  return queue;
}

export function seekQueueTo(queue: QueueState, index: number): QueueState {
  assertIndex(index, queue.trackIds.length, "index");
  return { ...queue, currentIndex: index };
}

export function enqueueTracks(
  queue: QueueState,
  trackIds: readonly TrackId[],
  atIndex = queue.trackIds.length,
): QueueState {
  assertTrackIds(trackIds);
  if (!Number.isInteger(atIndex) || atIndex < 0 || atIndex > queue.trackIds.length) {
    throw new RangeError(`atIndex must be an integer between 0 and ${queue.trackIds.length}.`);
  }
  const updatedIds = [...queue.trackIds];
  updatedIds.splice(atIndex, 0, ...trackIds);
  const currentIndex = queue.currentIndex === null
    ? queue.trackIds.length === 0 && trackIds.length > 0 ? 0 : null
    : queue.currentIndex >= atIndex ? queue.currentIndex + trackIds.length : queue.currentIndex;
  return { ...queue, trackIds: updatedIds, currentIndex };
}

export function removeQueueTrack(queue: QueueState, index: number): QueueState {
  assertIndex(index, queue.trackIds.length, "index");
  const trackIds = [...queue.trackIds];
  trackIds.splice(index, 1);

  let currentIndex = queue.currentIndex;
  if (trackIds.length === 0) {
    currentIndex = null;
  } else if (currentIndex !== null && index < currentIndex) {
    currentIndex--;
  } else if (currentIndex === index) {
    currentIndex = Math.min(index, trackIds.length - 1);
  }
  return { ...queue, trackIds, currentIndex };
}

export function moveQueueTrack(
  queue: QueueState,
  fromIndex: number,
  toIndex: number,
): QueueState {
  const trackIds = moveItem(queue.trackIds, fromIndex, toIndex);
  let currentIndex = queue.currentIndex;
  if (currentIndex === fromIndex) {
    currentIndex = toIndex;
  } else if (fromIndex < toIndex && currentIndex !== null && currentIndex > fromIndex && currentIndex <= toIndex) {
    currentIndex--;
  } else if (toIndex < fromIndex && currentIndex !== null && currentIndex >= toIndex && currentIndex < fromIndex) {
    currentIndex++;
  }
  return { ...queue, trackIds, currentIndex };
}
