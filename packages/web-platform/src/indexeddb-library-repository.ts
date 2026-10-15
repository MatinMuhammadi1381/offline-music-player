import type { LibraryMetadata, PlayerSettings, TrackId, TrackMetadata } from "../../shared-types/src/index.ts";
import type {
  AudioFileStore,
  LibraryRepository,
} from "../../platform-contracts/src/index.ts";
import { validateLibraryMetadata } from "../../music-core/src/metadata-backup.ts";
import {
  DEFAULT_PLAYER_SETTINGS,
  validatePlayerSettings,
} from "../../music-core/src/settings.ts";

const DATABASE_VERSION = 3;
const LIBRARY_STORE = "library";
const SETTINGS_STORE = "settings";
const AUDIO_FILES_STORE = "audio-files";
const LIBRARY_KEY = "metadata";
const SETTINGS_KEY = "player";

export class IndexedDbLibraryRepository implements LibraryRepository, AudioFileStore {
  private readonly databasePromise: Promise<IDBDatabase>;

  constructor(
    databaseName = "offline-music-player",
    factory: IDBFactory = globalThis.indexedDB,
  ) {
    if (!factory) throw new Error("IndexedDB is not available in this browser.");
    this.databasePromise = this.openDatabase(factory, databaseName);
  }

  async loadLibrary(): Promise<LibraryMetadata> {
    const database = await this.databasePromise;
    return new Promise<LibraryMetadata>((resolve, reject) => {
      try {
        const transaction = database.transaction(LIBRARY_STORE, "readonly");
        const request = transaction.objectStore(LIBRARY_STORE).get(LIBRARY_KEY);
        request.onerror = () => reject(request.error ?? new Error("Unable to read library metadata from IndexedDB."));
        request.onsuccess = () => {
          if (request.result === undefined) {
            resolve({ schemaVersion: 1, tracks: [], playlists: [] });
            return;
          }
          const result = validateLibraryMetadata(request.result);
          if (result.status === "invalid") {
            reject(new Error(`Stored library metadata is invalid: ${result.errors.join(" ")}`));
            return;
          }
          resolve(result.library);
        };
        transaction.onabort = () => reject(transaction.error ?? new Error("The IndexedDB read transaction was aborted."));
        transaction.onerror = () => reject(transaction.error ?? new Error("The IndexedDB read transaction failed."));
      } catch (error) {
        reject(error);
      }
    });
  }

