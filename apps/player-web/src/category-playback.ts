import type { TrackMetadata } from "@offline-music-player/shared-types";

export interface CategoryAssignments {
  readonly schemaVersion: 1;
  readonly categories: Readonly<Record<string, readonly string[]>>;
}

const emptyAssignments = (categoryNames: readonly string[]): CategoryAssignments => ({
  schemaVersion: 1,
  categories: Object.fromEntries([...new Set(categoryNames)].map((name) => [name, []])),
});

function randomIndex(length: number, random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Category assignment random source must return values in [0, 1).");
  }
  return Math.floor(value * length);
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function parseCategoryAssignments(
  serialized: string | null,
  categoryNames: readonly string[],
): CategoryAssignments | null {
  if (!serialized) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || !("schemaVersion" in parsed)
    || parsed.schemaVersion !== 1 || !("categories" in parsed)
    || typeof parsed.categories !== "object" || parsed.categories === null) {
    return null;
  }

  const source = parsed.categories as Record<string, unknown>;
  const categories = Object.fromEntries([...new Set(categoryNames)].map((name) => [
    name,
    Array.isArray(source[name]) && source[name].every((id: unknown) => typeof id === "string")
      ? source[name] as string[]
      : [],
  ]));
  return { schemaVersion: 1, categories };
}

export function createCategoryAssignments(
  trackIds: readonly string[],
  categoryNames: readonly string[],
  random: () => number = Math.random,
): CategoryAssignments {
  const names = [...new Set(categoryNames)];
  if (names.length === 0) {
    if (trackIds.length > 0) throw new RangeError("Tracks cannot be assigned without music categories.");
    return emptyAssignments(names);
  }

  const uniqueTrackIds = [...new Set(trackIds)];
  const tracks = shuffled(uniqueTrackIds, random);
  const categoryTracks = Object.fromEntries(names.map((name) => [name, [] as string[]]));
  const separatorCount = names.length - 1;
  const slots = tracks.length + separatorCount;
  const positions = Array.from({ length: slots }, (_, index) => index);
  for (let index = 0; index < separatorCount; index += 1) {
    const swapIndex = index + randomIndex(positions.length - index, random);
    [positions[index], positions[swapIndex]] = [positions[swapIndex]!, positions[index]!];
  }
  const separators = new Set(positions.slice(0, separatorCount));
  let categoryIndex = 0;
  let trackIndex = 0;
  for (let position = 0; position < slots; position += 1) {
    if (separators.has(position)) {
      categoryIndex += 1;
    } else {
      categoryTracks[names[categoryIndex]!]!.push(tracks[trackIndex++]!);
    }
  }

  return { schemaVersion: 1, categories: categoryTracks };
}

export function reconcileCategoryAssignments(
  previous: CategoryAssignments,
  trackIds: readonly string[],
  categoryNames: readonly string[],
  random: () => number = Math.random,
): CategoryAssignments {
  const names = [...new Set(categoryNames)];
  const uniqueTrackIds = [...new Set(trackIds)];
  if (names.length === 0) {
    if (uniqueTrackIds.length > 0) throw new RangeError("Tracks cannot be assigned without music categories.");
    return emptyAssignments(names);
  }
  if (uniqueTrackIds.length > 0 && names.every((name) => (previous.categories[name] ?? []).length === 0)) {
    return createCategoryAssignments(uniqueTrackIds, names, random);
  }

  const available = new Set(uniqueTrackIds);
  const assigned = new Set<string>();
  const categories = Object.fromEntries(names.map((name) => [name, [] as string[]]));
  for (const name of names) {
    for (const trackId of previous.categories[name] ?? []) {
      if (available.has(trackId) && !assigned.has(trackId)) {
        categories[name]!.push(trackId);
        assigned.add(trackId);
      }
    }
  }
  for (const trackId of uniqueTrackIds) {
    if (assigned.has(trackId)) continue;
    const categoryName = names[randomIndex(names.length, random)]!;
    categories[categoryName]!.push(trackId);
    assigned.add(trackId);
  }

  const unchanged = previous.schemaVersion === 1
    && names.length === Object.keys(previous.categories).length
    && names.every((name) => {
      const oldIds = previous.categories[name];
      const newIds = categories[name]!;
      return oldIds !== undefined && oldIds.length === newIds.length
        && oldIds.every((id, index) => id === newIds[index]);
    });
  return unchanged ? previous : { schemaVersion: 1, categories };
}

export function getCategoryTracks(
  tracks: readonly TrackMetadata[],
  assignedTrackIds: readonly string[],
): readonly TrackMetadata[] {
  const assigned = new Set(assignedTrackIds);
  return tracks.filter((track) => assigned.has(track.id));
}

export function getRandomCategoryQueue(
  tracks: readonly TrackMetadata[],
  random: () => number = Math.random,
): readonly TrackMetadata[] {
  return shuffled(tracks, random);
}
