import type { LibraryMetadata, Playlist, TrackMetadata } from "../../shared-types/src/index.ts";
import type {
  LibraryRepository,
  MetadataBackupService,
  MetadataImportResult,
} from "../../platform-contracts/src/index.ts";

export const METADATA_BACKUP_FORMAT = "offline-music-player-library";
export const METADATA_BACKUP_VERSION = 1;
export const METADATA_BACKUP_MAX_BYTES = 10 * 1024 * 1024;
const MAX_TRACKS = 50_000;
const MAX_PLAYLISTS = 10_000;
const MAX_TEXT_LENGTH = 4_096;
const MAX_PLAYLIST_ARTWORK_LENGTH = 500_000;

interface MetadataBackup {
  readonly format: typeof METADATA_BACKUP_FORMAT;
  readonly version: typeof METADATA_BACKUP_VERSION;
  readonly exportedAt: string;
  readonly library: LibraryMetadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  errors: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) errors.push(`${path}.${key} is not supported.`);
  }
}

function nonEmptyText(
  value: unknown,
  path: string,
  errors: string[],
  maxLength = MAX_TEXT_LENGTH,
): value is string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    errors.push(`${path} must be a non-empty string up to ${maxLength} characters.`);
    return false;
  }
  return true;
}

function optionalText(
  value: unknown,
  path: string,
  errors: string[],
): value is string | undefined {
  if (value === undefined) return true;
  if (typeof value !== "string" || value.length > MAX_TEXT_LENGTH) {
    errors.push(`${path} must be a string up to ${MAX_TEXT_LENGTH} characters.`);
    return false;
  }
  return true;
}

function timestamp(value: unknown, path: string, errors: string[]): value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    errors.push(`${path} must be a non-negative safe integer.`);
    return false;
  }
  return true;
}

function validId(value: unknown, path: string, errors: string[]): value is string {
  return nonEmptyText(value, path, errors, 256);
}

