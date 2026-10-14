import type {
  Playlist,
  PlaylistId,
  TrackId,
} from "../../shared-types/src/index.ts";

function normalizedName(name: string): string {
  const value = name.trim();
  if (!value) throw new TypeError("Playlist name must not be empty.");
  return value;
}

function timestamp(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative timestamp.`);
  }
}

function assertIndex(index: number, length: number, label: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new RangeError(`${label} must be an integer between 0 and ${length - 1}.`);
  }
}

export function createPlaylistId(): PlaylistId {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== "function") {
    throw new Error("A cryptographically secure random UUID source is required to create playlist IDs.");
  }
  return globalThis.crypto.randomUUID();
}

export function createPlaylist(
  input: {
    readonly id: PlaylistId;
    readonly name: string;
    readonly trackIds?: readonly TrackId[];
    readonly createdAt: number;
  },
): Playlist {
  if (!input.id.trim()) throw new TypeError("Playlist id must not be empty.");
  timestamp(input.createdAt, "Playlist createdAt");
  const trackIds = [...(input.trackIds ?? [])];
  if (trackIds.some((trackId) => !trackId.trim())) {
    throw new TypeError("A playlist must not contain an empty track ID.");
  }
  if (new Set(trackIds).size !== trackIds.length) {
    throw new TypeError("A playlist must not contain duplicate track IDs.");
  }
  return {
    id: input.id,
    name: normalizedName(input.name),
    trackIds,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function renamePlaylist(playlist: Playlist, name: string, updatedAt: number): Playlist {
  timestamp(updatedAt, "Playlist updatedAt");
  if (updatedAt < playlist.updatedAt) {
    throw new RangeError("Playlist updatedAt must not be earlier than its previous update.");
  }
  return { ...playlist, name: normalizedName(name), updatedAt };
}

export function addTracksToPlaylist(
  playlist: Playlist,
  trackIds: readonly TrackId[],
  updatedAt: number,
): Playlist {
  if (trackIds.some((trackId) => !trackId.trim())) {
    throw new TypeError("A playlist must not contain an empty track ID.");
  }
  timestamp(updatedAt, "Playlist updatedAt");
  if (updatedAt < playlist.updatedAt) {
    throw new RangeError("Playlist updatedAt must not be earlier than its previous update.");
  }
  const nextIds = [...playlist.trackIds];
  const included = new Set(nextIds);
  for (const trackId of trackIds) {
    if (!included.has(trackId)) {
      nextIds.push(trackId);
      included.add(trackId);
    }
  }
  return { ...playlist, trackIds: nextIds, updatedAt };
}

export function removeTrackFromPlaylist(
  playlist: Playlist,
  trackId: TrackId,
  updatedAt: number,
): Playlist {
  timestamp(updatedAt, "Playlist updatedAt");
  if (updatedAt < playlist.updatedAt) {
    throw new RangeError("Playlist updatedAt must not be earlier than its previous update.");
  }
  return {
    ...playlist,
    trackIds: playlist.trackIds.filter((id) => id !== trackId),
    updatedAt,
  };
}

export function movePlaylistTrack(
  playlist: Playlist,
  fromIndex: number,
  toIndex: number,
  updatedAt: number,
): Playlist {
  timestamp(updatedAt, "Playlist updatedAt");
  if (updatedAt < playlist.updatedAt) {
    throw new RangeError("Playlist updatedAt must not be earlier than its previous update.");
  }
  assertIndex(fromIndex, playlist.trackIds.length, "fromIndex");
  assertIndex(toIndex, playlist.trackIds.length, "toIndex");
  const trackIds = [...playlist.trackIds];
  const trackId = trackIds[fromIndex];
  if (trackId === undefined) throw new RangeError("The requested playlist track does not exist.");
  trackIds.splice(fromIndex, 1);
  trackIds.splice(toIndex, 0, trackId);
  return { ...playlist, trackIds, updatedAt };
}

export function deletePlaylist(
  playlists: readonly Playlist[],
  playlistId: PlaylistId,
): Playlist[] {
  return playlists.filter((playlist) => playlist.id !== playlistId);
}
