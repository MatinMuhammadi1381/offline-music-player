import assert from "node:assert/strict";
import test from "node:test";

import {
  addTracksToPlaylist,
  advanceQueue,
  createPlaylist,
  createPlaylistId,
  createQueue,
  createTrack,
  createTrackId,
  createMetadataBackup,
  currentTrackId,
  DEFAULT_PLAYER_SETTINGS,
  deletePlaylist,
  enqueueTracks,
  JsonMetadataBackupService,
  LibraryController,
  movePlaylistTrack,
  moveQueueTrack,
  normalizeSearchText,
  PlaybackController,
  parseMetadataBackup,
  removeQueueTrack,
  removeTrackFromPlaylist,
  restoreMetadataBackup,
  renamePlaylist,
  retreatQueue,
  searchTracks,
  seekQueueTo,
  setQueueShuffle,
  setRepeatMode,
  sortTracks,
  validateLibraryMetadata,
  validatePlayerSettings,
} from "../src/index.ts";
import type { LibraryMetadata, TrackMetadata } from "../../shared-types/src/index.ts";
import type {
  AudioFileSource,
  AudioPlaybackEngine,
  FileReferenceStatus,
  FileSelectionResult,
  PlatformCapabilities,
  PlaybackSnapshot,
  SelectedAudioFile,
} from "../../platform-contracts/src/index.ts";

function makeTrack(
  id: string,
  values: Partial<Parameters<typeof createTrack>[0]> = {},
): TrackMetadata {
  return createTrack({
    id,
    fileName: `${id}.mp3`,
    fileSizeBytes: 1024,
    addedAt: 100,
    ...values,
  });
}

class FakePlaybackEngine implements AudioPlaybackEngine {
  private snapshot: PlaybackSnapshot = { state: "idle", positionMs: 0 };
  private readonly listeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  readonly playedTrackIds: string[] = [];
  readonly seeks: number[] = [];

