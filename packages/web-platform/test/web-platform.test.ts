import assert from "node:assert/strict";
import test from "node:test";

import { createTrack } from "../../music-core/src/tracks.ts";
import {
  DEFAULT_PLAYER_SETTINGS,
  validatePlayerSettings,
} from "../../music-core/src/settings.ts";
import { LibraryController } from "../../music-core/src/library-controller.ts";
import type { LibraryMetadata, PlayerSettings } from "../../shared-types/src/index.ts";
import type { AudioElementPort, ObjectUrlPort } from "../src/html-audio-playback-engine.ts";
import { BrowserAudioFileSource, createInputFileChooser } from "../src/browser-audio-file-source.ts";
import { extractEmbeddedArtwork } from "../src/embedded-artwork.ts";
import { IndexedDbLibraryRepository } from "../src/index.ts";
import { HtmlAudioPlaybackEngine } from "../src/html-audio-playback-engine.ts";
import {
  getBrowserStoragePersistenceStatus,
  requestBrowserStoragePersistence,
} from "../src/storage-persistence.ts";

type CallbackRequest = {
  result: unknown;
  error: DOMException | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
};

class FakeDatabase {
  private readonly stores = new Map<string, Map<string, unknown>>();
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };
  onversionchange: (() => void) | null = null;

  createObjectStore(name: string): void {
    this.stores.set(name, new Map());
  }

  transaction(storeName: string, _mode?: string): {
    objectStore: (name?: string) => {
      get: (key: string) => CallbackRequest;
      put: (value: unknown, key: string) => void;
      delete: (key: string) => void;
    };
    oncomplete: (() => void) | null;
    onerror: (() => void) | null;
    onabort: (() => void) | null;
    error: DOMException | null;
  } {
    const store = this.stores.get(storeName);
    if (!store) throw new DOMException("Object store does not exist.", "NotFoundError");
    const transaction = {
      oncomplete: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onabort: null as (() => void) | null,
      error: null as DOMException | null,
      objectStore: (name = storeName) => {
        const selectedStore = this.stores.get(name);
        if (!selectedStore) throw new DOMException("Object store does not exist.", "NotFoundError");
        return {
        get: (key: string) => {
          const request: CallbackRequest = { result: undefined, error: null, onsuccess: null, onerror: null };
          queueMicrotask(() => {
            request.result = selectedStore.get(key);
            request.onsuccess?.();
            queueMicrotask(() => transaction.oncomplete?.());
          });
          return request;
        },
        put: (value: unknown, key: string) => {
          selectedStore.set(key, value);
          queueMicrotask(() => transaction.oncomplete?.());
        },
        delete: (key: string) => {
          selectedStore.delete(key);
          queueMicrotask(() => transaction.oncomplete?.());
        },
      };
      },
    };
    return transaction;
  }

  close(): void {}
}

class FakeAudioElement implements AudioElementPort {
  currentTime = 0;
  duration = 4;
  error: MediaError | null = null;
  playError: Error | undefined;
  src = "";
  private readonly listeners = new Map<string, Set<EventListener>>();

  load(): void {}

  async play(): Promise<void> {
    if (this.playError !== undefined) throw this.playError;
    this.dispatch("play");
  }

  pause(): void {
    this.dispatch("pause");
  }

  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    const event = new Event(type);
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class FakeFileInput {
  multiple = false;
  accept = "";
  files: FileList | null = null;
  value = "";
  clickCount = 0;
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }

  click(): void {
    this.clickCount++;
  }

