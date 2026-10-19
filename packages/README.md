# Shared packages

These small platform-neutral TypeScript packages contain the model and domain logic shared by the iPhone PWA and the Android app. Platform adapters will implement the contracts; UI, storage, and device access do not belong in the domain core.

## Package boundaries

- `shared-types/` — track/playlist/queue models, sort modes, and the audio-free metadata snapshot.
- `music-core/` — validated track and playlist constructors, accent-insensitive search, locale-consistent sorting, immutable playlist/queue actions, playback orchestration, and the persistent library controller.
- `platform-contracts/` — typed file-selection/access, metadata repository, playback, metadata-backup, and platform-capability interfaces.
- `web-platform/` — transactional IndexedDB library/settings/audio persistence for the iOS PWA and packaged Android WebView, browser storage capability checks, and HTML audio playback.
- Player sort, repeat, and shuffle preferences have their own validated `PlayerSettings` model and remain separate from portable library backups.

Opaque native/file handles belong only to a platform adapter. A `LibraryMetadata` snapshot contains metadata and stable track IDs, never audio bytes, file handles, or platform URI permission tokens.

## Checks

Run domain tests with `npm test`. This uses Node.js's built-in test runner and type stripping; there is no test framework or runtime package dependency.

Run the strict production-source check with `npm run typecheck`. It uses the pinned TypeScript 5.9.3 command-line compiler from the official npm registry and the repository `tsconfig.json`; it does not add a production/runtime dependency. The configuration enables strict, exact-optional, unused-code, and unchecked-index checking. Node test files are executed directly by Node's built-in TypeScript stripping and test runner.

## Behavioral notes

- Search matches every query term against title, artist, album, or file name and normalizes case and accent marks.
- Track sorting uses the English numeric-aware collator so `Track 2` sorts before `Track 10` on both platforms.
- Playlist operations are immutable, retain stable track IDs, and prevent duplicate members.
- Queue operations are immutable. Toggling shuffle on shuffles only the upcoming tracks; turning it off leaves the already shuffled order intact rather than changing tracks under the listener.
- `advanceQueue(queue, "track-ended")` repeats the current item in repeat-track mode. Explicit next-track skips continue to honor the user's next action.
- Platform selection results report cancel, failure, and selected-file outcomes distinctly; adapters must not promise persistence that their platform does not provide.
- Web IndexedDB stores validated library/settings and app-owned audio blobs in separate object stores; JSON metadata backups never include audio. Android keeps audio copies in app-private WebView storage so they survive app restarts; clearing app data or uninstalling removes them.
- `PlaybackController` composes the shared queue rules with an `AudioPlaybackEngine`; the browser adapter streams one restored or selected `File` through a revocable object URL. iOS PWA audio copies are private to the app origin, not uploaded, and subject to iOS storage eviction. Android's feasibility harness uses a native foreground service, notification/media-session controls, and a local queue. Target-device playback, lock-screen, and codec acceptance is still required.
- `LibraryController` composes the metadata repository with file access: it adds selected files, restores persistent PWA and Android copies after restart, searches/sorts tracks, manages playlist CRUD and ordering, reports missing references, and relinks only unique filename/size matches. Ambiguous relinks are returned for an explicit user choice; file references stay separate from portable metadata.
