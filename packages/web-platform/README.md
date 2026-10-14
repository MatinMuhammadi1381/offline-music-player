# Web metadata persistence

`BrowserAudioFileSource` implements the standard multi-select `input[type=file]` adapter. `File` objects stay only in the current JavaScript session; new page instances report previous handles as lost and offer a reselect path. The adapter does not claim iOS directory support or persist selected files. Multiple-selection support remains reported as unverified in code because actual Safari device results need to be recorded.

`IndexedDbLibraryRepository` stores only the validated `LibraryMetadata` snapshot in the `library` object store and validated player sort/repeat/shuffle preferences in a separate `settings` object store. Each snapshot is written in one IndexedDB read/write transaction. A missing library opens as empty and missing settings use the validated app defaults. Invalid data is rejected before a write. Database open, read, blocked-upgrade, and transaction errors reject instead of returning a success-shaped empty library.

`getBrowserStoragePersistenceStatus()` reports whether `navigator.storage.persisted()` says persistent storage has actually been granted, denied, is unsupported, or cannot be checked. `requestBrowserStoragePersistence()` calls the browser API when available and returns the actual result. A granted result is best-effort eviction protection, not a backup or a guarantee against user deletion.

Use `JsonMetadataBackupService` to create or validate version 1 `application/json` library metadata and playlist backup files. Player preferences stay separate and are not part of the portable library backup. Import is two-step: validate the selected file, then use `restoreMetadataBackup()`, which calls the repository only after validation succeeds. The IndexedDB transaction atomically replaces the existing library snapshot. Invalid or unsupported backups never trigger a write.

The strict backup validator enforces:

- A 10 MiB UTF-8 input limit, schema/backup version, and supported-field allowlists.
- Safe track/playlist counts, non-empty stable IDs and required names, non-negative safe-integer sizes/timestamps, and unique IDs.
- Unique playlist membership and references to tracks present in the same backup.
- No unknown metadata fields; file handles, URI grants, blob URLs, and audio bytes cannot be smuggled into the portable schema.

There is intentionally no audio-file or permission-handle storage in this adapter. iOS's file input may provide session-only `File` objects; IndexedDB metadata persistence does not make those audio references durable.

## Host integration

This repository does not yet contain the production web app. When the shared app is implemented, construct one repository for the app origin, await `loadLibrary()` before rendering saved library state, and route metadata import through `restoreMetadataBackup()`. Expose actual `navigator.storage.persisted()` results in diagnostics and only request persistence following a user action. Browser tests with the system document picker and persistent-storage grant still need to be recorded per target iOS version.
