# 03 — Technical Architecture (Proposed; Must Be Validated)

## Recommended starting point
- React
- TypeScript
- Vite
- PWA support through a maintained, reviewed plugin only if needed
- pnpm workspaces for a monorepo, if the repository and tooling support it
- Capacitor for Android packaging and native bridge integration
- Android Studio/Android SDK for APK builds
- Git for source control and tags

This is a proposal, not permission to install dependencies. The agent must inspect the repository and present dependency choices before installation.

## Architecture principle
Share domain logic and as much UI as practical, but define explicit platform adapters for file access, persistence, and playback.

## Proposed monorepo layout
```text
music-player/
├── apps/
│   ├── web/                    # iOS PWA and web test harness
│   └── android/                # Capacitor Android shell/project
├── packages/
│   ├── shared-types/           # Track, Playlist, Queue, Settings types
│   ├── music-core/             # Search, sort, queue, playlist/domain logic
│   ├── player-ui/              # Shared React components (UI/UX spec pending)
│   └── platform-contracts/     # Interfaces for files, storage, playback
├── docs/                       # Project documentation and decision records
├── scripts/                    # Approved validation/test scripts
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── README.md
```
Adjust the structure only after repository inspection and approval. Avoid creating empty abstractions with no current use.

## Platform adapters
Define interfaces before implementing platform-specific behavior. Example conceptual interfaces:
- `AudioFileSource`: select/import references, list selected items where supported, reopen/validate access, read metadata or stream bytes as needed.
- `LibraryRepository`: persist/retrieve library metadata and playlists.
- `AudioPlaybackEngine`: play/pause/seek/queue and playback state.
- `BackupService`: export/import validated metadata.
- `PlatformCapabilities`: report supported capabilities and known restrictions.

Use typed capability results rather than assuming a feature exists on every platform.

## iOS PWA adapter
- Use standard file input for one/multiple file selection where supported.
- Investigate Safari-specific folder selection and file handle APIs with a real device test; do not infer support from desktop Chrome.
- The owner approved copying selected iOS PWA audio into origin-private IndexedDB so files can be reopened after app relaunch. Keep audio separate from metadata/backups, disclose device-storage use, and handle quota errors. Blob URLs remain temporary and must not be treated as durable file references.
- Browser storage remains best-effort: request persistent storage following a user action when supported, but do not promise it prevents iOS eviction or user deletion. Keep originals as the recoverable copy.
- Do not use OPFS as if it were the shared Files folder. OPFS is origin-private storage.
- Request `navigator.storage.persist()` only when available; check and report the returned result.
- Keep metadata small; avoid loading the entire 3 GB collection into memory or browser storage.
- A Service Worker can cache app assets for offline launch but must not cache all music by default.

## Android adapter
- Package the shared web app with Capacitor.
- Evaluate Android's Storage Access Framework / document picker for user-selected files or directory access.
- Verify permission/reference persistence after process restart and device reboot on actual Android devices.
- Evaluate a native playback implementation or maintained plugin for background playback and lock-screen controls. Do not assume an HTML audio element inside a WebView meets all native playback requirements.
- Ensure long-running playback follows Android foreground-service/media-session requirements applicable to the target SDK.
- Do not request broad storage permissions unless necessary and justified.

## Persistence
- Keep three concerns distinct:
  1. Original audio files controlled by the user in Files or local device storage.
  2. iOS PWA app-owned audio copies in origin-private storage, separate from metadata; treat them as a convenience, not an archive.
  3. Small library metadata, playlists, and settings.
  4. Application shell assets for offline launch.
- A metadata database is not a backup of audio files.
- Store stable IDs and available file identifiers; avoid relying solely on paths that may change.
- Support metadata export/import and validate before applying.
- Never claim metadata persistence or browser storage persistence is absolute.

## Architecture gate
Before full app development, present evidence from the iOS and Android feasibility tests. If the iOS PWA cannot reliably reopen the selected local music after app restart, explain options and ask the owner to choose before implementing the full library.
