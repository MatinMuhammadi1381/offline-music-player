import type {
  SortDirection,
  SortField,
  TrackId,
  TrackInput,
  TrackMetadata,
} from "../../shared-types/src/index.ts";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function assertValidTimestamp(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new RangeError(`${name} must be a finite, non-negative timestamp.`);
  }
}

export function createTrackId(): TrackId {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== "function") {
    throw new Error("A cryptographically secure random UUID source is required to create track IDs.");
  }
  return globalThis.crypto.randomUUID();
}

export function createTrack(input: TrackInput): TrackMetadata {
  if (!input.id.trim()) throw new TypeError("Track id must not be empty.");
  const fileName = input.fileName.trim();
  if (!fileName) throw new TypeError("Track fileName must not be empty.");
  if (!Number.isFinite(input.fileSizeBytes) || input.fileSizeBytes < 0) {
    throw new RangeError("Track fileSizeBytes must be a finite, non-negative number.");
  }
  if (input.durationMs !== undefined && (!Number.isFinite(input.durationMs) || input.durationMs < 0)) {
    throw new RangeError("Track durationMs must be a finite, non-negative number when provided.");
  }

  assertValidTimestamp(input.addedAt, "Track addedAt");
  assertValidTimestamp(input.lastPlayedAt, "Track lastPlayedAt");

  const fallbackTitle = fileName.replace(/\.[^.]+$/, "").trim() || fileName;
  const artist = optionalText(input.artist);
  const album = optionalText(input.album);
  const mimeType = optionalText(input.mimeType);
  return {
    id: input.id,
    title: optionalText(input.title) ?? fallbackTitle,
    fileName,
    fileSizeBytes: input.fileSizeBytes,
    addedAt: input.addedAt ?? Date.now(),
    ...(artist ? { artist } : {}),
    ...(album ? { album } : {}),
    ...(input.durationMs === undefined ? {} : { durationMs: input.durationMs }),
    ...(mimeType ? { mimeType } : {}),
    ...(input.lastPlayedAt === undefined ? {} : { lastPlayedAt: input.lastPlayedAt }),
  };
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").trim();
}

export function searchTracks(
  tracks: readonly TrackMetadata[],
  query: string,
): TrackMetadata[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...tracks];

  const terms = normalizedQuery.split(/\s+/u);
  return tracks.filter((track) => {
    const searchable = normalizeSearchText([
      track.title,
      track.artist ?? "",
      track.album ?? "",
      track.fileName,
    ].join(" "));
    return terms.every((term) => searchable.includes(term));
  });
}

export function sortTracks(
  tracks: readonly TrackMetadata[],
  sort: { readonly field: SortField; readonly direction: SortDirection },
): TrackMetadata[] {
  const direction = sort.direction === "ascending" ? 1 : -1;
  return [...tracks].sort((left, right) => {
    let compared: number;
    if (sort.field === "addedAt") {
      compared = left.addedAt - right.addedAt;
    } else {
      compared = collator.compare(
        left[sort.field] ?? "",
        right[sort.field] ?? "",
      );
    }

    if (compared === 0) compared = left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    return compared * direction;
  });
}
