# Web metadata persistence

`BrowserAudioFileSource` implements the standard multi-select `input[type=file]` adapter. In the iOS/web PWA and Android packaged WebView, it copies selected audio into the `audio-files` IndexedDB object store, keyed by stable track ID, and restores the files when the library opens in a new app session. Android copies stay in the app's private WebView storage and are removed if app data is cleared or the app is uninstalled. It does not claim iOS directory support. Multiple-selection support remains reported as unverified in code because actual Safari device results need to be recorded.

`IndexedDbLibraryRepository` stores the validated `LibraryMetadata` snapshot in the `library` object store, validated player sort/repeat/shuffle preferences in a separate `settings` object store, and app-owned audio copies separately in `audio-files`. Audio bytes are never included in library metadata or metadata backups. Audio imports are written in one IndexedDB transaction, and restart restoration reads files in a single read transaction. A missing library opens as empty and missing settings use the validated app defaults. Invalid data is rejected before a write. Database open, read, blocked-upgrade, and transaction errors reject instead of returning a success-shaped empty library.

`getBrowserStoragePersistenceStatus()` reports whether `navigator.storage.persisted()` says persistent storage has actually been granted, denied, is unsupported, or cannot be checked. `requestBrowserStoragePersistence()` calls the browser API when available and returns the actual result. A granted result is best-effort eviction protection, not a backup or a guarantee against user deletion.

Use `JsonMetadataBackupService` to create or validate version 1 `application/json` library metadata and playlist backup files. Player preferences stay separate and are not part of the portable library backup. Import is two-step: validate the selected file, then use `restoreMetadataBackup()`, which calls the repository only after validation succeeds. The IndexedDB transaction atomically replaces the existing library snapshot. Invalid or unsupported backups never trigger a write.

The strict backup validator enforces:

- A 10 MiB UTF-8 input limit, schema/backup version, and supported-field allowlists.
- Safe track/playlist counts, non-empty stable IDs and required names, non-negative safe-integer sizes/timestamps, and unique IDs.
- Unique playlist membership and references to tracks present in the same backup.
- No unknown metadata fields; file handles, URI grants, blob URLs, and audio bytes cannot be smuggled into the portable schema.

Audio storage is origin-private: selected audio is copied onto the device to make playback survive app restarts. This uses device storage, does not upload audio, and is not included in metadata backups. The app requests persistent browser storage from an explicit add-music action when available, but Safari/iOS may not support or grant that request, can evict site data, and may clear it when the user removes website data. Keep the original audio files; browser storage is not a guaranteed long-term archive.

## Host integration

Construct one repository for the app origin and await `loadLibrary()` (including audio-reference restoration) before rendering the saved library. Route metadata import through `restoreMetadataBackup()`. Expose actual `navigator.storage.persisted()` results in diagnostics and request persistence only in response to a user action. Browser tests with the system document picker and persistent-storage grant still need to be recorded per target iOS version.
