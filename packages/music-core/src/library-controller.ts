import type {
  AudioFileReference,
  AudioFileSource,
  FileReferenceStatus,
  SelectedAudioFile,
} from "../../platform-contracts/src/index.ts";
import type {
  LibraryMetadata,
  Playlist,
  PlaylistId,
  SortField,
  SortDirection,
  TrackId,
  TrackMetadata,
} from "../../shared-types/src/index.ts";
import {
  addTracksToPlaylist,
  createPlaylist,
  createPlaylistId,
  deletePlaylist,
  movePlaylistTrack,
  removeTrackFromPlaylist,
  renamePlaylist,
} from "./playlists.ts";
import { validateLibraryMetadata } from "./metadata-backup.ts";
import { searchTracks, sortTracks } from "./tracks.ts";

export interface TrackRelinkResult {
  readonly linkedTrackIds: readonly TrackId[];
  readonly ambiguous: readonly {
    readonly fileName: string;
    readonly fileSizeBytes: number;
    readonly fileReferenceToken: string;
    readonly candidateTrackIds: readonly TrackId[];
  }[];
  readonly unlinkedFiles: readonly {
    readonly fileName: string;
    readonly fileSizeBytes: number;
    readonly fileReferenceToken: string;
  }[];
}

export interface TrackIntegrity {
  readonly trackId: TrackId;
  readonly status: FileReferenceStatus;
}

export interface LibraryControllerOptions {
  readonly now?: () => number;
  readonly createId?: () => string;
}

export class LibraryController {
  private readonly repository: {
    loadLibrary(): Promise<LibraryMetadata>;
    saveLibrary(library: LibraryMetadata): Promise<void>;
  };
  private readonly fileSource: AudioFileSource;
  private readonly now: () => number;
  private readonly createId: () => string;
  private readonly references = new Map<TrackId, AudioFileReference>();
  private mutationChain: Promise<void> = Promise.resolve();
  private library: LibraryMetadata | undefined;

  constructor(
    repository: {
      loadLibrary(): Promise<LibraryMetadata>;
      saveLibrary(library: LibraryMetadata): Promise<void>;
    },
    fileSource: AudioFileSource,
    options: LibraryControllerOptions = {},
  ) {
    this.repository = repository;
    this.fileSource = fileSource;
    this.now = options.now ?? Date.now;
    this.createId = options.createId ?? createPlaylistId;
  }

  async load(): Promise<LibraryMetadata> {
    await this.mutationChain;
    const loaded = await this.repository.loadLibrary();
    const validation = validateLibraryMetadata(loaded);
    if (validation.status === "invalid") {
      throw new Error(`Stored library metadata is invalid: ${validation.errors.join(" ")}`);
    }
    for (const reference of this.references.values()) this.fileSource.releaseReference?.(reference);
    this.references.clear();
    this.library = validation.library;
    return this.library;
  }

  getLibrary(): LibraryMetadata {
    return this.requireLibrary();
  }

  getFile(trackId: TrackId): SelectedAudioFile | undefined {
    const reference = this.references.get(trackId);
    const track = this.requireLibrary().tracks.find((item) => item.id === trackId);
    return reference === undefined || track === undefined ? undefined : { track, reference };
  }

  async selectAndAddFiles(): Promise<Awaited<ReturnType<AudioFileSource["selectAudioFiles"]>>> {
    const result = await this.fileSource.selectAudioFiles();
    if (result.status === "selected") await this.addSelectedFiles(result.files);
    return result;
  }

  async addSelectedFiles(files: readonly SelectedAudioFile[]): Promise<void> {
    const tracksById = new Map(this.requireLibrary().tracks.map((track) => [track.id, track]));
    for (const file of files) {
      if (tracksById.has(file.track.id)) {
        throw new Error(`Track ${file.track.id} is already in the library.`);
      }
      tracksById.set(file.track.id, file.track);
    }
    await this.mutate((library) => ({
      ...library,
      tracks: [...library.tracks, ...files.map((file) => file.track)],
    }));
    for (const file of files) this.references.set(file.track.id, file.reference);
  }