export function validateLibraryMetadata(value: unknown): MetadataImportResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { status: "invalid", errors: ["library must be an object."] };
  }
  hasOnlyKeys(value, ["schemaVersion", "tracks", "playlists"], "library", errors);
  if (value.schemaVersion !== 1) errors.push("library.schemaVersion must be 1.");
  if (!Array.isArray(value.tracks)) errors.push("library.tracks must be an array.");
  if (!Array.isArray(value.playlists)) errors.push("library.playlists must be an array.");
  const rawTracks = Array.isArray(value.tracks) ? value.tracks : [];
  const rawPlaylists = Array.isArray(value.playlists) ? value.playlists : [];

  if (rawTracks.length > MAX_TRACKS) errors.push(`library.tracks cannot exceed ${MAX_TRACKS} entries.`);
  if (rawPlaylists.length > MAX_PLAYLISTS) {
    errors.push(`library.playlists cannot exceed ${MAX_PLAYLISTS} entries.`);
  }

  const trackIds = new Set<string>();
  const tracks: TrackMetadata[] = [];
  for (let index = 0; index < Math.min(rawTracks.length, MAX_TRACKS); index++) {
    const path = `library.tracks[${index}]`;
    const raw = rawTracks[index];
    if (!isRecord(raw)) {
      errors.push(`${path} must be an object.`);
      continue;
    }
    hasOnlyKeys(
      raw,
      ["id", "title", "artist", "album", "durationMs", "mimeType", "fileName", "fileSizeBytes", "addedAt", "lastPlayedAt"],
      path,
      errors,
    );

    const valid = [
      validId(raw.id, `${path}.id`, errors),
      nonEmptyText(raw.title, `${path}.title`, errors),
      optionalText(raw.artist, `${path}.artist`, errors),
      optionalText(raw.album, `${path}.album`, errors),
      optionalText(raw.mimeType, `${path}.mimeType`, errors),
      nonEmptyText(raw.fileName, `${path}.fileName`, errors),
      timestamp(raw.addedAt, `${path}.addedAt`, errors),
    ];

    if (raw.durationMs !== undefined
      && (typeof raw.durationMs !== "number" || !Number.isSafeInteger(raw.durationMs) || raw.durationMs < 0)) {
      errors.push(`${path}.durationMs must be a non-negative safe integer when present.`);
      valid.push(false);
    }
    if (raw.fileSizeBytes !== undefined
      && (typeof raw.fileSizeBytes !== "number" || !Number.isSafeInteger(raw.fileSizeBytes) || raw.fileSizeBytes < 0)) {
      errors.push(`${path}.fileSizeBytes must be a non-negative safe integer.`);
      valid.push(false);
    } else if (raw.fileSizeBytes === undefined) {
      errors.push(`${path}.fileSizeBytes is required.`);
      valid.push(false);
    }
    if (raw.lastPlayedAt !== undefined) {
      valid.push(timestamp(raw.lastPlayedAt, `${path}.lastPlayedAt`, errors));
    }

    if (valid.includes(false)) continue;
    const id = raw.id as string;
    if (trackIds.has(id)) {
      errors.push(`${path}.id duplicates another track ID.`);
      continue;
    }
    trackIds.add(id);
    tracks.push({
      id,
      title: raw.title as string,
      fileName: raw.fileName as string,
      fileSizeBytes: raw.fileSizeBytes as number,
      addedAt: raw.addedAt as number,
      ...(raw.artist === undefined ? {} : { artist: raw.artist as string }),
      ...(raw.album === undefined ? {} : { album: raw.album as string }),
      ...(raw.durationMs === undefined ? {} : { durationMs: raw.durationMs as number }),
      ...(raw.mimeType === undefined ? {} : { mimeType: raw.mimeType as string }),
      ...(raw.lastPlayedAt === undefined ? {} : { lastPlayedAt: raw.lastPlayedAt as number }),
    });
  }

  const playlistIds = new Set<string>();
  const playlists: Playlist[] = [];
  for (let index = 0; index < Math.min(rawPlaylists.length, MAX_PLAYLISTS); index++) {
    const path = `library.playlists[${index}]`;
    const raw = rawPlaylists[index];
    if (!isRecord(raw)) {
      errors.push(`${path} must be an object.`);
      continue;
    }
    hasOnlyKeys(raw, ["id", "name", "trackIds", "artworkDataUrl", "createdAt", "updatedAt"], path, errors);
    const valid = [
      validId(raw.id, `${path}.id`, errors),
      nonEmptyText(raw.name, `${path}.name`, errors),
      timestamp(raw.createdAt, `${path}.createdAt`, errors),
      timestamp(raw.updatedAt, `${path}.updatedAt`, errors),
    ];
    if (raw.artworkDataUrl !== undefined
      && (typeof raw.artworkDataUrl !== "string"
        || raw.artworkDataUrl.length > MAX_PLAYLIST_ARTWORK_LENGTH
        || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(raw.artworkDataUrl))) {
      errors.push(`${path}.artworkDataUrl must be a supported base64 image up to ${MAX_PLAYLIST_ARTWORK_LENGTH} characters.`);
      valid.push(false);
    }
    if (raw.updatedAt !== undefined && raw.createdAt !== undefined
      && typeof raw.updatedAt === "number" && typeof raw.createdAt === "number"
      && raw.updatedAt < raw.createdAt) {
      errors.push(`${path}.updatedAt cannot be earlier than createdAt.`);
      valid.push(false);
    }
    if (!Array.isArray(raw.trackIds)) {
      errors.push(`${path}.trackIds must be an array.`);
      valid.push(false);
    }
    const rawIds = Array.isArray(raw.trackIds) ? raw.trackIds : [];
    if (rawIds.length > MAX_TRACKS) {
      errors.push(`${path}.trackIds cannot exceed ${MAX_TRACKS} entries.`);
      valid.push(false);
    }
    const memberIds: string[] = [];
    const seenMembers = new Set<string>();
    for (let memberIndex = 0; memberIndex < Math.min(rawIds.length, MAX_TRACKS); memberIndex++) {
      const memberId = rawIds[memberIndex];
      if (!validId(memberId, `${path}.trackIds[${memberIndex}]`, errors)) {
        valid.push(false);
      } else if (seenMembers.has(memberId)) {
        errors.push(`${path}.trackIds contains duplicate ID "${memberId}".`);
        valid.push(false);
      } else {
        seenMembers.add(memberId);
        memberIds.push(memberId);
      }
    }

    if (valid.includes(false)) continue;
    const id = raw.id as string;
    if (playlistIds.has(id)) {
      errors.push(`${path}.id duplicates another playlist ID.`);
      continue;
    }
    playlistIds.add(id);
    playlists.push({
      id,
      name: raw.name as string,
      trackIds: memberIds,
      ...(raw.artworkDataUrl === undefined ? {} : { artworkDataUrl: raw.artworkDataUrl as string }),
      createdAt: raw.createdAt as number,
      updatedAt: raw.updatedAt as number,
    });
  }

  for (const playlist of playlists) {
    for (const trackId of playlist.trackIds) {
      if (!trackIds.has(trackId)) {
        errors.push(`Playlist "${playlist.id}" refers to missing track "${trackId}".`);
      }
    }
  }

  if (errors.length > 0) return { status: "invalid", errors };
  return {
    status: "valid",
    library: { schemaVersion: 1, tracks, playlists },
  };
}

