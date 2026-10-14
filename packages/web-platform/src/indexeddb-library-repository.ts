import type { LibraryMetadata, PlayerSettings } from "../../shared-types/src/index.ts";
import type {
  LibraryRepository,
} from "../../platform-contracts/src/index.ts";
import { validateLibraryMetadata } from "../../music-core/src/metadata-backup.ts";
import {
  DEFAULT_PLAYER_SETTINGS,
  validatePlayerSettings,
} from "../../music-core/src/settings.ts";

const DATABASE_VERSION = 2;
const LIBRARY_STORE = "library";
const SETTINGS_STORE = "settings";
const LIBRARY_KEY = "metadata";
const SETTINGS_KEY = "player";

export class IndexedDbLibraryRepository implements LibraryRepository {
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