  async relinkFiles(files: readonly SelectedAudioFile[]): Promise<TrackRelinkResult> {
    const tracks = this.requireLibrary().tracks;
    const linkedTrackIds: TrackId[] = [];
    const ambiguous: {
      fileName: string;
      fileSizeBytes: number;
      fileReferenceToken: string;
      candidateTrackIds: TrackId[];
    }[] = [];
    const unlinkedFiles: { fileName: string; fileSizeBytes: number; fileReferenceToken: string }[] = [];
    const claimed = new Set<TrackId>();

    for (const file of files) {
      const candidates = tracks.filter((track) =>
        track.fileName === file.track.fileName
        && track.fileSizeBytes === file.track.fileSizeBytes
        && !claimed.has(track.id));
      if (candidates.length === 1) {
        const match = candidates[0];
        if (match === undefined) throw new Error("The matched track disappeared during relinking.");
        this.references.set(match.id, file.reference);
        claimed.add(match.id);
        linkedTrackIds.push(match.id);
      } else if (candidates.length > 1) {
        ambiguous.push({
          fileName: file.track.fileName,
          fileSizeBytes: file.track.fileSizeBytes,
          fileReferenceToken: file.reference.token,
          candidateTrackIds: candidates.map((track) => track.id),
        });
      } else {
        unlinkedFiles.push({
          fileName: file.track.fileName,
          fileSizeBytes: file.track.fileSizeBytes,
          fileReferenceToken: file.reference.token,
        });
      }
    }

    return { linkedTrackIds, ambiguous, unlinkedFiles };
  }

  linkTrackToFile(trackId: TrackId, file: SelectedAudioFile): void {
    const track = this.requireLibrary().tracks.find((item) => item.id === trackId);
    if (track === undefined) {
      throw new Error(`Track ${trackId} is not in the library.`);
    }
    if (track.fileName !== file.track.fileName || track.fileSizeBytes !== file.track.fileSizeBytes) {
      throw new Error("The selected file does not match this track's filename and size.");
    }
    this.references.set(trackId, file.reference);
  }

  async checkIntegrity(): Promise<readonly TrackIntegrity[]> {
    const tracks = this.requireLibrary().tracks;
    return Promise.all(tracks.map(async (track) => {
      const reference = this.references.get(track.id);
      return {
        trackId: track.id,
        status: reference === undefined ? "missing" : await this.fileSource.checkReference(reference),
      };
    }));
  }

  search(query: string): readonly TrackMetadata[] {
    return searchTracks(this.requireLibrary().tracks, query);
  }

  getSortedTracks(sort: { readonly field: SortField; readonly direction: SortDirection }): readonly TrackMetadata[] {
    return sortTracks(this.requireLibrary().tracks, sort);
  }

  getPlaylistTracks(playlistId: PlaylistId): readonly TrackMetadata[] {
    const library = this.requireLibrary();
    const playlist = this.requirePlaylist(playlistId);
    const byId = new Map(library.tracks.map((track) => [track.id, track]));
    return playlist.trackIds.flatMap((trackId) => {
      const track = byId.get(trackId);
      return track === undefined ? [] : [track];
    });
  }

  async createNewPlaylist(name: string): Promise<Playlist> {
    const timestamp = this.now();
    const playlist = createPlaylist({ id: this.createId(), name, createdAt: timestamp });
    await this.mutate((library) => ({ ...library, playlists: [...library.playlists, playlist] }));
    return playlist;
  }

  async renameExistingPlaylist(playlistId: PlaylistId, name: string): Promise<void> {
    this.requirePlaylist(playlistId);
    await this.mutate((library) => ({
      ...library,
      playlists: library.playlists.map((playlist) => playlist.id === playlistId
        ? renamePlaylist(playlist, name, this.nextTimestamp(playlist.updatedAt))
        : playlist),
    }));
  }