export function parseMetadataBackup(json: string): MetadataImportResult {
  if (new TextEncoder().encode(json).byteLength > METADATA_BACKUP_MAX_BYTES) {
    return {
      status: "invalid",
      errors: [`Backup exceeds the ${METADATA_BACKUP_MAX_BYTES}-byte size limit.`],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    return { status: "invalid", errors: ["Backup is not valid JSON."] };
  }
  if (!isRecord(raw)) return { status: "invalid", errors: ["Backup must be a JSON object."] };

  const errors: string[] = [];
  hasOnlyKeys(raw, ["format", "version", "exportedAt", "library"], "backup", errors);
  if (raw.format !== METADATA_BACKUP_FORMAT) errors.push("Backup format is not recognized.");
  if (raw.version !== METADATA_BACKUP_VERSION) errors.push("Backup version is not supported.");
  if (typeof raw.exportedAt !== "string"
    || !Number.isFinite(Date.parse(raw.exportedAt))
    || new Date(raw.exportedAt).toISOString() !== raw.exportedAt) {
    errors.push("backup.exportedAt must be a valid ISO 8601 timestamp.");
  }

  const libraryResult = validateLibraryMetadata(raw.library);
  if (libraryResult.status === "invalid") errors.push(...libraryResult.errors);
  if (errors.length > 0 || libraryResult.status !== "valid") {
    return { status: "invalid", errors };
  }
  return libraryResult;
}

export function createMetadataBackup(
  library: LibraryMetadata,
  exportedAt: Date = new Date(),
): string {
  if (!Number.isFinite(exportedAt.getTime())) {
    throw new RangeError("Backup exportedAt must be a valid date.");
  }
  const result = validateLibraryMetadata(library);
  if (result.status === "invalid") {
    throw new TypeError(`Cannot export invalid library metadata: ${result.errors.join(" ")}`);
  }

  const backup: MetadataBackup = {
    format: METADATA_BACKUP_FORMAT,
    version: METADATA_BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    library: result.library,
  };
  const json = JSON.stringify(backup);
  if (new TextEncoder().encode(json).byteLength > METADATA_BACKUP_MAX_BYTES) {
    throw new RangeError(`Backup exceeds the ${METADATA_BACKUP_MAX_BYTES}-byte size limit.`);
  }
  return json;
}

export class JsonMetadataBackupService implements MetadataBackupService {
  async exportMetadata(library: LibraryMetadata): Promise<Blob> {
    return new Blob([createMetadataBackup(library)], { type: "application/json" });
  }

  async validateMetadataBackup(backup: Blob): Promise<MetadataImportResult> {
    if (backup.size > METADATA_BACKUP_MAX_BYTES) {
      return {
        status: "invalid",
        errors: [`Backup exceeds the ${METADATA_BACKUP_MAX_BYTES}-byte size limit.`],
      };
    }
    return parseMetadataBackup(await backup.text());
  }
}

export async function restoreMetadataBackup(
  backup: Blob,
  service: MetadataBackupService,
  repository: LibraryRepository,
): Promise<MetadataImportResult> {
  const result = await service.validateMetadataBackup(backup);
  if (result.status === "invalid") return result;
  await repository.saveLibrary(result.library);
  return result;
}