  async saveLibrary(library: LibraryMetadata): Promise<void> {
    const result = validateLibraryMetadata(library);
    if (result.status === "invalid") {
      throw new TypeError(`Cannot save invalid library metadata: ${result.errors.join(" ")}`);
    }

    const database = await this.databasePromise;
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = database.transaction(LIBRARY_STORE, "readwrite");
        transaction.objectStore(LIBRARY_STORE).put(result.library, LIBRARY_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error("The IndexedDB write transaction was aborted."));
        transaction.onerror = () => reject(transaction.error ?? new Error("The IndexedDB write transaction failed."));
      } catch (error) {
        reject(error);
      }
    });
  }

  async loadSettings(): Promise<PlayerSettings> {
    const database = await this.databasePromise;
    return new Promise<PlayerSettings>((resolve, reject) => {
      try {
        const transaction = database.transaction(SETTINGS_STORE, "readonly");
        const request = transaction.objectStore(SETTINGS_STORE).get(SETTINGS_KEY);
        request.onerror = () => reject(request.error ?? new Error("Unable to read player settings from IndexedDB."));
        request.onsuccess = () => {
          if (request.result === undefined) {
            resolve(DEFAULT_PLAYER_SETTINGS);
            return;
          }
          try {
            resolve(validatePlayerSettings(request.result));
          } catch (error) {
            reject(error);
          }
        };
        transaction.onabort = () => reject(transaction.error ?? new Error("The IndexedDB settings read transaction was aborted."));
        transaction.onerror = () => reject(transaction.error ?? new Error("The IndexedDB settings read transaction failed."));
      } catch (error) {
        reject(error);
      }
    });
  }

  async saveSettings(settings: PlayerSettings): Promise<void> {
    const validated = validatePlayerSettings(settings);
    const database = await this.databasePromise;
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = database.transaction(SETTINGS_STORE, "readwrite");
        transaction.objectStore(SETTINGS_STORE).put(validated, SETTINGS_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error("The IndexedDB settings write transaction was aborted."));
        transaction.onerror = () => reject(transaction.error ?? new Error("The IndexedDB settings write transaction failed."));
      } catch (error) {
        reject(error);
      }
    });
  }

  async saveAudioFiles(files: readonly { readonly trackId: TrackId; readonly file: File }[]): Promise<void> {
    if (files.length === 0) return;
    const database = await this.databasePromise;
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = database.transaction(AUDIO_FILES_STORE, "readwrite");
        const store = transaction.objectStore(AUDIO_FILES_STORE);
        for (const entry of files) store.put(entry.file, entry.trackId);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error("Saving audio files to IndexedDB was aborted."));
        transaction.onerror = () => reject(transaction.error ?? new Error("Saving audio files to IndexedDB failed."));
      } catch (error) {
        reject(error);
      }
    });
  }

  async loadAudioFiles(
    tracks: readonly TrackMetadata[],
  ): Promise<readonly { readonly trackId: TrackId; readonly file: File }[]> {
    if (tracks.length === 0) return [];
    const database = await this.databasePromise;
    return new Promise<readonly { readonly trackId: TrackId; readonly file: File }[]>((resolve, reject) => {
      try {
        const transaction = database.transaction(AUDIO_FILES_STORE, "readonly");
        const store = transaction.objectStore(AUDIO_FILES_STORE);
        const restored: { trackId: TrackId; file: File }[] = [];
        for (const track of tracks) {
          const request = store.get(track.id);
          request.onerror = () => reject(request.error ?? new Error(`Unable to read stored audio for track ${track.id}.`));
          request.onsuccess = () => {
            if (request.result instanceof File
              && request.result.name === track.fileName
              && request.result.size === track.fileSizeBytes) {
              restored.push({
                trackId: track.id,
                file: new File([request.result], track.fileName, {
                  ...(track.mimeType ? { type: track.mimeType } : {}),
                  lastModified: request.result.lastModified,
                }),
              });
            }
          };
        }
        transaction.oncomplete = () => resolve(restored);
        transaction.onabort = () => reject(transaction.error ?? new Error("Reading stored audio from IndexedDB was aborted."));
        transaction.onerror = () => reject(transaction.error ?? new Error("Reading stored audio from IndexedDB failed."));
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteAudioFile(trackId: string): Promise<void> {
    const database = await this.databasePromise;
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = database.transaction(AUDIO_FILES_STORE, "readwrite");
        transaction.objectStore(AUDIO_FILES_STORE).delete(trackId);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error(`Deleting stored audio for track ${trackId} was aborted.`));
        transaction.onerror = () => reject(transaction.error ?? new Error(`Deleting stored audio for track ${trackId} failed.`));
      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    (await this.databasePromise).close();
  }

  private openDatabase(factory: IDBFactory, databaseName: string): Promise<IDBDatabase> {
    if (!databaseName.trim()) throw new TypeError("IndexedDB databaseName must not be empty.");
    return new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(databaseName, DATABASE_VERSION);
      } catch (error) {
        reject(error);
        return;
      }

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(LIBRARY_STORE)) database.createObjectStore(LIBRARY_STORE);
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) database.createObjectStore(SETTINGS_STORE);
        if (!database.objectStoreNames.contains(AUDIO_FILES_STORE)) database.createObjectStore(AUDIO_FILES_STORE);
      };
      request.onblocked = () => reject(new Error("Opening the library database was blocked by another open app version."));
      request.onerror = () => reject(request.error ?? new Error("Unable to open the IndexedDB library database."));
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
  }
}