  async deleteExistingPlaylist(playlistId: PlaylistId): Promise<void> {
    this.requirePlaylist(playlistId);
    await this.mutate((library) => ({
      ...library,
      playlists: deletePlaylist(library.playlists, playlistId),
    }));
  }

  async addTracksToExistingPlaylist(playlistId: PlaylistId, trackIds: readonly TrackId[]): Promise<void> {
    const library = this.requireLibrary();
    const knownTrackIds = new Set(library.tracks.map((track) => track.id));
    const missing = trackIds.find((trackId) => !knownTrackIds.has(trackId));
    if (missing !== undefined) throw new Error(`Track ${missing} is not in the library.`);
    const playlist = this.requirePlaylist(playlistId);
    await this.mutate((current) => ({
      ...current,
      playlists: current.playlists.map((item) => item.id === playlistId
        ? addTracksToPlaylist(item, trackIds, this.nextTimestamp(playlist.updatedAt))
        : item),
    }));
  }

  async removeTrackFromExistingPlaylist(playlistId: PlaylistId, trackId: TrackId): Promise<void> {
    const playlist = this.requirePlaylist(playlistId);
    await this.mutate((library) => ({
      ...library,
      playlists: library.playlists.map((item) => item.id === playlistId
        ? removeTrackFromPlaylist(item, trackId, this.nextTimestamp(playlist.updatedAt))
        : item),
    }));
  }

  async reorderPlaylistTrack(playlistId: PlaylistId, fromIndex: number, toIndex: number): Promise<void> {
    const playlist = this.requirePlaylist(playlistId);
    await this.mutate((library) => ({
      ...library,
      playlists: library.playlists.map((item) => item.id === playlistId
        ? movePlaylistTrack(item, fromIndex, toIndex, this.nextTimestamp(playlist.updatedAt))
        : item),
    }));
  }

  async removeTrack(trackId: TrackId): Promise<void> {
    const library = this.requireLibrary();
    if (!library.tracks.some((track) => track.id === trackId)) {
      throw new Error(`Track ${trackId} is not in the library.`);
    }
    await this.mutate((current) => ({
      ...current,
      tracks: current.tracks.filter((track) => track.id !== trackId),
      playlists: current.playlists.map((playlist) =>
        playlist.trackIds.includes(trackId)
          ? removeTrackFromPlaylist(playlist, trackId, this.nextTimestamp(playlist.updatedAt))
          : playlist),
    }));
    const reference = this.references.get(trackId);
    this.references.delete(trackId);
    if (reference !== undefined) this.fileSource.releaseReference?.(reference);
  }

  private requireLibrary(): LibraryMetadata {
    if (this.library === undefined) throw new Error("Load the library before using the library controller.");
    return this.library;
  }

  private requirePlaylist(playlistId: PlaylistId): Playlist {
    const playlist = this.requireLibrary().playlists.find((item) => item.id === playlistId);
    if (playlist === undefined) throw new Error(`Playlist ${playlistId} does not exist.`);
    return playlist;
  }

  private nextTimestamp(previous: number): number {
    return Math.max(this.now(), previous);
  }

  private mutate(update: (library: LibraryMetadata) => LibraryMetadata): Promise<LibraryMetadata> {
    const operation = this.mutationChain.then(async () => {
      const candidate = update(this.requireLibrary());
      const validation = validateLibraryMetadata(candidate);
      if (validation.status === "invalid") {
        throw new TypeError(`Cannot save invalid library metadata: ${validation.errors.join(" ")}`);
      }
      await this.repository.saveLibrary(validation.library);
      this.library = validation.library;
      return this.library;
    });
    this.mutationChain = operation.then(() => undefined, () => undefined);
    return operation;
  }
}