  dispatch(type: string): void {
    const event = new Event(type);
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}

function fakeIndexedDb(): IDBFactory {
  const databases = new Map<string, FakeDatabase>();
  return {
    open(name: string) {
      const request: {
        result: FakeDatabase | undefined;
        error: DOMException | null;
        onupgradeneeded: (() => void) | null;
        onblocked: (() => void) | null;
        onerror: (() => void) | null;
        onsuccess: (() => void) | null;
      } = {
        result: undefined,
        error: null,
        onupgradeneeded: null,
        onblocked: null,
        onerror: null,
        onsuccess: null,
      };
      queueMicrotask(() => {
        let database = databases.get(name);
        if (!database) {
          database = new FakeDatabase();
          databases.set(name, database);
          request.result = database;
          request.onupgradeneeded?.();
        } else {
          request.result = database;
        }

        request.onsuccess?.();
      });
      return request;
    },
  } as unknown as IDBFactory;
}

const library: LibraryMetadata = {
  schemaVersion: 1,
  tracks: [{
    ...createTrack({
      id: "track-1",
      title: "Offline",
      fileName: "offline.mp3",
      fileSizeBytes: 100,
      addedAt: 1,
    }),
  }],
  playlists: [],
};

test("reports browser persistent-storage unsupported, granted and denied states", async () => {
  assert.deepEqual(await getBrowserStoragePersistenceStatus(undefined), {
    status: "unsupported",
    requestAvailable: false,
  });
  assert.deepEqual(await getBrowserStoragePersistenceStatus({
    async persisted() { return true; },
    async persist() { return true; },
  }), { status: "supported", granted: true, requestAvailable: true });
  assert.deepEqual(await getBrowserStoragePersistenceStatus({
    async persisted() { return false; },
    async persist() { return false; },
  }), { status: "not-granted", granted: false, requestAvailable: true });
  assert.equal((await getBrowserStoragePersistenceStatus({
    async persisted() { return false; },
  })).status, "not-granted");
});

test("requests browser persistence and reports denial without treating it as success", async () => {
  let requests = 0;
  assert.deepEqual(await requestBrowserStoragePersistence({
    async persist() {
      requests++;
      return false;
    },
  }), { status: "not-granted", granted: false, requestAvailable: true });
  assert.equal(requests, 1);
  assert.deepEqual(await requestBrowserStoragePersistence(undefined), {
    status: "unsupported",
    requestAvailable: false,
  });
});

test("opens the audio picker synchronously with multiple audio-file selection enabled", async () => {
  const input = new FakeFileInput();
  const chooseFiles = createInputFileChooser(input as unknown as HTMLInputElement);

  assert.equal(input.multiple, true);
  assert.equal(input.accept, "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus");

  const firstFile = new File(["first"], "first.mp3", { type: "audio/mpeg" });
  const secondFile = new File(["second"], "second.m4a", { type: "audio/mp4" });
  const selection = chooseFiles();
  assert.equal(input.clickCount, 1, "input.click() must run before the chooser returns its pending promise");

  input.files = [firstFile, secondFile] as unknown as FileList;
  input.value = "selected-audio";
  input.dispatch("change");
  assert.deepEqual(await selection, [firstFile, secondFile]);
  assert.equal(input.value, "");

  const cancelledSelection = chooseFiles();
  assert.equal(input.clickCount, 2);
  input.value = "previous-selection";
  input.dispatch("cancel");
  assert.equal(await cancelledSelection, null);
  assert.equal(input.value, "");
});

test("reports unavailable browser persistence errors explicitly", async () => {
  const status = await requestBrowserStoragePersistence({
    async persist() {
      throw new Error("storage is blocked");
    },
  });
  assert.deepEqual(status, {
    status: "unknown",
    requestAvailable: true,
    message: "storage is blocked",
  });
});

test("tracks selected File objects only in memory and reports lost session references", async () => {
  const file = new File(["sample audio bytes"], "demo-track.mp3", { type: "audio/mpeg" });
  const source = new BrowserAudioFileSource(async () => [file]);
  const result = await source.selectAudioFiles();
  assert.equal(result.status, "selected");
  if (result.status !== "selected") throw new Error("Expected a successful file selection.");
  const [selected] = result.files;
  assert.ok(selected);
  assert.equal(selected.track.title, "demo-track");
  assert.equal(selected.track.fileSizeBytes, file.size);
  assert.equal(selected.reference.persistence, "session-only");
  assert.equal(await source.checkReference(selected.reference), "available");
  assert.equal(source.getFile(selected.reference), file);

  const newPageSession = new BrowserAudioFileSource(async () => null);
  assert.equal(await newPageSession.checkReference(selected.reference), "permission-lost");
  source.release(selected.reference);
  assert.equal(source.getFile(selected.reference), undefined);
});

test("persists selected audio across source instances and removes stored copies", async () => {
  const repository = new IndexedDbLibraryRepository("persistent-audio-test", fakeIndexedDb());
  const original = new File(["private audio bytes"], "kept-track.mp3", { type: "audio/mpeg", lastModified: 123 });
  const firstSession = new BrowserAudioFileSource(async () => [original], repository);
  const selected = await firstSession.selectAudioFiles();
  assert.equal(selected.status, "selected");
  if (selected.status !== "selected") throw new Error("Expected a successful file selection.");
  assert.equal(selected.files[0]?.reference.persistence, "persistable");
  assert.equal(firstSession.getCapabilities().persistentFileReferences.status, "supported");

  const restartedSession = new BrowserAudioFileSource(async () => null, repository);
  await restartedSession.restoreFiles(selected.files.map(({ track }) => track));
  const restored = restartedSession.getFile(selected.files[0]!.reference);
  assert.ok(restored);
  assert.equal(restored.name, original.name);
  assert.equal(restored.lastModified, original.lastModified);
  assert.equal(await restored.text(), "private audio bytes");
  assert.equal(await restartedSession.checkReference(selected.files[0]!.reference), "available");

  await restartedSession.deleteStoredFile(selected.files[0]!.track.id);
  const afterDeletion = new BrowserAudioFileSource(async () => null, repository);
  await afterDeletion.restoreFiles(selected.files.map(({ track }) => track));
  assert.equal(afterDeletion.getFile(selected.files[0]!.reference), undefined);
  await repository.close();
});

test("restores a playable library after an app restart and deletes audio with a removed track", async () => {
  const factory = fakeIndexedDb();
  const firstRepository = new IndexedDbLibraryRepository("player-restart-test", factory);
  const original = new File(["audio survives restart"], "survivor.mp3", { type: "audio/mpeg" });
  const firstSource = new BrowserAudioFileSource(async () => [original], firstRepository);
  const firstApp = new LibraryController(firstRepository, firstSource);
  await firstApp.load();
  const selected = await firstApp.selectAndAddFiles();
  assert.equal(selected.status, "selected");
  if (selected.status !== "selected") throw new Error("Expected selected audio to be added.");

  const restartedRepository = new IndexedDbLibraryRepository("player-restart-test", factory);
  const restartedSource = new BrowserAudioFileSource(async () => null, restartedRepository);
  const restartedApp = new LibraryController(restartedRepository, restartedSource);
  await restartedApp.load();
  const track = selected.files[0]!.track;
  assert.equal(await restartedSource.checkReference(selected.files[0]!.reference), "available");
  assert.equal(await restartedApp.checkIntegrity().then((items) => items[0]?.status), "available");
  assert.equal(await restartedApp.getFile(track.id)?.reference.token, track.id);
  assert.equal(await restartedApp.getFile(track.id)?.track.fileName, "survivor.mp3");
  assert.equal(await restartedSource.getFile(selected.files[0]!.reference)?.text(), "audio survives restart");
  assert.deepEqual(await restartedRepository.loadAudioFiles([{
    ...track,
    fileName: "different-track.mp3",
  }]), []);
  assert.deepEqual(await restartedRepository.loadAudioFiles([{
    ...track,
    fileSizeBytes: track.fileSizeBytes + 1,
  }]), []);

  await restartedApp.removeTrack(track.id);
  assert.equal(await restartedApp.getFile(track.id), undefined);
  assert.deepEqual(await restartedRepository.loadAudioFiles([track]), []);
  await firstRepository.close();
  await restartedRepository.close();
});

test("moves a reselected audio copy to its existing stable track ID during relinking", async () => {
  const repository = new IndexedDbLibraryRepository("persistent-relink-test", fakeIndexedDb());
  const selectedFile = new File(["relinked bytes"], "relinked.mp3", { type: "audio/mpeg" });
  const source = new BrowserAudioFileSource(async () => [selectedFile], repository);
  const result = await source.selectAudioFiles();
  assert.equal(result.status, "selected");
  if (result.status !== "selected") throw new Error("Expected a successful file selection.");
  const selected = result.files[0]!;
  const reference = await source.linkFile("existing-track", selected);
  const existingTrack = { ...selected.track, id: "existing-track" };
  const persisted = await repository.loadAudioFiles([selected.track, existingTrack]);

  assert.equal(reference.token, "existing-track");
  assert.equal(source.getFile(reference), selectedFile);
  assert.deepEqual(persisted.map((entry) => entry.trackId), ["existing-track"]);
  assert.equal(await persisted[0]!.file.text(), "relinked bytes");
  assert.equal(await source.getFile(selected.reference), undefined);
  await repository.close();
});

test("reports a storage failure instead of adding audio without a durable copy", async () => {
  const file = new File(["audio"], "limited-space.mp3", { type: "audio/mpeg" });
  const source = new BrowserAudioFileSource(async () => [file], {
    async saveAudioFiles() { throw new DOMException("Quota exceeded.", "QuotaExceededError"); },
    async loadAudioFiles() { return []; },
    async deleteAudioFile() {},
  });

  const result = await source.selectAudioFiles();
  assert.deepEqual(result, {
    status: "failed",
    error: {
      code: "unavailable",
      message: "The selected audio could not be saved on this device. Check available storage and try again. Quota exceeded.",
    },
  });
});

test("extracts embedded MP3 front-cover artwork without reading audio payload bytes", async () => {
  const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const picturePayload = new Uint8Array([
    0,
    ...new TextEncoder().encode("image/jpeg"),
    0,
    3,
    0,
    ...imageBytes,
  ]);
  const frame = new Uint8Array(10 + picturePayload.length);
  frame.set(new TextEncoder().encode("APIC"), 0);
  frame.set([
    (picturePayload.length >>> 24) & 0xff,
    (picturePayload.length >>> 16) & 0xff,
    (picturePayload.length >>> 8) & 0xff,
    picturePayload.length & 0xff,
  ], 4);
  frame.set(picturePayload, 10);
  const tag = new Uint8Array(10 + frame.length);
  tag.set([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, frame.length]);
  tag.set(frame, 10);

  const artwork = await extractEmbeddedArtwork(new Blob([tag]));
  assert.ok(artwork);
  assert.equal(artwork.type, "image/jpeg");
  assert.deepEqual(new Uint8Array(await artwork.arrayBuffer()), imageBytes);
});

test("returns no embedded artwork for unsupported or malformed audio tags", async () => {
  assert.equal(await extractEmbeddedArtwork(new Blob(["audio bytes"])), undefined);
  assert.equal(await extractEmbeddedArtwork(new Blob([[0x49, 0x44, 0x33, 2, 0, 0, 0, 0, 0, 0]])), undefined);
});

test("keeps a simulated 3 GB, 1,000-file collection as file handles and small metadata", async () => {
  const files = Array.from({ length: 1_000 }, (_, index) => {
    const file = new File([], `track-${index}.mp3`, { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 3_000_000 });
    Object.defineProperty(file, "arrayBuffer", { value: async () => {
      reads++;
      throw new Error("Audio bytes must not be read into memory.");
    } });
    Object.defineProperty(file, "stream", { value: () => {
      reads++;
      throw new Error("Audio bytes must not be read into memory.");
    } });
    return file;
  });
  let reads = 0;
  const source = new BrowserAudioFileSource(async () => files);
  const selection = await source.selectAudioFiles();
  assert.equal(selection.status, "selected");
  if (selection.status !== "selected") throw new Error("Expected a successful file selection.");

  const librarySnapshot: LibraryMetadata = {
    schemaVersion: 1,
    tracks: selection.files.map(({ track }) => track),
    playlists: [],
  };
  const serialized = JSON.stringify(librarySnapshot);
  const repository = new IndexedDbLibraryRepository("three-gigabyte-test", fakeIndexedDb());
  await repository.saveLibrary(librarySnapshot);
  const restored = await repository.loadLibrary();

  assert.equal(restored.tracks.length, 1_000);
  assert.equal(restored.tracks.reduce((total, track) => total + track.fileSizeBytes, 0), 3_000_000_000);
  assert.equal(source.getFile(selection.files[999]!.reference), files[999]);
  assert.equal(reads, 0);
  assert.ok(serialized.length < 1_000_000);
  assert.doesNotMatch(serialized, /audioBytes|data:audio|blob:/i);
  await repository.close();
});

test("reports browser file-picker cancellation and directory limitations honestly", async () => {
  const cancelled = new BrowserAudioFileSource(async () => null);
  assert.deepEqual(await cancelled.selectAudioFiles(), { status: "cancelled" });
  assert.equal((await cancelled.selectAudioDirectory()).status, "failed");
  const capabilities = cancelled.getCapabilities();
  assert.equal(capabilities.directorySelection.status, "unsupported");
  assert.equal(capabilities.persistentFileReferences.status, "unsupported");
  assert.equal(capabilities.multipleFileSelection.status, "unknown");
});

test("persists only validated metadata using a single IndexedDB transaction", async () => {
  const factory = fakeIndexedDb();
  const repository = new IndexedDbLibraryRepository("library-test", factory);
  await repository.saveLibrary(library);
  assert.deepEqual(await repository.loadLibrary(), library);
  await repository.close();
});

test("stores audio outside portable metadata and loads it after a simulated app restart", async () => {
  const factory = fakeIndexedDb();
  const firstSession = new IndexedDbLibraryRepository("audio-restart-test", factory);
  const audio = new File(["audio bytes"], "offline.mp3", { type: "audio/mpeg" });
  const track = { ...library.tracks[0]!, fileSizeBytes: audio.size };
  await firstSession.saveAudioFiles([{ trackId: "track-1", file: audio }]);

  const restartedSession = new IndexedDbLibraryRepository("audio-restart-test", factory);
  const restored = await restartedSession.loadAudioFiles([track]);
  assert.equal(restored.length, 1);
  assert.equal(restored[0]?.trackId, "track-1");
  assert.equal(await restored[0]?.file.text(), "audio bytes");
  assert.deepEqual(await restartedSession.loadLibrary(), { schemaVersion: 1, tracks: [], playlists: [] });

  await restartedSession.deleteAudioFile("track-1");
  assert.deepEqual(await restartedSession.loadAudioFiles([track]), []);
  await firstSession.close();
  await restartedSession.close();
});

test("persists validated player settings separately from library metadata", async () => {
  const repository = new IndexedDbLibraryRepository("settings-test", fakeIndexedDb());
  assert.deepEqual(await repository.loadSettings(), DEFAULT_PLAYER_SETTINGS);
  const settings: PlayerSettings = {
    schemaVersion: 1,
    librarySort: { field: "artist", direction: "descending" },
    repeatMode: "queue",
    shuffleEnabled: true,
  };
  await repository.saveSettings(settings);
  assert.deepEqual(await repository.loadSettings(), settings);
  await repository.saveLibrary(library);
  assert.deepEqual(await repository.loadSettings(), settings);
});

test("rejects invalid player settings before replacing stored settings", async () => {
  const repository = new IndexedDbLibraryRepository("invalid-settings-test", fakeIndexedDb());
  await repository.saveSettings(DEFAULT_PLAYER_SETTINGS);
  const invalid = {
    ...DEFAULT_PLAYER_SETTINGS,
    repeatMode: "sometimes",
  };
  await assert.rejects(
    repository.saveSettings(invalid as unknown as PlayerSettings),
    /repeatMode/,
  );
  assert.deepEqual(await repository.loadSettings(), DEFAULT_PLAYER_SETTINGS);
});

test("initializes a new IndexedDB library without sample data", async () => {
  const repository = new IndexedDbLibraryRepository("empty-library-test", fakeIndexedDb());
  assert.deepEqual(await repository.loadLibrary(), { schemaVersion: 1, tracks: [], playlists: [] });
});

test("rejects invalid IndexedDB writes before replacing saved data", async () => {
  const repository = new IndexedDbLibraryRepository("invalid-library-test", fakeIndexedDb());
  await repository.saveLibrary(library);
  await assert.rejects(
    repository.saveLibrary({
      schemaVersion: 1,
      tracks: [{
        ...library.tracks[0],
        id: "",
      }],
      playlists: [],
    }),
    /invalid library metadata/,
  );
  assert.deepEqual(await repository.loadLibrary(), library);
});

test("rejects invalid IndexedDB database names", () => {
  assert.throws(
    () => new IndexedDbLibraryRepository("  ", fakeIndexedDb()),
    /databaseName/,
  );
});

test("HTML audio playback adapter streams selected files, reports progress, and releases its object URL", async () => {
  const audioFile = new File(["audio"], "song.mp3", { type: "audio/mpeg" });
  const source = new BrowserAudioFileSource(async () => [audioFile]);
  const selected = await source.selectAudioFiles();
  assert.equal(selected.status, "selected");
  if (selected.status !== "selected") return;

  const audio = new FakeAudioElement();
  const revoked: string[] = [];
  const objectUrls: ObjectUrlPort = {
    createObjectURL: () => "blob:local-audio",
    revokeObjectURL: (url) => revoked.push(url),
  };
  const engine = new HtmlAudioPlaybackEngine(source, audio, objectUrls);
  await engine.play(selected.files[0]!);
  assert.equal(engine.getSnapshot().state, "playing");
  assert.equal(engine.getSnapshot().currentTrackId, selected.files[0]!.track.id);

  audio.currentTime = 2;
  audio.dispatch("timeupdate");
  assert.equal(engine.getSnapshot().positionMs, 2_000);
  assert.equal(engine.getSnapshot().durationMs, 4_000);
  await engine.seek(9_000);
  assert.equal(audio.currentTime, 4);

  await engine.stop();
  assert.equal(engine.getSnapshot().state, "idle");
  assert.deepEqual(revoked, ["blob:local-audio"]);
  engine.dispose();
});

test("HTML audio playback adapter identifies missing session-only file references", async () => {
  const source = new BrowserAudioFileSource(async () => [new File(["audio"], "song.mp3")]);
  const selected = await source.selectAudioFiles();
  assert.equal(selected.status, "selected");
  if (selected.status !== "selected") return;
  source.release(selected.files[0]!.reference);

  const engine = new HtmlAudioPlaybackEngine(source, new FakeAudioElement(), {
    createObjectURL: () => "unused",
    revokeObjectURL: () => {},
  });
  await assert.rejects(engine.play(selected.files[0]!), /no longer available/);
  assert.equal(engine.getSnapshot().failure?.code, "reference-unavailable");
  engine.dispose();
});

test("HTML audio playback adapter reports browser autoplay blocks instead of swallowing them", async () => {
  const source = new BrowserAudioFileSource(async () => [new File(["audio"], "song.mp3")]);
  const selected = await source.selectAudioFiles();
  assert.equal(selected.status, "selected");
  if (selected.status !== "selected") return;

  const audio = new FakeAudioElement();
  const blocked = new Error("Playback requires a user gesture.");
  blocked.name = "NotAllowedError";
  audio.playError = blocked;
  const engine = new HtmlAudioPlaybackEngine(source, audio, {
    createObjectURL: () => "blob:blocked-audio",
    revokeObjectURL: () => {},
  });
  await assert.rejects(engine.play(selected.files[0]!), /user gesture/);
  assert.equal(engine.getSnapshot().state, "error");
  assert.equal(engine.getSnapshot().failure?.code, "playback-blocked");
  engine.dispose();
});