  getSnapshot(): PlaybackSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void): { unsubscribe(): void } {
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  async play(file: SelectedAudioFile): Promise<void> {
    this.playedTrackIds.push(file.track.id);
    this.emit({ state: "playing", currentTrackId: file.track.id, positionMs: 0 });
  }

  async pause(): Promise<void> {
    this.emit({ ...this.snapshot, state: "paused" });
  }

  async seek(positionMs: number): Promise<void> {
    this.seeks.push(positionMs);
    this.emit({ ...this.snapshot, positionMs });
  }

  async stop(): Promise<void> {
    this.emit({ state: "idle", positionMs: 0 });
  }

  finish(): void {
    this.emit({ ...this.snapshot, state: "ended" });
  }

  setPosition(positionMs: number): void {
    this.emit({ ...this.snapshot, positionMs });
  }

  private emit(snapshot: PlaybackSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
}

class FakeAudioFileSource implements AudioFileSource {
  readonly selectedFiles: readonly SelectedAudioFile[];
  readonly statuses = new Map<string, FileReferenceStatus>();
  readonly releasedTokens: string[] = [];

  constructor(selectedFiles: readonly SelectedAudioFile[] = []) {
    this.selectedFiles = selectedFiles;
  }

  getCapabilities(): PlatformCapabilities {
    return {
      platform: "ios-pwa",
      multipleFileSelection: { status: "supported" },
      directorySelection: { status: "unsupported" },
      persistentFileReferences: { status: "unsupported" },
      backgroundPlayback: { status: "unknown" },
      lockScreenControls: { status: "unknown" },
    };
  }

  async selectAudioFiles(): Promise<FileSelectionResult> {
    return { status: "selected", files: this.selectedFiles };
  }

  async selectAudioDirectory(): Promise<FileSelectionResult> {
    return { status: "failed", error: { code: "unsupported", message: "Not supported in this test." } };
  }

  async checkReference(reference: SelectedAudioFile["reference"]): Promise<FileReferenceStatus> {
    return this.statuses.get(reference.token) ?? "missing";
  }

  releaseReference(reference: SelectedAudioFile["reference"]): void {
    this.releasedTokens.push(reference.token);
  }
}

function selectedFile(trackId: string): SelectedAudioFile {
  return {
    track: makeTrack(trackId),
    reference: { platform: "ios-pwa", token: `token-${trackId}`, persistence: "session-only" },
  };
}

test("creates a track with a filename-based title and normalized optional metadata", () => {
  const track = createTrack({
    id: "stable-1",
    fileName: "  Café Song.mp3 ",
    fileSizeBytes: 100,
    artist: "  Artist  ",
    album: "  ",
  });
  assert.equal(track.id, "stable-1");
  assert.equal(track.title, "Café Song");
  assert.equal(track.fileName, "Café Song.mp3");
  assert.equal(track.fileSizeBytes, 100);
  assert.equal(track.artist, "Artist");
  assert.equal(track.album, undefined);
  assert.ok(Number.isFinite(track.addedAt));
  assert.match(createTrackId(), /^[0-9a-f-]{36}$/u);
  assert.match(createPlaylistId(), /^[0-9a-f-]{36}$/u);
});

test("rejects empty filenames, negative size, and invalid durations", () => {
  assert.throws(() => createTrack({ id: "x", fileName: " ", fileSizeBytes: 0 }), /fileName/);
  assert.throws(() => createTrack({ id: " ", fileName: "x.mp3", fileSizeBytes: 0 }), /id/);
  assert.throws(() => createTrack({ id: "x", fileName: "x.mp3", fileSizeBytes: -1 }), /fileSizeBytes/);
  assert.throws(() => createTrack({ id: "x", fileName: "x.mp3", fileSizeBytes: 0, durationMs: -1 }), /durationMs/);
});

test("search ignores case and diacritics across title, artist, album, and filename", () => {
  const cafe = makeTrack("a", { title: "Café del Mar", artist: "DJ Blue", album: "Live Set" });
  const other = makeTrack("b", { title: "Night Drive", fileName: "Night.mp3" });
  assert.deepEqual(searchTracks([cafe, other], "cafe DJ"), [cafe]);
  assert.deepEqual(searchTracks([cafe, other], "NIGHT"), [other]);
  assert.deepEqual(searchTracks([cafe, other], "  "), [cafe, other]);
  assert.equal(normalizeSearchText(" CAFÉ "), "cafe");
});

test("sorts tracks by localized numeric title and does not mutate source", () => {
  const tracks = [
    makeTrack("3", { title: "Track 10" }),
    makeTrack("2", { title: "Track 2" }),
    makeTrack("1", { title: "Track 1" }),
  ];
  const result = sortTracks(tracks, { field: "title", direction: "ascending" });
  assert.deepEqual(result.map((track) => track.title), ["Track 1", "Track 2", "Track 10"]);
  assert.deepEqual(tracks.map((track) => track.title), ["Track 10", "Track 2", "Track 1"]);
});

test("sorts missing artist metadata safely and applies descending order", () => {
  const missing = makeTrack("b", { title: "B" });
  const artist = makeTrack("a", { artist: "Ada" });
  assert.deepEqual(
    sortTracks([missing, artist], { field: "artist", direction: "ascending" }).map((track) => track.id),
    ["b", "a"],
  );
  assert.deepEqual(
    sortTracks([missing, artist], { field: "artist", direction: "descending" }).map((track) => track.id),
    ["a", "b"],
  );
});

test("searches and sorts a synthetic 1,000-track library without audio payloads", () => {
  const tracks = Array.from({ length: 1_000 }, (_, index) => makeTrack(`synthetic-${index}`, {
    title: `Synthetic ${String(index).padStart(4, "0")}`,
    artist: index % 10 === 4 ? "Selective Performer" : "Other Performer",
    album: `Album ${Math.floor(index / 20)}`,
    fileSizeBytes: 3_000_000,
    addedAt: index,
  }));
  const startedAt = Date.now();
  const results = sortTracks(searchTracks(tracks, "Selective Performer"), { field: "title", direction: "ascending" });
  const elapsedMs = Date.now() - startedAt;
  const serializedMetadata = JSON.stringify({ schemaVersion: 1, tracks, playlists: [] });

  assert.equal(results.length, 100);
  assert.equal(results[0]?.id, "synthetic-4");
  assert.ok(elapsedMs < 2_000, `1,000-track search and sort took ${elapsedMs} ms.`);
  assert.ok(serializedMetadata.length < 1_000_000);
  assert.doesNotMatch(serializedMetadata, /audioBytes|data:audio|blob:/i);
});

test("creates empty and playable queues", () => {
  const empty = createQueue();
  assert.equal(currentTrackId(empty), undefined);
  const queue = createQueue(["a", "b"]);
  assert.equal(currentTrackId(queue), "a");
  assert.equal(currentTrackId(createQueue(["a", "b"], 1)), "b");
  assert.throws(() => createQueue(["a"], 1), RangeError);
});

test("advances and retreats without changing queue mode or order", () => {
  const queue = createQueue(["a", "b", "c"]);
  const next = advanceQueue(queue);
  assert.deepEqual(queue.trackIds, ["a", "b", "c"]);
  assert.equal(currentTrackId(next), "b");
  assert.equal(currentTrackId(retreatQueue(next)), "a");
  assert.equal(advanceQueue(advanceQueue(advanceQueue(queue))).currentIndex, null);
});

test("respects repeat-track and repeat-queue behavior", () => {
  const initial = createQueue(["a", "b"]);
  const repeatTrack = setRepeatMode(initial, "track");
  assert.equal(currentTrackId(advanceQueue(repeatTrack, "track-ended")), "a");
  assert.equal(currentTrackId(advanceQueue(repeatTrack, "skip")), "b");
  const repeatQueue = setRepeatMode(initial, "queue");
  assert.equal(currentTrackId(advanceQueue(advanceQueue(repeatQueue))), "a");
  assert.equal(currentTrackId(retreatQueue(repeatQueue)), "b");
  assert.equal(currentTrackId(advanceQueue(createQueue())), undefined);
});

test("shuffles upcoming tracks but preserves the current and already-played tracks", () => {
  const queue = seekQueueTo(createQueue(["a", "b", "c", "d", "e"]), 1);
  const shuffled = setQueueShuffle(queue, true, () => 0);
  assert.equal(shuffled.trackIds[0], "a");
  assert.equal(shuffled.trackIds[1], "b");
  assert.equal(shuffled.shuffleEnabled, true);
  assert.deepEqual([...shuffled.trackIds].sort(), ["a", "b", "c", "d", "e"]);
  assert.throws(() => setQueueShuffle(queue, true, () => 1), RangeError);
  assert.equal(setQueueShuffle(shuffled, false).shuffleEnabled, false);
});

test("inserts queue items while preserving the current track", () => {
  const queue = seekQueueTo(createQueue(["a", "b", "c"]), 1);
  const inserted = enqueueTracks(queue, ["x", "y"], 1);
  assert.deepEqual(inserted.trackIds, ["a", "x", "y", "b", "c"]);
  assert.equal(currentTrackId(inserted), "b");
  assert.equal(currentTrackId(enqueueTracks(createQueue(), ["a"])), "a");
  assert.throws(() => enqueueTracks(queue, ["x"], -1), RangeError);
});

test("removes queue items and moves current index correctly", () => {
  const queue = seekQueueTo(createQueue(["a", "b", "c", "d"]), 2);
  const removedBeforeCurrent = removeQueueTrack(queue, 0);
  assert.equal(currentTrackId(removedBeforeCurrent), "c");
  assert.equal(removedBeforeCurrent.currentIndex, 1);
  const removedCurrent = removeQueueTrack(queue, 2);
  assert.equal(currentTrackId(removedCurrent), "d");
  const movedCurrent = moveQueueTrack(queue, 2, 0);
  assert.equal(currentTrackId(movedCurrent), "c");
  assert.deepEqual(movedCurrent.trackIds, ["c", "a", "b", "d"]);
  assert.equal(removeQueueTrack(createQueue(["a"]), 0).currentIndex, null);
});

test("creates playlists with stable IDs and unique ordered track references", () => {
  assert.deepEqual(createPlaylist({
    id: "playlist-1",
    name: "  Favorites ",
    trackIds: ["a", "b"],
    createdAt: 5,
  }), {
    id: "playlist-1",
    name: "Favorites",
    trackIds: ["a", "b"],
    createdAt: 5,
    updatedAt: 5,
  });
  assert.throws(() => createPlaylist({ id: "x", name: " ", createdAt: 1 }), /name/);
  assert.throws(() => createPlaylist({ id: " ", name: "Valid", createdAt: 1 }), /id/);
  assert.throws(() => createPlaylist({ id: "x", name: "Valid", trackIds: ["a", "a"], createdAt: 1 }), /duplicate/);
  assert.throws(() => createPlaylist({ id: "x", name: "Valid", trackIds: [" "], createdAt: 1 }), /empty/);
});

test("renames playlists and rejects timestamps that move backward", () => {
  const playlist = createPlaylist({ id: "p", name: "Old", createdAt: 1 });
  assert.equal(renamePlaylist(playlist, " New ", 2).name, "New");
  assert.throws(() => renamePlaylist(playlist, " ", 2), /name/);
  assert.throws(() => renamePlaylist(playlist, "New", 0), /earlier/);
});

test("adds only unique track references to a playlist", () => {
  const playlist = createPlaylist({ id: "p", name: "Daily", trackIds: ["a"], createdAt: 1 });
  const added = addTracksToPlaylist(playlist, ["a", "b", "c", "b"], 2);
  assert.deepEqual(added.trackIds, ["a", "b", "c"]);
  assert.deepEqual(playlist.trackIds, ["a"]);
  assert.throws(() => addTracksToPlaylist(playlist, ["b"], 0), /earlier/);
  assert.throws(() => addTracksToPlaylist(playlist, [""], 2), /empty/);
});

test("removes tracks from playlists and reorders tracks immutably", () => {
  const playlist = createPlaylist({ id: "p", name: "Daily", trackIds: ["a", "b", "c"], createdAt: 1 });
  const removed = removeTrackFromPlaylist(playlist, "b", 2);
  assert.deepEqual(removed.trackIds, ["a", "c"]);
  const moved = movePlaylistTrack(playlist, 2, 0, 2);
  assert.deepEqual(moved.trackIds, ["c", "a", "b"]);
  assert.deepEqual(playlist.trackIds, ["a", "b", "c"]);
  assert.throws(() => movePlaylistTrack(playlist, 3, 0, 2), RangeError);
});

test("deletes a playlist by stable ID without mutating the playlist list", () => {
  const keep = createPlaylist({ id: "keep", name: "Keep", createdAt: 1 });
  const remove = createPlaylist({ id: "remove", name: "Remove", createdAt: 1 });
  assert.deepEqual(deletePlaylist([keep, remove], "remove"), [keep]);
  assert.deepEqual(deletePlaylist([keep, remove], "missing"), [keep, remove]);
});

const backupLibrary: LibraryMetadata = {
  schemaVersion: 1,
  tracks: [makeTrack("track-1", { title: "Local Song", artist: "Artist" })],
  playlists: [createPlaylist({
    id: "playlist-1",
    name: "Favorites",
    trackIds: ["track-1"],
    createdAt: 100,
  })],
};

test("validates a metadata library without retaining extra fields or platform file handles", () => {
  const result = validateLibraryMetadata({
    schemaVersion: 1,
    tracks: [{
      id: "a",
      title: "Song",
      fileName: "song.mp3",
      fileSizeBytes: 10,
      addedAt: 1,
      uri: "content://private/reference",
    }],
    playlists: [],
  });
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") assert.match(result.errors.join(" "), /uri is not supported/);
});

test("rejects duplicate tracks and playlist references to missing tracks", () => {
  const duplicate = {
    schemaVersion: 1,
    tracks: [backupLibrary.tracks[0], backupLibrary.tracks[0]],
    playlists: [],
  };
  assert.equal(validateLibraryMetadata(duplicate).status, "invalid");
  const dangling = {
    schemaVersion: 1,
    tracks: [],
    playlists: [{ id: "p", name: "P", trackIds: ["missing"], createdAt: 1, updatedAt: 1 }],
  };
  const result = validateLibraryMetadata(dangling);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") assert.match(result.errors.join(" "), /missing track/);
});

test("exports and restores metadata-only JSON backup as an atomic validated replacement", async () => {
  const service = new JsonMetadataBackupService();
  const serialized = createMetadataBackup(backupLibrary, new Date("2026-01-02T03:04:05.000Z"));
  const parsed = parseMetadataBackup(serialized);
  assert.deepEqual(parsed, { status: "valid", library: backupLibrary });
  assert.equal(serialized.includes("content://"), false);
  assert.equal(serialized.includes("fileBytes"), false);
  const blob = await service.exportMetadata(backupLibrary);
  assert.equal(blob.type, "application/json");
  const restored: LibraryMetadata[] = [];
  const result = await restoreMetadataBackup(blob, service, {
    async loadLibrary() {
      return { schemaVersion: 1, tracks: [], playlists: [] };
    },
    async saveLibrary(library) {
      restored.push(library);
    },
  });
  assert.deepEqual(result, { status: "valid", library: backupLibrary });
  assert.deepEqual(restored, [backupLibrary]);
});

test("rejects malformed, unsupported-version, and corrupt backup without saving", async () => {
  const service = new JsonMetadataBackupService();
  const restoreAttempts: LibraryMetadata[] = [];
  const repository = {
    async loadLibrary() {
      return backupLibrary;
    },
    async saveLibrary(library: LibraryMetadata) {
      restoreAttempts.push(library);
    },
  };
  for (const backup of [
    new Blob(["{broken"], { type: "application/json" }),
    new Blob([JSON.stringify({ ...JSON.parse(createMetadataBackup(backupLibrary)), version: 2 })]),
    new Blob([JSON.stringify({ ...JSON.parse(createMetadataBackup(backupLibrary)), library: { schemaVersion: 99 } })]),
  ]) {
    assert.equal((await restoreMetadataBackup(backup, service, repository)).status, "invalid");
  }
  assert.deepEqual(restoreAttempts, []);
});

test("rejects duplicate playlist IDs, members, invalid timestamps, and missing required metadata", () => {
  const duplicatePlaylist = {
    ...backupLibrary,
    playlists: [
      backupLibrary.playlists[0],
      { ...backupLibrary.playlists[0], name: "Also Favorites" },
    ],
  };
  assert.equal(validateLibraryMetadata(duplicatePlaylist).status, "invalid");
  assert.equal(validateLibraryMetadata({
    schemaVersion: 1,
    tracks: [],
    playlists: [{ id: "p", name: "P", trackIds: ["a", "a"], createdAt: 1, updatedAt: 2 }],
  }).status, "invalid");
  assert.equal(validateLibraryMetadata({
    schemaVersion: 1,
    tracks: [{ id: "a", title: "A", fileName: "a.mp3", fileSizeBytes: 1, addedAt: -1 }],
    playlists: [],
  }).status, "invalid");
  assert.equal(validateLibraryMetadata({
    schemaVersion: 1,
    tracks: [{
      id: "a", title: "A", fileName: "a.mp3", fileSizeBytes: 1,
      addedAt: 1, lastPlayedAt: Number.NaN,
    }],
    playlists: [],
  }).status, "invalid");
});

test("rejects an oversized metadata backup before importing it", async () => {
  const oversized = new Blob([new Uint8Array(10 * 1024 * 1024 + 1)]);
  const result = await new JsonMetadataBackupService().validateMetadataBackup(oversized);
  assert.equal(result.status, "invalid");
  if (result.status === "invalid") assert.match(result.errors.join(" "), /size limit/);
});

test("validates and normalizes stored player preferences without accepting unknown settings", () => {
  assert.deepEqual(validatePlayerSettings({
    schemaVersion: 1,
    librarySort: { field: "artist", direction: "descending" },
    repeatMode: "queue",
    shuffleEnabled: true,
  }), {
    schemaVersion: 1,
    librarySort: { field: "artist", direction: "descending" },
    repeatMode: "queue",
    shuffleEnabled: true,
  });

  test("playback controller auto-advances, honors repeat modes, and exposes queue changes", async () => {
    const engine = new FakePlaybackEngine();
    const files = new Map(["a", "b"].map((id) => [id, selectedFile(id)]));
    const controller = new PlaybackController(engine, (id) => files.get(id));

    await controller.playQueue(["a", "b"]);
    assert.equal(currentTrackId(controller.getSnapshot().queue), "a");
    engine.finish();
    await Promise.resolve();
    assert.deepEqual(engine.playedTrackIds, ["a", "b"]);
    assert.equal(currentTrackId(controller.getSnapshot().queue), "b");

    controller.setRepeatMode("queue");
    engine.finish();
    await Promise.resolve();
    assert.deepEqual(engine.playedTrackIds, ["a", "b", "a"]);
    controller.dispose();
  });

  test("playback controller repeats the current track on natural end but allows an explicit skip", async () => {
    const engine = new FakePlaybackEngine();
    const files = new Map(["a", "b"].map((id) => [id, selectedFile(id)]));
    const controller = new PlaybackController(engine, (id) => files.get(id));
    await controller.playQueue(["a", "b"]);
    controller.setRepeatMode("track");

    engine.finish();
    await Promise.resolve();
    assert.deepEqual(engine.playedTrackIds, ["a", "a"]);
    assert.equal(currentTrackId(controller.getSnapshot().queue), "a");

    await controller.next();
    assert.equal(currentTrackId(controller.getSnapshot().queue), "b");
    assert.deepEqual(engine.playedTrackIds, ["a", "a", "b"]);
    controller.dispose();
  });

  test("playback controller supports previous-track restart and queue navigation", async () => {
    const engine = new FakePlaybackEngine();
    const files = new Map(["a", "b"].map((id) => [id, selectedFile(id)]));
    const controller = new PlaybackController(engine, (id) => files.get(id));
    await controller.playQueue(["a", "b"], 1);

    engine.setPosition(4_000);
    await controller.previous();
    assert.deepEqual(engine.seeks, [0]);
    assert.equal(currentTrackId(controller.getSnapshot().queue), "b");

    engine.setPosition(500);
    await controller.previous();
    assert.equal(currentTrackId(controller.getSnapshot().queue), "a");
    await controller.next();
    assert.equal(currentTrackId(controller.getSnapshot().queue), "b");
    controller.dispose();
  });

  test("playback controller can enqueue, reorder, and remove upcoming tracks", async () => {
    const engine = new FakePlaybackEngine();
    const files = new Map(["a", "b", "c"].map((id) => [id, selectedFile(id)]));
    const controller = new PlaybackController(engine, (id) => files.get(id));
    controller.enqueue(["a", "b", "c"]);
    await controller.playTrack("a");
    controller.moveQueueItem(2, 1);
    assert.deepEqual(controller.getSnapshot().queue.trackIds, ["a", "c", "b"]);
    await controller.removeQueueItem(2);
    assert.deepEqual(controller.getSnapshot().queue.trackIds, ["a", "c"]);
    assert.equal(currentTrackId(controller.getSnapshot().queue), "a");
    await controller.removeQueueItem(0);
    assert.deepEqual(engine.playedTrackIds, ["a", "c"]);
    controller.dispose();
  });

  test("dismissing playback removes the current track, stops audio, and stays idle until another track starts", async () => {
    const engine = new FakePlaybackEngine();
    const files = new Map(["a", "b", "c"].map((id) => [id, selectedFile(id)]));
    const controller = new PlaybackController(engine, (id) => files.get(id));
    await controller.playQueue(["a", "b", "c"], 1);

    await controller.dismissCurrentTrack();

    assert.deepEqual(controller.getSnapshot().queue.trackIds, ["a", "c"]);
    assert.equal(controller.getSnapshot().queue.currentIndex, null);
    assert.equal(controller.getSnapshot().playback.state, "idle");
    assert.equal(controller.getSnapshot().playback.currentTrackId, undefined);
    assert.deepEqual(engine.playedTrackIds, ["b"]);

    await controller.playTrack("c");
    assert.equal(controller.getSnapshot().playback.currentTrackId, "c");
    assert.equal(controller.getSnapshot().playback.state, "playing");
    assert.deepEqual(engine.playedTrackIds, ["b", "c"]);
    controller.dispose();
  });

  test("playback controller targets duplicate queue entries by index", async () => {
    const engine = new FakePlaybackEngine();
    const files = new Map(["a", "b"].map((id) => [id, selectedFile(id)]));
    const controller = new PlaybackController(engine, (id) => files.get(id));
    await controller.playQueue(["a", "b", "a"]);

    await controller.playQueueItem(2);
    assert.equal(controller.getSnapshot().queue.currentIndex, 2);
    assert.deepEqual(engine.playedTrackIds, ["a", "a"]);

    controller.moveQueueItem(0, 2);
    assert.deepEqual(controller.getSnapshot().queue.trackIds, ["b", "a", "a"]);
    assert.equal(controller.getSnapshot().queue.currentIndex, 1);
    await controller.removeQueueItem(2);
    assert.deepEqual(controller.getSnapshot().queue.trackIds, ["b", "a"]);
    assert.equal(currentTrackId(controller.getSnapshot().queue), "a");
    controller.dispose();
  });

  test("playback controller reports missing files and recovers when the user advances", async () => {
    const engine = new FakePlaybackEngine();
    const files = new Map([["available", selectedFile("available")]]);
    const controller = new PlaybackController(engine, (id) => files.get(id));

    await assert.rejects(controller.playQueue(["missing", "available"]), /unavailable/);
    assert.equal(controller.getSnapshot().playback.failure?.code, "reference-unavailable");
    await controller.next();
    assert.equal(controller.getSnapshot().playback.state, "playing");
    assert.deepEqual(engine.playedTrackIds, ["available"]);
    controller.dispose();
  });

  test("library controller adds files, manages playlists, searches, sorts, and cleans references on removal", async () => {
    let timestamp = 100;
    let playlistId = 0;
    let savedLibrary: LibraryMetadata = { schemaVersion: 1, tracks: [], playlists: [] };
    const repository = {
      async loadLibrary() { return savedLibrary; },
      async saveLibrary(library: LibraryMetadata) { savedLibrary = library; },
    };
    const files = [selectedFile("track-1"), selectedFile("track-2")];
    const source = new FakeAudioFileSource(files);
    const controller = new LibraryController(repository, source, {
      now: () => timestamp++,
      createId: () => `playlist-${++playlistId}`,
    });

    await controller.load();
    const result = await controller.selectAndAddFiles();
    assert.equal(result.status, "selected");
    assert.equal(controller.getLibrary().tracks.length, 2);
    assert.equal(controller.getFile("track-1")?.reference.token, "token-track-1");
    assert.deepEqual(controller.search("track 2").map((track) => track.id), ["track-2"]);
    assert.deepEqual(controller.getSortedTracks({ field: "title", direction: "descending" })
      .map((track) => track.id), ["track-2", "track-1"]);

    const playlist = await controller.createNewPlaylist("Favorites");
    await controller.addTracksToExistingPlaylist(playlist.id, ["track-1", "track-2"]);
    await controller.reorderPlaylistTrack(playlist.id, 1, 0);
    await controller.renameExistingPlaylist(playlist.id, "Daily");
    assert.deepEqual(controller.getPlaylistTracks(playlist.id).map((track) => track.id), ["track-2", "track-1"]);
    await controller.removeTrack("track-1");
    assert.deepEqual(controller.getPlaylistTracks(playlist.id).map((track) => track.id), ["track-2"]);
    assert.equal(controller.getFile("track-1"), undefined);
    assert.deepEqual(source.releasedTokens, ["token-track-1"]);
    await controller.deleteExistingPlaylist(playlist.id);
    assert.equal(savedLibrary.playlists.length, 0);
  });

  test("library controller serializes writes and relinks only an unambiguous filename-and-size match", async () => {
    const initialTrack = makeTrack("original", { fileName: "song.mp3", fileSizeBytes: 123 });
    let savedLibrary: LibraryMetadata = {
      schemaVersion: 1,
      tracks: [initialTrack],
      playlists: [],
    };
    const repository = {
      async loadLibrary() { return savedLibrary; },
      async saveLibrary(library: LibraryMetadata) { await Promise.resolve(); savedLibrary = library; },
    };
    const relinkedFile = selectedFile("new-runtime-id");
    const source = new FakeAudioFileSource([{
      ...relinkedFile,
      track: makeTrack("new-runtime-id", { fileName: "song.mp3", fileSizeBytes: 123 }),
    }]);
    source.statuses.set("token-new-runtime-id", "available");
    const controller = new LibraryController(repository, source);
    await controller.load();
    assert.deepEqual(await controller.checkIntegrity(), [{ trackId: "original", status: "missing" }]);

    const selection = await source.selectAudioFiles();
    assert.equal(selection.status, "selected");
    if (selection.status !== "selected") return;
    const result = await controller.relinkFiles(selection.files);
    assert.deepEqual(result, { linkedTrackIds: ["original"], ambiguous: [], unlinkedFiles: [] });
    assert.equal(controller.getFile("original")?.track.id, "original");
    assert.deepEqual(await controller.checkIntegrity(), [{ trackId: "original", status: "available" }]);
  });

  test("library controller keeps duplicate-name unmatched selections distinct by runtime reference", async () => {
    const original = makeTrack("original", { fileName: "song.mp3", fileSizeBytes: 123 });
    const repository = {
      async loadLibrary() { return { schemaVersion: 1 as const, tracks: [original], playlists: [] }; },
      async saveLibrary() {},
    };
    const files = ["first", "second"].map((id) => ({
      ...selectedFile(id),
      track: makeTrack(id, { fileName: "song.mp3", fileSizeBytes: 123 }),
    }));
    const controller = new LibraryController(repository, new FakeAudioFileSource(files));
    await controller.load();

    assert.deepEqual(await controller.relinkFiles(files), {
      linkedTrackIds: ["original"],
      ambiguous: [],
      unlinkedFiles: [{
        fileName: "song.mp3",
        fileSizeBytes: 123,
        fileReferenceToken: "token-second",
      }],
    });
  });

  test("library controller refuses ambiguous relinks and unknown playlist members", async () => {
    const first = makeTrack("first", { fileName: "duplicate.mp3", fileSizeBytes: 50 });
    const second = makeTrack("second", { fileName: "duplicate.mp3", fileSizeBytes: 50 });
    const repository = {
      async loadLibrary() {
        return { schemaVersion: 1 as const, tracks: [first, second], playlists: [] };
      },
      async saveLibrary() {},
    };
    const source = new FakeAudioFileSource([selectedFile("replacement")]);
    const controller = new LibraryController(repository, source, { createId: () => "playlist-1" });
    await controller.load();
    const selection = await source.selectAudioFiles();
    assert.equal(selection.status, "selected");
    if (selection.status !== "selected") return;
    const result = await controller.relinkFiles([{
      ...selection.files[0]!,
      track: makeTrack("replacement", { fileName: "duplicate.mp3", fileSizeBytes: 50 }),
    }]);
    assert.deepEqual(result, {
      linkedTrackIds: [],
      ambiguous: [{
        fileName: "duplicate.mp3",
        fileSizeBytes: 50,
        fileReferenceToken: "token-replacement",
        candidateTrackIds: ["first", "second"],
      }],
      unlinkedFiles: [],
    });

    const playlist = await controller.createNewPlaylist("Queue");
    await assert.rejects(
      controller.addTracksToExistingPlaylist(playlist.id, ["not-in-library"]),
      /not in the library/,
    );
  });
  assert.deepEqual(validatePlayerSettings(DEFAULT_PLAYER_SETTINGS), DEFAULT_PLAYER_SETTINGS);
  assert.throws(() => validatePlayerSettings({
    schemaVersion: 1,
    librarySort: { field: "random", direction: "ascending" },
    repeatMode: "off",
    shuffleEnabled: false,
  }), /librarySort.field/);
  assert.throws(() => validatePlayerSettings({
    ...DEFAULT_PLAYER_SETTINGS,
    playerUri: "private://file",
  }), /unsupported fields/);
  assert.throws(() => validatePlayerSettings({
    ...DEFAULT_PLAYER_SETTINGS,
    shuffleEnabled: "yes",
  }), /boolean/);
});
